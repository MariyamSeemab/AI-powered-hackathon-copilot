import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/ai/engine.js';

const bigIdea = {
  name: 'MegaApp',
  problem:
    'Students need login, search, recommendations, chat assistant, notifications, file upload, dashboard, payments, maps, and social features.',
  targetUsers: 'Students',
  availableTime: '24 hours'
};

const smallIdea = {
  name: 'NoteBuddy',
  problem: 'Users need a simple place to search their notes.',
  targetUsers: 'Writers',
  availableTime: '24 hours'
};

test('analyzeIdea returns scores in 0-100 and an overall', () => {
  const a = engine.analyzeIdea(bigIdea);
  for (const k of ['problemClarity', 'userValue', 'technicalFeasibility', 'innovation', 'hackathonSuitability', 'overall']) {
    assert.ok(a.score[k] >= 0 && a.score[k] <= 100, `${k} in range`);
  }
  assert.ok(typeof a.challenge === 'string' && a.challenge.length > 0);
});

test('analyzeIdea challenges an over-scoped idea', () => {
  const a = engine.analyzeIdea(bigIdea);
  assert.match(a.challenge, /reduc/i, 'should recommend reducing scope');
  assert.ok(a.risks.length > 0, 'should surface risks');
});

test('generateMvp splits features and reduce caps at 4 must-haves', () => {
  const full = engine.generateMvp(bigIdea, { reduce: false });
  assert.ok(full.mustHave.length >= 1);
  const reduced = engine.generateMvp(bigIdea, { reduce: true });
  assert.ok(reduced.mustHave.length <= 4, 'reduced to <=4 must-haves');
  assert.equal(reduced.reduced, true);
  assert.ok(reduced.summary.estimatedBuildTime.includes('hours'));
});

test('generateArchitecture always includes core services and a diagram', () => {
  const mvp = engine.generateMvp(smallIdea);
  const arch = engine.generateArchitecture(smallIdea, mvp);
  const names = arch.services.map((s) => s.name).join(' ');
  assert.match(names, /Lambda/);
  assert.match(names, /DynamoDB/);
  assert.match(names, /CloudWatch/);
  assert.ok(arch.diagram.includes('LAMBDA'));
  for (const s of arch.services) {
    assert.ok(s.purpose && s.why && s.alternative && s.tradeoff, 'each service fully described');
  }
});

test('generateTasks produces ordered tasks with statuses', () => {
  const mvp = engine.generateMvp(smallIdea);
  const arch = engine.generateArchitecture(smallIdea, mvp);
  const tasks = engine.generateTasks(smallIdea, mvp, arch);
  assert.ok(tasks.length >= 6);
  assert.equal(tasks[0].order, 1);
  assert.ok(tasks.every((t) => t.status === 'TODO'));
  assert.ok(tasks.some((t) => /deploy/i.test(t.name)));
});

test('computeProgress reflects task completion', () => {
  const mvp = engine.generateMvp(smallIdea);
  const arch = engine.generateArchitecture(smallIdea, mvp);
  const tasks = engine.generateTasks(smallIdea, mvp, arch);
  const project = { ...smallIdea, analysis: engine.analyzeIdea(smallIdea), mvp, architecture: arch, tasks };
  const before = engine.computeProgress(project);
  tasks.forEach((t) => (t.status = 'DONE'));
  const after = engine.computeProgress(project);
  assert.ok(after.taskPct === 100);
  assert.ok(after.overall > before.overall);
});

test('mentor detects scope creep when MVP incomplete', () => {
  const mvp = engine.generateMvp(smallIdea);
  const arch = engine.generateArchitecture(smallIdea, mvp);
  const tasks = engine.generateTasks(smallIdea, mvp, arch);
  const project = { ...smallIdea, analysis: engine.analyzeIdea(smallIdea), mvp, architecture: arch, tasks };
  const m = engine.mentor(project, 'I want to add 10 more features');
  assert.match(m.problem + m.recommendation, /scope|do not add|finish/i);
  assert.ok(m.nextBestAction.length > 0);
});

test('reviewProject returns 0-100 scores and top improvements', () => {
  const mvp = engine.generateMvp(smallIdea);
  const arch = engine.generateArchitecture(smallIdea, mvp);
  const project = { ...smallIdea, analysis: engine.analyzeIdea(smallIdea), mvp, architecture: arch, tasks: [] };
  const r = engine.reviewProject(project);
  for (const v of Object.values(r.scores)) {
    assert.ok(v >= 0 && v <= 100);
  }
  assert.ok(r.topImprovements.length <= 5 && r.topImprovements.length > 0);
});

test('generateDemo and generatePitch use project data', () => {
  const project = { ...smallIdea, analysis: engine.analyzeIdea(smallIdea), mvp: engine.generateMvp(smallIdea), architecture: engine.generateArchitecture(smallIdea, engine.generateMvp(smallIdea)) };
  const demo = engine.generateDemo(project);
  assert.match(demo.pitch30, /NoteBuddy/);
  assert.equal(demo.demoScript60.length, 7);
  assert.ok(demo.judgeQuestions.length >= 3);
  const pitch = engine.generatePitch(project);
  assert.ok(pitch.problem.length > 0 && pitch.awsArchitecture.length > 0);
});
