/**
 * Dynamic Tool Loader
 * Lazily loads tool categories based on context
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolCategories, CategoryTriggers, getCategoriesByKeywords, type ToolCategory } from './categories.js';
import { registry } from './registry.js';
import { logger } from '../utils/logger.js';

// Track which categories have been loaded
const loadedCategories = new Set<ToolCategory>();

/**
 * Dynamic Tool Loader
 * Loads tool categories on-demand based on conversation context
 */
export class DynamicToolLoader {
  private server: McpServer;
  private toolImports: Map<ToolCategory, () => Promise<any>>;

  constructor(server: McpServer) {
    this.server = server;

    // Map of categories to their tool module imports
    this.toolImports = new Map<ToolCategory, () => Promise<any>>([
      ['session', () => import('../tools/session.js')],
      ['task', () => import('../tools/tasks.js')],
      ['capture', () => import('../tools/capture.js')],
      ['outcome', () => import('../tools/capture.js')], // Outcome tools in same file as capture
      ['workflow', () => import('../tools/workflow.js')],
      ['context', () => import('../tools/context.js')],
      ['relation', () => import('../tools/relate.js')],
      ['reflection', () => import('../tools/reflect.js')],
    ]);
  }

  /**
   * Load a specific category of tools
   */
  async loadCategory(category: ToolCategory): Promise<void> {
    if (loadedCategories.has(category)) {
      return; // Already loaded
    }

    if (category === 'core') {
      logger.info('Core tools already pre-loaded');
      loadedCategories.add(category);
      return;
    }

    logger.info(`Dynamically loading category: ${category}`);

    const importFn = this.toolImports.get(category);
    if (!importFn) {
      logger.warn(`No import function for category: ${category}`);
      return;
    }

    try {
      // Import the tool module
      const module = await importFn();

      // Extract tools array from module (e.g., sessionTools, taskTools)
      const toolsKey = `${category}Tools`;
      const tools = module[toolsKey];

      if (tools && Array.isArray(tools)) {
        // Register and apply tools
        registry.registerAll(tools);
        registry.applyToServer(this.server);
        loadedCategories.add(category);

        logger.info(`Loaded ${tools.length} tools for category: ${category}`);
      } else {
        logger.warn(`No tools array found in module for category: ${category}`);
      }
    } catch (error) {
      logger.error(`Failed to load category ${category}:`, error);
    }
  }

  /**
   * Load multiple categories
   */
  async loadCategories(categories: ToolCategory[]): Promise<void> {
    await Promise.all(categories.map((cat) => this.loadCategory(cat)));
  }

  /**
   * Detect categories from input text and load them
   */
  async loadByTriggers(text: string): Promise<ToolCategory[]> {
    const categories = getCategoriesByKeywords(text);
    await this.loadCategories(categories);
    return categories;
  }

  /**
   * Get list of loaded categories
   */
  getLoadedCategories(): ToolCategory[] {
    return Array.from(loadedCategories);
  }

  /**
   * Get list of unloaded categories
   */
  getUnloadedCategories(): ToolCategory[] {
    const allCategories = Object.keys(ToolCategories) as ToolCategory[];
    return allCategories.filter((cat) => !loadedCategories.has(cat));
  }

  /**
   * Check if a category is loaded
   */
  isLoaded(category: ToolCategory): boolean {
    return loadedCategories.has(category);
  }

  /**
   * Reset loaded categories (for testing)
   */
  reset(): void {
    loadedCategories.clear();
  }
}

// Export singleton instance
let dynamicLoader: DynamicToolLoader | null = null;

export function initDynamicLoader(server: McpServer): DynamicToolLoader {
  dynamicLoader = new DynamicToolLoader(server);
  return dynamicLoader;
}

export function getDynamicLoader(): DynamicToolLoader | null {
  return dynamicLoader;
}
