export type LogFields = Record<string, unknown>;

export interface Logger {
  info(fields: LogFields): void;
  warn(fields: LogFields): void;
  error(fields: LogFields): void;
}

function write(level: string, fields: LogFields): void {
  process.stdout.write(`${JSON.stringify({ level, time: new Date().toISOString(), ...fields })}\n`);
}

export const jsonLogger: Logger = {
  info: (fields) => write('info', fields),
  warn: (fields) => write('warn', fields),
  error: (fields) => write('error', fields),
};

export const silentLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
