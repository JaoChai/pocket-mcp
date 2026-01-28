type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data) {
      return `${base} ${JSON.stringify(data)}`;
    }
    return base;
  }

  // IMPORTANT: Always use stderr for MCP STDIO servers
  debug(message: string, data?: unknown) {
    if (this.shouldLog('debug')) {
      console.error(this.format('debug', message, data));
    }
  }

  info(message: string, data?: unknown) {
    if (this.shouldLog('info')) {
      console.error(this.format('info', message, data));
    }
  }

  warn(message: string, data?: unknown) {
    if (this.shouldLog('warn')) {
      console.error(this.format('warn', message, data));
    }
  }

  error(message: string, data?: unknown) {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, data));
    }
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);
