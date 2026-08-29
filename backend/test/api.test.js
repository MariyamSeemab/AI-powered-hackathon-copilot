import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Hermetic env: disable Bedrock and use a temp local DB file.
const TMP_DB = path.join(os.tmpdir(), `copilot-test-${randomUUID()}.json`);
process.env.BEDROCK_ENABLED = 'false';
process.env.LOCAL_DB_PATH = TMP_DB;
delete process.env.DYNAMODB_TABLE;

const { createApp } = await import('../src/app.js');
const { initStore } = await import('../src/lib/store.js');

let server;
let baseUrl;

before(async () => {
  await initStore();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(TMP_DB, { force: true });
});

/** Real HTTP request against the running Express app. */
async function call(method, url, body) {
  const res = await fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test('health endpoint reports store + bedrock status', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
  assert.equal(r.body.bedrock.enabled, false);
});

test('project creation requires a name', async () => {
  const r = await call('POST', '/api/projects', { problem: 'x' });
  assert.equal(r.status, 400);
});

test('full workflow: create -> analyze -> mvp -> arch -> tasks -> update -> mentor -> review -> demo', async () => {
  const created = await call('POST', '/api/projects', {
    name: 'CampusConnect',
    problem: 'College students struggle to discover internships, hackathons, events and scholarships.',
    targetUsers: 'College students',
    availableTime: '24 hours'
  });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.ok(id);

  const analyzed = await call('POST', `/api/projects/${id}/analyze`);
  assert.equal(analyzed.status, 200);
  assert.ok(analyzed.body.analysis.score.overall >= 0);

  const mvp = await call('POST', `/api/projects/${id}/mvp`, { reduce: true });
  assert.ok(mvp.body.mvp.mustHave.length <= 4);

  const arch = await call('POST', `/api/projects/${id}/architecture`);
  assert.ok(arch.body.architecture.services.length >= 3);

  const tasks = await call('POST', `/api/projects/${id}/tasks`);
  assert.ok(tasks.body.tasks.length >= 6);
  const firstTask = tasks.body.tasks[0];

  const updated = await call('PATCH', `/api/projects/${id}/tasks/${firstTask.id}`, { status: 'DONE' });
  assert.equal(updated.body.tasks.find((t) => t.id === firstTask.id).status, 'DONE');

  const mentor = await call('POST', `/api/projects/${id}/mentor`, { question: 'I want to add 10 more features' });
  assert.match(mentor.body.recommendation + mentor.body.problem, /scope|finish|do not/i);

  const review = await call('POST', `/api/projects/${id}/review`);
  assert.ok(review.body.review.scores.overall >= 0);

  const demo = await call('POST', `/api/projects/${id}/demo`);
  assert.match(demo.body.demo.pitch30, /CampusConnect/);

  // persistence: fetch and confirm state survived
  const fetched = await call('GET', `/api/projects/${id}`);
  assert.ok(fetched.body.analysis && fetched.body.mvp && fetched.body.architecture);
  assert.ok(fetched.body.progress.overall > 0);
  assert.ok(fetched.body.decisions.length >= 5, 'project memory recorded decisions');
});

test('invalid task status is rejected', async () => {
  const created = await call('POST', '/api/projects', { name: 'X', problem: 'y' });
  const id = created.body.id;
  await call('POST', `/api/projects/${id}/tasks`);
  const p = await call('GET', `/api/projects/${id}`);
  const tid = p.body.tasks[0].id;
  const r = await call('PATCH', `/api/projects/${id}/tasks/${tid}`, { status: 'NOPE' });
  assert.equal(r.status, 400);
});

test('unknown project returns 404', async () => {
  const r = await call('GET', '/api/projects/does-not-exist');
  assert.equal(r.status, 404);
});

test('sample project seeds a complete workflow', async () => {
  const r = await call('POST', '/api/projects/sample');
  assert.equal(r.status, 201);
  const b = r.body;
  assert.ok(b.analysis && b.mvp && b.architecture && b.tasks.length && b.review && b.demo && b.pitch);
  assert.ok(b.tasks.some((t) => t.status === 'DONE'), 'sample has progress');
});
