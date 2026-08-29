import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, useParams, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { Toast } from '../components/UI.jsx';
import Dashboard from '../stages/Dashboard.jsx';
import Idea from '../stages/Idea.jsx';
import Mvp from '../stages/Mvp.jsx';
import Architecture from '../stages/Architecture.jsx';
import Tasks from '../stages/Tasks.jsx';
import Mentor from '../stages/Mentor.jsx';
import Review from '../stages/Review.jsx';
import Demo from '../stages/Demo.jsx';

const NAV = [
  { to: '', icon: '📊', label: 'Dashboard', end: true },
  { to: 'idea', icon: '💡', label: 'Idea' },
  { to: 'mvp', icon: '🎯', label: 'MVP' },
  { to: 'architecture', icon: '☁️', label: 'Architecture' },
  { to: 'tasks', icon: '🛠️', label: 'Tasks' },
  { to: 'mentor', icon: '🤝', label: 'Mentor' },
  { to: 'review', icon: '🧪', label: 'Review' },
  { to: 'demo', icon: '🎤', label: 'Demo' }
];

export default function Workspace() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const p = await api.getProject(id);
      setProject(p);
      return p;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // done/step markers for nav badges
  function statusBadge(key) {
    if (!project) return null;
    const map = {
      idea: project.analysis,
      mvp: project.mvp,
      architecture: project.architecture,
      tasks: project.tasks?.length,
      review: project.review,
      demo: project.demo
    };
    return map[key] ? <span className="badge done">✓</span> : null;
  }

  const ctx = { project, refresh, setError };

  if (loaded && !project) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="empty">
          <h3>Project not found</h3>
          <p>It may have been deleted.</p>
        </div>
        <Toast message={error} onClose={() => setError('')} />
      </div>
    );
  }

  return (
    <div className="container layout">
      <aside className="sidebar">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{project?.name || 'Loading…'}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {project?.progress ? `${project.progress.overall}% complete` : ''}
          </div>
        </div>
        <nav className="nav" style={{ marginTop: 12 }}>
          {NAV.map((n) => (
            <NavLink key={n.to || 'dash'} to={n.to} end={n.end}
              className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
              <span className="badge-slot" style={{ marginLeft: 'auto' }}>{statusBadge(n.to)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main>
        {!project ? (
          <p className="muted">Loading project…</p>
        ) : (
          <Routes>
            <Route index element={<Dashboard {...ctx} />} />
            <Route path="idea" element={<Idea {...ctx} />} />
            <Route path="mvp" element={<Mvp {...ctx} />} />
            <Route path="architecture" element={<Architecture {...ctx} />} />
            <Route path="tasks" element={<Tasks {...ctx} />} />
            <Route path="mentor" element={<Mentor {...ctx} />} />
            <Route path="review" element={<Review {...ctx} />} />
            <Route path="demo" element={<Demo {...ctx} />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        )}
      </main>
      <Toast message={error} onClose={() => setError('')} />
    </div>
  );
}
