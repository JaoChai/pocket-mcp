import { z } from 'zod';

const ConfigSchema = z.object({
  pocketbase: z.object({
    url: z.string().url(),
    email: z.string().email(),
    password: z.string().min(1),
  }),
  openai: z.object({
    apiKey: z.string().min(1),
    model: z.string().default('text-embedding-3-small'),
  }),
  server: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const config = {
    pocketbase: {
      url: process.env.POCKETBASE_URL || '',
      email: process.env.POCKETBASE_EMAIL || '',
      password: process.env.POCKETBASE_PASSWORD || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    server: {
      logLevel: (process.env.LOG_LEVEL as Config['server']['logLevel']) || 'info',
    },
  };

  return ConfigSchema.parse(config);
}

export const config = loadConfig();
