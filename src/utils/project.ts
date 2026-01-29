/**
 * Project resolution utilities
 */
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from './logger.js';

/**
 * Options for getOrCreateProject
 */
export interface GetOrCreateProjectOptions {
  /** Whether to log when creating a new project (default: true) */
  logCreation?: boolean;
}

/**
 * Find existing project by name or create a new one
 *
 * @param projectName - Name of the project (optional)
 * @param options - Configuration options
 * @returns Project ID if found/created, null if no name provided or on error
 *
 * @example
 * const projectId = await getOrCreateProject('my-project');
 * const projectId = await getOrCreateProject('my-project', { logCreation: false });
 */
export async function getOrCreateProject(
  projectName?: string,
  options: GetOrCreateProjectOptions = {}
): Promise<string | null> {
  if (!projectName) return null;

  const { logCreation = true } = options;
  const pb = await getPocketBase();

  try {
    // Try to find existing project
    const existing = await pb.collection('projects').getFirstListItem(`name="${projectName}"`);
    return existing.id;
  } catch {
    // Create new project
    try {
      const created = await pb.collection('projects').create({
        name: projectName,
        status: 'active',
      });

      if (logCreation) {
        logger.info(`Created new project: ${projectName}`);
      }

      return created.id;
    } catch (error) {
      logger.error('Failed to create project', error);
      return null;
    }
  }
}

/**
 * Find project ID by name (does not create if not exists)
 *
 * @param projectName - Name of the project
 * @returns Project ID if found, null otherwise
 */
export async function findProject(projectName: string): Promise<string | null> {
  const pb = await getPocketBase();

  try {
    const project = await pb.collection('projects').getFirstListItem(`name="${projectName}"`);
    return project.id;
  } catch {
    return null;
  }
}
