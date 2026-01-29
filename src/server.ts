import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from './utils/logger.js';

// Import tool schemas and handlers
import {
  CaptureObservationSchema,
  CaptureDecisionSchema,
  CaptureBugSchema,
  SaveSnippetSchema,
  RecordDecisionOutcomeSchema,
  GetPendingOutcomesSchema,
  captureObservation,
  captureDecision,
  captureBug,
  saveSnippet,
  recordDecisionOutcome,
  getPendingOutcomes,
} from './tools/capture.js';

import {
  SaveWorkflowSchema,
  FindWorkflowSchema,
  GetWorkflowSchema,
  RecordWorkflowExecutionSchema,
  saveWorkflow,
  findWorkflow,
  getWorkflow,
  recordWorkflowExecution,
} from './tools/workflow.js';

import {
  SearchKnowledgeSchema,
  SemanticSearchSchema,
  searchKnowledge,
  semanticSearch,
} from './tools/search.js';

import {
  GetProjectContextSchema,
  GetPreferencesSchema,
  SavePreferenceSchema,
  getProjectContext,
  getPreferences,
  savePreference,
} from './tools/context.js';

import {
  LinkEntitiesSchema,
  GetRelationsSchema,
  SuggestRelationsSchema,
  linkEntities,
  getRelations,
  suggestRelations,
} from './tools/relate.js';

import {
  GenerateRetrospectiveSchema,
  GetLessonsSchema,
  generateRetrospective,
  getLessons,
} from './tools/reflect.js';

import {
  CreateSessionSchema,
  EndSessionSchema,
  GetCurrentSessionSchema,
  createSession,
  endSession,
  getCurrentSession,
} from './tools/session.js';

