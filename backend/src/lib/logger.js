/**
 * Structured JSON logger. In AWS Lambda, stdout/stderr is captured by
 * CloudWatch Logs automatically, so structured JSON here becomes queryable
 * via CloudWatch Logs Insights. Never log secrets or PII.
 */

function emit(level, event, data = {}) {
  const record = {
    level,
    event,
    time: new Date().toISOString(),
    ...redact(data)
  };
  const line = JSON.stringify(record);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const SENSITIVE = /(password|secret|token|authorization|apikey|api_key|credential)/i;

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE.test(k)) out[k] = '[REDACTED]';
    else if (v && typeof v === 'object') out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

export const logger = {
  info: (event, data) => emit('info', event, data),
  warn: (event, data) => emit('warn', event, data),
  error: (event, data) => emit('error', event, data)
};
