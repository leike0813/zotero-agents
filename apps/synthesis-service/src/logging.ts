type LogFields = Record<string, string | number | boolean | null | undefined>;

export function writeServiceLog(event: string, fields: LogFields = {}) {
  const record: Record<string, string | number | boolean | null> = {
    timestamp: new Date().toISOString(),
    event,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      record[key] = value;
    }
  }
  process.stdout.write(`${JSON.stringify(record)}\n`);
}
