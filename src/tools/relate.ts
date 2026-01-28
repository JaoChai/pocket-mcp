import { z } from 'zod';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';

// Schema definitions
export const LinkEntitiesSchema = z.object({
  source_type: z.enum(['project', 'observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'])
    .describe('Type of the source entity'),
  source_id: z.string().min(1).describe('ID of the source entity'),
  relation: z.enum(['uses', 'caused', 'fixed_by', 'led_to', 'related_to', 'depends_on', 'inspired_by'])
    .describe('Type of relationship'),
  target_type: z.enum(['project', 'observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'])
    .describe('Type of the target entity'),
  target_id: z.string().min(1).describe('ID of the target entity'),
  context: z.string().optional().describe('Context explaining the relationship'),
});

export const GetRelationsSchema = z.object({
  entity_type: z.enum(['project', 'observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'])
    .describe('Type of the entity'),
  entity_id: z.string().min(1).describe('ID of the entity'),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().describe('Direction of relations (default: both)'),
});

// Link two entities
export async function linkEntities(input: z.infer<typeof LinkEntitiesSchema>) {
  const pb = await getPocketBase();

  try {
    // Check if relationship already exists
    try {
      await pb.collection('relationships').getFirstListItem(
        `source_type="${input.source_type}" && source_id="${input.source_id}" && relation="${input.relation}" && target_type="${input.target_type}" && target_id="${input.target_id}"`
      );
      return {
        success: false,
        message: 'Relationship already exists',
      };
    } catch {
      // Relationship doesn't exist, create it
    }

    const record = await pb.collection('relationships').create({
      source_type: input.source_type,
      source_id: input.source_id,
      relation: input.relation,
      target_type: input.target_type,
      target_id: input.target_id,
      context: input.context,
    });

    logger.info(`Created relationship: ${input.source_type}:${input.source_id} --[${input.relation}]--> ${input.target_type}:${input.target_id}`);

    return {
      success: true,
      id: record.id,
      message: `Linked ${input.source_type} to ${input.target_type} with relation "${input.relation}"`,
    };
  } catch (error) {
    logger.error('Failed to link entities', error);
    throw error;
  }
}

// Get relations for an entity
export async function getRelations(input: z.infer<typeof GetRelationsSchema>) {
  const pb = await getPocketBase();
  const direction = input.direction || 'both';

  const relations: {
    outgoing: Array<{
      id: string;
      relation: string;
      target_type: string;
      target_id: string;
      context: string;
    }>;
    incoming: Array<{
      id: string;
      relation: string;
      source_type: string;
      source_id: string;
      context: string;
    }>;
  } = {
    outgoing: [],
    incoming: [],
  };

  try {
    // Get outgoing relations
    if (direction === 'outgoing' || direction === 'both') {
      const outgoing = await pb.collection('relationships').getFullList({
        filter: `source_type="${input.entity_type}" && source_id="${input.entity_id}"`,
      });
      relations.outgoing = outgoing.map(r => ({
        id: r.id,
        relation: r.relation,
        target_type: r.target_type,
        target_id: r.target_id,
        context: r.context || '',
      }));
    }

    // Get incoming relations
    if (direction === 'incoming' || direction === 'both') {
      const incoming = await pb.collection('relationships').getFullList({
        filter: `target_type="${input.entity_type}" && target_id="${input.entity_id}"`,
      });
      relations.incoming = incoming.map(r => ({
        id: r.id,
        relation: r.relation,
        source_type: r.source_type,
        source_id: r.source_id,
        context: r.context || '',
      }));
    }

    return {
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      total_outgoing: relations.outgoing.length,
      total_incoming: relations.incoming.length,
      relations,
    };
  } catch (error) {
    logger.error('Failed to get relations', error);
    throw error;
  }
}

// Auto-suggest relations based on content similarity
export const SuggestRelationsSchema = z.object({
  entity_type: z.enum(['observation', 'decision', 'bug', 'pattern', 'snippet'])
    .describe('Type of the entity'),
  entity_id: z.string().min(1).describe('ID of the entity'),
  limit: z.number().min(1).max(10).optional().describe('Max suggestions (default: 5)'),
});

export async function suggestRelations(input: z.infer<typeof SuggestRelationsSchema>) {
  const pb = await getPocketBase();
  const limit = input.limit || 5;

  try {
    // Get the entity's tags
    const collectionMap: Record<string, string> = {
      observation: 'observations',
      decision: 'decisions',
      bug: 'bugs_and_fixes',
      pattern: 'patterns',
      snippet: 'code_snippets',
    };

    const collectionName = collectionMap[input.entity_type];
    const entity = await pb.collection(collectionName).getOne(input.entity_id);
    const tags = entity.tags || [];

    if (tags.length === 0) {
      return {
        suggestions: [],
        message: 'No tags found on entity to suggest relations',
      };
    }

    // Find other entities with similar tags
    const suggestions: Array<{
      type: string;
      id: string;
      title: string;
      shared_tags: string[];
      suggested_relation: string;
    }> = [];

    for (const [type, collection] of Object.entries(collectionMap)) {
      if (type === input.entity_type) continue;

      const tagFilter = tags.map((t: string) => `tags~"${t}"`).join(' || ');

      try {
        const similar = await pb.collection(collection).getList(1, limit, {
          filter: tagFilter,
        });

        for (const item of similar.items) {
          const sharedTags = tags.filter((t: string) => (item.tags || []).includes(t));
          if (sharedTags.length > 0) {
            suggestions.push({
              type,
              id: item.id,
              title: item.title || item.name || item.error_message?.slice(0, 50) || 'Untitled',
              shared_tags: sharedTags,
              suggested_relation: 'related_to',
            });
          }
        }
      } catch {
        // Continue with other collections
      }
    }

    // Sort by number of shared tags
    suggestions.sort((a, b) => b.shared_tags.length - a.shared_tags.length);

    return {
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      suggestions: suggestions.slice(0, limit),
    };
  } catch (error) {
    logger.error('Failed to suggest relations', error);
    throw error;
  }
}
