import React, { useState } from 'react';
import { Card, Button, Badge, Progress, Empty } from '../components/UI.jsx';
import { api } from '../api.js';

const COLUMNS = [
  { key: 'TODO', title: 'To Do' },
  { key: 'IN_PROGRESS', title: 'In Progress' },
  { key: 'DONE', title: 'Done' }
];
const NEXT = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' };

export default function Tasks({ project, refresh, setError }) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const tasks = project.tasks || [];
  const progress = project.progress || {};

  async function gen() {
    setLoading(true);
    try {
      await api.tasks(project.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function cycle(task) {
    setBusy(task.id);
    try {
      await api.updateTask(project.id, task.id, NEXT[task.status]);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>🛠️ Development Tasks</h1>
        <Button variant="primary" loading={loading} onClick={gen}>
          {tasks.length ? 'Regenerate plan' : 'Generate Tasks'}
        </Button>
      </div>

      {!tasks.length ? (
        <Empty icon="🛠️" title="No tasks yet">Generate an ordered implementation plan from your MVP + architecture.</Empty>
      ) : (
        <>
          <Card>
            <div className="row between">
              <strong>Progress: {progress.taskPct ?? 0}%</strong>
              <span className="muted">{progress.completedTasks}/{progress.totalTasks} done · {progress.estimatedTimeRemaining} left</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Progress value={progress.taskPct ?? 0} />
            </div>
          </Card>

          <div className="grid cols-3">
            {COLUMNS.map((col) => (
              <Card key={col.key} style={{ padding: 14 }}>
                <h3 style={{ marginTop: 0 }}>{col.title} <span className="muted">({tasks.filter((t) => t.status === col.key).length})</span></h3>
                <div className="stack">
                  {tasks.filter((t) => t.status === col.key).map((t) => (
                    <div key={t.id} className="card" style={{ padding: 12 }}>
                      <div className="row between">
                        <strong style={{ fontSize: 14 }}>{t.order}. {t.name}</strong>
                        <Badge kind={t.priority}>{t.priority}</Badge>
                      </div>
                      <p className="muted" style={{ fontSize: 12, margin: '6px 0' }}>{t.description}</p>
                      <div className="row between">
                        <span className="muted" style={{ fontSize: 12 }}>~{t.estimateHours}h</span>
                        <Button variant="ghost sm" loading={busy === t.id} onClick={() => cycle(t)}>
                          → {NEXT[t.status].replace('_', ' ')}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!tasks.filter((t) => t.status === col.key).length && (
                    <p className="muted" style={{ fontSize: 13 }}>Empty</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
