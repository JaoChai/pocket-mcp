/**
 * Core Tools
 * These tools are always loaded upfront as they are fundamental to the system
 */

import { getCurrentSession } from './session.js';
import { searchKnowledge, semanticSearch } from './search.js';

/**
 * Core tools that are loaded on server startup
 * These should be lightweight and provide fundamental functionality
 */
export const coreTools = [getCurrentSession, searchKnowledge, semanticSearch];
