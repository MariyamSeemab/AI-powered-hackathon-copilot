const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  listProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (body) => request('/projects', { method: 'POST', body }),
  createSample: () => request('/projects/sample', { method: 'POST' }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  analyze: (id) => request(`/projects/${id}/analyze`, { method: 'POST' }),
  mvp: (id, reduce = false) => request(`/projects/${id}/mvp`, { method: 'POST', body: { reduce } }),
  architecture: (id) => request(`/projects/${id}/architecture`, { method: 'POST' }),
  tasks: (id) => request(`/projects/${id}/tasks`, { method: 'POST' }),
  updateTask: (id, taskId, status) =>
    request(`/projects/${id}/tasks/${taskId}`, { method: 'PATCH', body: { status } }),
  mentor: (id, question) => request(`/projects/${id}/mentor`, { method: 'POST', body: { question } }),
  review: (id) => request(`/projects/${id}/review`, { method: 'POST' }),
  demo: (id) => request(`/projects/${id}/demo`, { method: 'POST' }),
  pitch: (id) => request(`/projects/${id}/pitch`, { method: 'POST' })
};
