import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Toast, Empty } from '../components/UI.jsx';
import { api } from '../api.js';

export default function Projects() {
  const nav = useNavigate();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setProjects(await api.listProjects());
    } catch (e) {
      setError(e.message);
      setProjects([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    try {
      await api.deleteProject(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 26, paddingBottom: 60 }}>
      <div className="row between">
        <h1>My Projects</h1>
        <Button variant="primary" onClick={() => nav('/new')}>
          + New Project
        </Button>
      </div>

      {projects === null ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <Empty icon="🗂️" title="No projects yet">
          Create your first project or try the built-in CampusConnect demo.
        </Empty>
      ) : (
        <div className="grid cols-3" style={{ marginTop: 16 }}>
          {projects.map((p) => (
            <Card key={p.id}>
              <div className="row between">
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                {p.review?.scores?.overall != null && (
                  <span className="badge done">{p.review.scores.overall}</span>
                )}
              </div>
              <p className="muted" style={{ fontSize: 14, minHeight: 40 }}>
                {(p.problem || '').slice(0, 100) || 'No problem statement.'}
              </p>
              <div className="row between">
                <Link to={`/project/${p.id}`} className="btn sm primary">
                  Open
                </Link>
                <Button variant="ghost sm" onClick={() => remove(p.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Toast message={error} onClose={() => setError('')} />
    </div>
  );
}
