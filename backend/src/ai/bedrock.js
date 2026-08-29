/**
 * Amazon Bedrock / Nova client with graceful fallback.
 *
 * Strategy:
 *  - If AWS creds + Bedrock are available, we ask Nova to REFINE the narrative
 *    fields of the deterministic engine output (proposedSolution, UVP, pitch
 *    prose, etc.) so the app is genuinely AI-powered.
 *  - Structured fields (scores, feature lists, tasks) always come from the
 *    deterministic engine so the product NEVER breaks and stays consistent.
 *  - On ANY Bedrock error (no creds, throttling, timeout), we log and return
 *    the engine output unchanged. The demo always works.
 */

import { logger } from '../lib/logger.js';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
const REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_ENABLED = process.env.BEDROCK_ENABLED !== 'false';

let clientPromise = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      return new BedrockRuntimeClient({ region: REGION });
    })();
  }
  return clientPromise;
}

/**
 * Invoke Nova with a prompt and return text. Throws on failure so callers fall back.
 */
export async function invokeNova(systemPrompt, userPrompt, { maxTokens = 800 } = {}) {
  if (!BEDROCK_ENABLED) {
    throw new Error('Bedrock disabled via BEDROCK_ENABLED=false');
  }
  const client = await getClient();
  const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

  const body = {
    schemaVersion: 'messages-v1',
    system: [{ text: systemPrompt }],
    messages: [{ role: 'user', content: [{ text: userPrompt }] }],
    inferenceConfig: { maxTokens, temperature: 0.5, topP: 0.9 }
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body)
  });

  const res = await client.send(command);
  const decoded = JSON.parse(new TextDecoder().decode(res.body));
  const text = decoded?.output?.message?.content?.[0]?.text;
  if (!text) throw new Error('Empty Nova response');
  return text.trim();
}

/**
 * Try to enrich a narrative string via Nova; fall back to the provided default.
 */
export async function enrichNarrative(context, instruction, fallback) {
  try {
    const system =
      'You are Hackathon Copilot, an expert AWS solutions architect and hackathon mentor. ' +
      'Be concrete, specific to the project, and concise. Never invent AWS services that are not warranted.';
    const user = `Project context:\n${JSON.stringify(context).slice(0, 3000)}\n\nTask: ${instruction}\nRespond with 1-3 sentences only.`;
    const text = await invokeNova(system, user, { maxTokens: 200 });
    logger.info('bedrock.enrich.success', { model: MODEL_ID });
    return text;
  } catch (err) {
    logger.warn('bedrock.enrich.fallback', { reason: err.message });
    return fallback;
  }
}

export function bedrockStatus() {
  return {
    enabled: BEDROCK_ENABLED,
    model: MODEL_ID,
    region: REGION
  };
}
