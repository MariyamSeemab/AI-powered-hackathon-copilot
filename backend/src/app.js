/**
 * Express application. Used directly by the local dev server and wrapped by
 * the Lambda handler for AWS deployment (API Gateway proxy).
 */

import express from 'express';
import cors from 'cors';
import * as svc from './service.js';
import { getProgress } from './service.js';
import { bedrockStatus } from './ai/bedrock.js';
import { storeStatus } from './lib/store.js';
import { logger } from './lib/logger.js';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  // In Lambda, CORS is handled by API Gateway (CorsConfiguration) so we skip
  // the middleware to avoid duplicate Access-Control-Allow-Origin headers.
  // Locally (dev server) we enable it so the Vite dev origin can call the API.
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
      })
    );
  }

  // request logging (no bodies to avoid leaking PII)
  app.use((req, _res, next) => {
    logger.info('http.request', { method: req.method, path: req.path });
    next();
  });

  // CORS preflight: always answer OPTIONS with 200 so browsers proceed.
  // (API Gateway attaches the Access-Control-* headers.)
  app.options('*', (_req, res) => res.status(200).end());
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
  });

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', bedrock: bedrockStatus(), store: storeStatus() });
  });

  // Projects
  app.get('/api/projects', wrap(async (_req, res) => {
    res.json(await svc.listProjects());
  }));

  app.post('/api/projects', wrap(async (req, res) => {
    const project = await svc.createProject(req.body);
    res.status(201).json(project);
  }));

  app.post('/api/projects/sample', wrap(async (_req, res) => {
    const project = await svc.createSampleProject();
    res.status(201).json(project);
  }));

  app.get('/api/projects/:id', wrap(async (req, res) => {
    const project = await svc.getProject(req.params.id);
    res.json({ ...project, progress: getProgress(project) });
  }));

  app.delete('/api/projects/:id', wrap(async (req, res) => {
    await svc.deleteProject(req.params.id);
    res.status(204).end();
  }));

  // Workflow stages
  app.post('/api/projects/:id/analyze', wrap(async (req, res) => {
    res.json(await svc.runAnalysis(req.params.id));
  }));

  app.post('/api/projects/:id/mvp', wrap(async (req, res) => {
    const reduce = req.body?.reduce === true;
    res.json(await svc.runMvp(req.params.id, { reduce }));
  }));

  app.post('/api/projects/:id/architecture', wrap(async (req, res) => {
    res.json(await svc.runArchitecture(req.params.id));
  }));

  app.post('/api/projects/:id/tasks', wrap(async (req, res) => {
    res.json(await svc.runTasks(req.params.id));
  }));

  app.patch('/api/projects/:id/tasks/:taskId', wrap(async (req, res) => {
    const { status } = req.body || {};
    res.json(await svc.updateTask(req.params.id, req.params.taskId, status));
  }));

  app.post('/api/projects/:id/mentor', wrap(async (req, res) => {
    const { question } = req.body || {};
    const { mentor } = await svc.askMentor(req.params.id, question);
    res.json(mentor);
  }));

  app.post('/api/projects/:id/review', wrap(async (req, res) => {
    res.json(await svc.runReview(req.params.id));
  }));

  app.post('/api/projects/:id/demo', wrap(async (req, res) => {
    res.json(await svc.runDemo(req.params.id));
  }));

  app.post('/api/projects/:id/pitch', wrap(async (req, res) => {
    res.json(await svc.runPitch(req.params.id));
  }));

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });

  // Centralized error handler — never leak internals to the user.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) {
      logger.error('http.error', { path: req.path, message: err.message });
    } else {
      logger.warn('http.client_error', { path: req.path, message: err.message });
    }
    res.status(status).json({
      error: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message
    });
  });

  return app;
}
