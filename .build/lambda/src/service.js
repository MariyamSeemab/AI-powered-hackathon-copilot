/**
 * Application service layer. Orchestrates the reasoning engine, Bedrock
 * enrichment, and the project-memory store. Every step reads and writes
 * project state so the agent's later responses reflect earlier decisions.
 */

import * as engine from './ai/engine.js';
import { enrichNarrative } from './ai/bedrock.js';
import * as store from './lib/store.js';
import { SAMPLE_INPUT } from './lib/sample.js';
import { logger } from './lib/logger.js';

export async function createProject(input) {
  if (!input || !String(input.name || '').trim()) {
    const err = new Error('Project name is required.');
    err.status = 400;
    throw err;
  }
  return store.createProject(input);
}

export async function createSampleProject() {
  const project = await store.createProject(SAMPLE_INPUT);
  // Pre-run the full workflow so the demo is instant and complete.
  await runAnalysis(project.id);
  await runMvp(project.id, { reduce: true });
  await runArchitecture(project.id);
  await runTasks(project.id);
  // Mark a couple of tasks done so progress + mentor are interesting.
  const p = await store.getProject(project.id);
  if (p.tasks[0]) p.tasks[0].status = 'DONE';
  if (p.tasks[1]) p.tasks[1].status = 'DONE';
  if (p.tasks[2]) p.tasks[2].status = 'DONE';
  if (p.tasks[3]) p.tasks[3].status = 'IN_PROGRESS';
  await store.put(p);
  await runReview(project.id);
  await runDemo(project.id);
  await runPitch(project.id);
  return store.getProject(project.id);
}

export async function getProject(id) {
  const p = await store.getProject(id);
  if (!p) {
    const err = new Error('Project not found.');
    err.status = 404;
    throw err;
  }
  return p;
}

export async function listProjects() {
  return store.listProjects();
}

export async function deleteProject(id) {
  await getProject(id);
  return store.deleteProject(id);
}

function recordDecision(project, decision) {
  project.decisions = project.decisions || [];
  project.decisions.push({ at: new Date().toISOString(), decision });
}

export async function runAnalysis(id) {
  const project = await getProject(id);
  const analysis = engine.analyzeIdea(project);
  analysis.proposedSolution = await enrichNarrative(
    { name: project.name, problem: project.problem, users: project.targetUsers },
    'Write a crisp proposed solution for this hackathon project.',
    analysis.proposedSolution
  );
  project.analysis = analysis;
  recordDecision(project, `Idea analyzed. Score ${analysis.score.overall}/100.`);
  await store.put(project);
  logger.info('workflow.analysis', { id, score: analysis.score.overall });
  return project;
}

export async function runMvp(id, { reduce = false } = {}) {
  const project = await getProject(id);
  const mvp = engine.generateMvp(project, { reduce });
  project.mvp = mvp;
  recordDecision(
    project,
    reduce
      ? `Scope reduced to ${mvp.summary.mustHaveCount} must-have features.`
      : `MVP generated with ${mvp.summary.mustHaveCount} must-have features.`
  );
  await store.put(project);
  logger.info('workflow.mvp', { id, reduce, mustHave: mvp.summary.mustHaveCount });
  return project;
}

export async function runArchitecture(id) {
  const project = await getProject(id);
  if (!project.mvp) await runMvp(id);
  const fresh = await getProject(id);
  const architecture = engine.generateArchitecture(fresh, fresh.mvp);
  fresh.architecture = architecture;
  recordDecision(fresh, `Architecture designed using ${architecture.services.length} AWS services.`);
  await store.put(fresh);
  logger.info('workflow.architecture', { id, services: architecture.services.length });
  return fresh;
}

export async function runTasks(id) {
  const project = await getProject(id);
  if (!project.mvp) await runMvp(id);
  if (!project.architecture) await runArchitecture(id);
  const fresh = await getProject(id);
  fresh.tasks = engine.generateTasks(fresh, fresh.mvp, fresh.architecture);
  recordDecision(fresh, `Generated ${fresh.tasks.length} development tasks.`);
  await store.put(fresh);
  logger.info('workflow.tasks', { id, count: fresh.tasks.length });
  return fresh;
}

export async function updateTask(id, taskId, status) {
  const valid = ['TODO', 'IN_PROGRESS', 'DONE'];
  if (!valid.includes(status)) {
    const err = new Error(`Invalid status. Use one of: ${valid.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const project = await getProject(id);
  const task = (project.tasks || []).find((t) => t.id === taskId);
  if (!task) {
    const err = new Error('Task not found.');
    err.status = 404;
    throw err;
  }
  task.status = status;
  await store.put(project);
  logger.info('task.updated', { id, taskId, status });
  return project;
}

export function getProgress(project) {
  return engine.computeProgress(project);
}

export async function askMentor(id, question) {
  const project = await getProject(id);
  const base = engine.mentor(project, question || '');
  base.recommendation = await enrichNarrative(
    {
      name: project.name,
      progress: engine.computeProgress(project),
      question,
      openTasks: (project.tasks || []).filter((t) => t.status !== 'DONE').map((t) => t.name)
    },
    'As a strict hackathon mentor, give one recommendation that pushes the builder toward shipping. Do not agree blindly.',
    base.recommendation
  );
  project.mentorLog = project.mentorLog || [];
  project.mentorLog.push({ at: new Date().toISOString(), question, response: base });
  await store.put(project);
  logger.info('mentor.asked', { id });
  return { project, mentor: base };
}

export async function runReview(id) {
  const project = await getProject(id);
  const review = engine.reviewProject(project);
  project.review = review;
  recordDecision(project, `Project reviewed. Overall score ${review.scores.overall}/100.`);
  await store.put(project);
  logger.info('workflow.review', { id, overall: review.scores.overall });
  return project;
}

export async function runDemo(id) {
  const project = await getProject(id);
  const demo = engine.generateDemo(project);
  demo.pitch30 = await enrichNarrative(
    { name: project.name, problem: project.problem, users: project.targetUsers },
    'Write a punchy 30-second hackathon pitch (2-3 sentences).',
    demo.pitch30
  );
  project.demo = demo;
  recordDecision(project, 'Demo script and pitch generated.');
  await store.put(project);
  logger.info('workflow.demo', { id });
  return project;
}

export async function runPitch(id) {
  const project = await getProject(id);
  const pitch = engine.generatePitch(project);
  project.pitch = pitch;
  await store.put(project);
  logger.info('workflow.pitch', { id });
  return project;
}
