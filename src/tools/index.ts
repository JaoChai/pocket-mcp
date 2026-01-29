/**
 * Aggregates all tools from tool files for easy registration
 */

import { sessionTools } from './session.js';
import { taskTools } from './tasks.js';
import { captureTools } from './capture.js';
import { workflowTools } from './workflow.js';
import { searchTools } from './search.js';
import { contextTools } from './context.js';
import { relateTools } from './relate.js';
import { reflectTools } from './reflect.js';

// All tools combined for registry registration
export const allTools = [
  ...sessionTools,
  ...taskTools,
  ...captureTools,
  ...workflowTools,
  ...searchTools,
  ...contextTools,
  ...relateTools,
  ...reflectTools,
];

// Re-export individual tool arrays for flexibility
export { sessionTools } from './session.js';
export { taskTools } from './tasks.js';
export { captureTools } from './capture.js';
export { workflowTools } from './workflow.js';
export { searchTools } from './search.js';
export { contextTools } from './context.js';
export { relateTools } from './relate.js';
export { reflectTools } from './reflect.js';

// Re-export individual tools for direct access
export * from './session.js';
export * from './tasks.js';
export * from './capture.js';
export * from './workflow.js';
export * from './search.js';
export * from './context.js';
export * from './relate.js';
export * from './reflect.js';
