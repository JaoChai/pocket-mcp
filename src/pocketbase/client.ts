import PocketBase from 'pocketbase';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let pb: PocketBase | null = null;
let isAuthenticated = false;

export async function getPocketBase(): Promise<PocketBase> {
  if (!pb) {
    pb = new PocketBase(config.pocketbase.url);
  }

  if (!isAuthenticated) {
    try {
      await pb.admins.authWithPassword(
        config.pocketbase.email,
        config.pocketbase.password
      );
      isAuthenticated = true;
      logger.info('PocketBase authenticated successfully');
    } catch (error) {
      logger.error('PocketBase authentication failed', error);
      throw new Error(`PocketBase authentication failed: ${error}`);
    }
  }

  return pb;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const client = await getPocketBase();
    await client.health.check();
    return true;
  } catch {
    return false;
  }
}