import {
  CreateTaskSchema,
  UpdateTaskSchema,
  GetTasksSchema,
  GetProjectProgressSchema,
  DeleteTaskSchema,
  createTask,
  updateTask,
  getTasks,
  getProjectProgress,
  deleteTask,
} from './tools/tasks.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'pocketbase-brain',
    version: '1.0.0',
  });

  // ============================================
  // SESSION TOOLS
  // ============================================

  server.tool(
    'create_session',
    'Start a new work session for tracking activities',
    CreateSessionSchema.shape,
    async (args) => {
      try {
        const result = await createSession(CreateSessionSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('create_session failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'end_session',
    'End the current work session with outcome and summary',
    EndSessionSchema.shape,
    async (args) => {
      try {
        const result = await endSession(EndSessionSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('end_session failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_current_session',
    'Get information about the current active session',
    GetCurrentSessionSchema.shape,
    async (args) => {
      try {
        const result = await getCurrentSession(GetCurrentSessionSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_current_session failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // TASK TOOLS
  // ============================================

  server.tool(
    'create_task',
    'Create a new task for tracking work progress',
    CreateTaskSchema.shape,
    async (args) => {
      try {
        const result = await createTask(CreateTaskSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('create_task failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'update_task',
    'Update task status, priority, or other details',
    UpdateTaskSchema.shape,
    async (args) => {
      try {
        const result = await updateTask(UpdateTaskSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('update_task failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_tasks',
    'Get list of tasks with optional filters (project, status, feature, priority)',
    GetTasksSchema.shape,
    async (args) => {
      try {
        const result = await getTasks(GetTasksSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_tasks failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_project_progress',
    'Get project progress summary with completion stats, tasks by feature, and next up items',
    GetProjectProgressSchema.shape,
    async (args) => {
      try {
        const result = await getProjectProgress(GetProjectProgressSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_project_progress failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'delete_task',
    'Delete or cancel a task',
    DeleteTaskSchema.shape,
    async (args) => {
      try {
        const result = await deleteTask(DeleteTaskSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('delete_task failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // CAPTURE TOOLS
  // ============================================

  server.tool(
    'capture_observation',
    'Capture an observation, discovery, pattern, or insight',
    CaptureObservationSchema.shape,
    async (args) => {
      try {
        const result = await captureObservation(CaptureObservationSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('capture_observation failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'capture_decision',
    'Capture an important decision with context and rationale',
    CaptureDecisionSchema.shape,
    async (args) => {
      try {
        const result = await captureDecision(CaptureDecisionSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('capture_decision failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'capture_bug',
    'Capture a bug fix with error message, solution, and prevention tips',
    CaptureBugSchema.shape,
    async (args) => {
      try {
        const result = await captureBug(CaptureBugSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('capture_bug failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'save_snippet',
    'Save a reusable code snippet',
    SaveSnippetSchema.shape,
    async (args) => {
      try {
        const result = await saveSnippet(SaveSnippetSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('save_snippet failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // OUTCOME TRACKING TOOLS
  // ============================================

  server.tool(
    'record_decision_outcome',
    'Record what actually happened after a decision was made',
    RecordDecisionOutcomeSchema.shape,
    async (args) => {
      try {
        const result = await recordDecisionOutcome(RecordDecisionOutcomeSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('record_decision_outcome failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_pending_outcomes',
    'Find decisions that need outcome tracking',
    GetPendingOutcomesSchema.shape,
    async (args) => {
      try {
        const result = await getPendingOutcomes(GetPendingOutcomesSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_pending_outcomes failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // WORKFLOW TOOLS
  // ============================================

  server.tool(
    'save_workflow',
    'Save a reusable workflow/procedure',
    SaveWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await saveWorkflow(SaveWorkflowSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('save_workflow failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'find_workflow',
    'Find a workflow by describing what you want to do',
    FindWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await findWorkflow(FindWorkflowSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('find_workflow failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_workflow',
    'Get full details of a workflow including all steps',
    GetWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await getWorkflow(GetWorkflowSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_workflow failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'record_workflow_execution',
    'Record that a workflow was executed',
    RecordWorkflowExecutionSchema.shape,
    async (args) => {
      try {
        const result = await recordWorkflowExecution(RecordWorkflowExecutionSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('record_workflow_execution failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // SEARCH TOOLS
  // ============================================

  server.tool(
    'search_knowledge',
    'Full-text search across knowledge base (observations, decisions, bugs, patterns, snippets)',
    SearchKnowledgeSchema.shape,
    async (args) => {
      try {
        const result = await searchKnowledge(SearchKnowledgeSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('search_knowledge failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'semantic_search',
    'Semantic similarity search using AI embeddings',
    SemanticSearchSchema.shape,
    async (args) => {
      try {
        const result = await semanticSearch(SemanticSearchSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('semantic_search failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // CONTEXT TOOLS
  // ============================================

  server.tool(
    'get_project_context',
    'Get full context for a project including tech stack, recent decisions, bugs, and patterns',
    GetProjectContextSchema.shape,
    async (args) => {
      try {
        const result = await getProjectContext(GetProjectContextSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_project_context failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_preferences',
    'Get user preferences (coding style, tools, workflow)',
    GetPreferencesSchema.shape,
    async (args) => {
      try {
        const result = await getPreferences(GetPreferencesSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_preferences failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'save_preference',
    'Save a user preference',
    SavePreferenceSchema.shape,
    async (args) => {
      try {
        const result = await savePreference(SavePreferenceSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('save_preference failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // RELATION TOOLS
  // ============================================

  server.tool(
    'link_entities',
    'Create a relationship between two entities (knowledge graph edge)',
    LinkEntitiesSchema.shape,
    async (args) => {
      try {
        const result = await linkEntities(LinkEntitiesSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('link_entities failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_relations',
    'Get all relationships for an entity',
    GetRelationsSchema.shape,
    async (args) => {
      try {
        const result = await getRelations(GetRelationsSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_relations failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'suggest_relations',
    'Auto-suggest possible relations based on shared tags',
    SuggestRelationsSchema.shape,
    async (args) => {
      try {
        const result = await suggestRelations(SuggestRelationsSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('suggest_relations failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // REFLECTION TOOLS
  // ============================================

  server.tool(
    'generate_retrospective',
    'Generate a retrospective summary with lessons learned and action items',
    GenerateRetrospectiveSchema.shape,
    async (args) => {
      try {
        const result = await generateRetrospective(GenerateRetrospectiveSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('generate_retrospective failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_lessons',
    'Get lessons learned from past retrospectives',
    GetLessonsSchema.shape,
    async (args) => {
      try {
        const result = await getLessons(GetLessonsSchema.parse(args));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('get_lessons failed', error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  logger.info('MCP Server created with all tools registered');

  return server;
}
