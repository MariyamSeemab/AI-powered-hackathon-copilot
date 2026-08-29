/**
 * Project memory store.
 *
 * Uses Amazon DynamoDB when a table name is configured AND we can reach it.
 * Otherwise falls back to a local JSON file (dev) so the full workflow runs
 * with zero AWS setup. The public API is identical either way.
 */

import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || path.join(__dirname, '..', '..', '.data', 'projects.json');
const TABLE_NAME = process.env.DYNAMODB_TABLE;
const REGION = process.env.AWS_REGION || 'us-east-1';

let ddbDoc = null;
let useDynamo = false;

async function initDynamo() {
  if (!TABLE_NAME) return false;
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
    const client = new DynamoDBClient({ region: REGION });
    ddbDoc = DynamoDBDocumentClient.from(client);
    useDynamo = true;
    logger.info('store.init', { backend: 'dynamodb', table: TABLE_NAME });
    return true;
  } catch (err) {
    logger.warn('store.init.fallback', { reason: err.message });
    return false;
  }
}

// ---- local file backend ----
async function readLocal() {
  try {
    if (!existsSync(LOCAL_DB_PATH)) return {};
    const raw = await readFile(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    logger.error('store.local.read_error', { reason: err.message });
    return {};
  }
}

async function writeLocal(all) {
  await mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await writeFile(LOCAL_DB_PATH, JSON.stringify(all, null, 2), 'utf8');
}

// ---- public API ----
export async function initStore() {
  await initDynamo();
}

export function storeStatus() {
  return { backend: useDynamo ? 'dynamodb' : 'local-file', table: TABLE_NAME || null };
}

export async function createProject(data) {
  const now = new Date().toISOString();
  const project = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    name: data.name || 'Untitled Project',
    problem: data.problem || '',
    description: data.description || '',
    targetUsers: data.targetUsers || '',
    teamSize: data.teamSize || '',
    availableTime: data.availableTime || '24 hours',
    technicalSkills: data.technicalSkills || '',
    preferredLanguage: data.preferredLanguage || '',
    preferredTech: data.preferredTech || '',
    preferredAws: data.preferredAws || '',
    theme: data.theme || '',
    // workflow artifacts
    analysis: null,
    mvp: null,
    architecture: null,
    tasks: [],
    decisions: [],
    mentorLog: [],
    review: null,
    demo: null,
    pitch: null
  };
  await put(project);
  logger.info('project.created', { id: project.id, name: project.name });
  return project;
}

export async function getProject(id) {
  if (useDynamo) {
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const res = await ddbDoc.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return res.Item || null;
  }
  const all = await readLocal();
  return all[id] || null;
}

export async function listProjects() {
  if (useDynamo) {
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const res = await ddbDoc.send(new ScanCommand({ TableName: TABLE_NAME }));
    return (res.Items || []).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
  const all = await readLocal();
  return Object.values(all).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function put(project) {
  project.updatedAt = new Date().toISOString();
  if (useDynamo) {
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    await ddbDoc.send(new PutCommand({ TableName: TABLE_NAME, Item: project }));
    logger.info('store.put', { id: project.id });
    return project;
  }
  const all = await readLocal();
  all[project.id] = project;
  await writeLocal(all);
  logger.info('store.put', { id: project.id, backend: 'local' });
  return project;
}

export async function updateProject(id, patch) {
  const project = await getProject(id);
  if (!project) return null;
  const updated = { ...project, ...patch };
  await put(updated);
  return updated;
}

export async function deleteProject(id) {
  if (useDynamo) {
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    await ddbDoc.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
    return true;
  }
  const all = await readLocal();
  delete all[id];
  await writeLocal(all);
  return true;
}
