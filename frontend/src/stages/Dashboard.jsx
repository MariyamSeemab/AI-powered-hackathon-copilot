import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Progress } from '../components/UI.jsx';
import { api } from '../api.js';

const STAGE_ORDER = ['Idea', 'MVP', 'Architecture', 'Development', 'Testing', 'Deployment', 'Demo'];

function stageIcon(v) {
  if (v === true) return '✓';
  if (v === false) return '○';
  if (typeof v === 'number') return v >= 100 ? '✓' : v > 0 ? '🔄' : '○';
  return '○';
}

export default function Dashboard({ project, refresh, setError }) {
  const nav = useNavigate();
  const [rec, setRec] = useState(null);
  const progress = project.progress || {};

  // Pull a fresh mentor recommendation for the dashboard "Next best action".
  useEffect(() => {
    let alive = true;
    api
      .mentor(project.id, '')
      .then((r) => alive && setRec(r))
      .catch((e) => setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Project Dashboard</h1>
        <span className="muted">{project.availableTime} budget</span>
      </div>

      <div className="grid cols-3">
        <Card>
          <div className="muted">Project progress</div>
          <div className="big-pct">{progress.overall ?? 0}%</div>
          <Progress value={progress.overall ?? 0} />
          <div className="row" style={{ marginTop: 12, gap: 18 }}>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Tasks done</div>
              <strong>
                {progress.completedTasks ?? 0}/{progress.totalTasks ?? 0}
              </strong>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Time remaining</div>
              <strong>{progress.estimatedTimeRemaining ?? '—'}</strong>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>AI score</div>
              <strong>{project.review?.scores?.overall ?? project.analysis?.score?.overall ?? '—'}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <h3>Stages</h3>
          {STAGE_ORDER.map((s) => (
            <div className="stage-row" key={s}>
              <span className="stage-ic">{stageIcon(progress.stages?.[s])}</span>
              <span>{s}</span>
              {typeof progress.stages?.[s] === 'number' && (
                <span className="muted" style={{ marginLeft: 'auto' }}>{progress.stages[s]}%</span>
              )}
            </div>
          ))}
        </Card>

        <Card className="rec-panel">
          <h3>🤝 AI Recommendation</h3>
          {!rec ? (
            <p className="muted">Thinking…</p>
          ) : (
            <>
              <div className="k">Current status</div>
              <div>{rec.currentStatus}</div>
              <div className="k">Problem</div>
              <div>{rec.problem}</div>
              <div className="k">Recommendation</div>
              <div>{rec.recommendation}</div>
              <div className="k">Next best action</div>
              <div style={{ fontWeight: 700 }}>{rec.nextBestAction}</div>
            </>
          )}
        </Card>
      </div>

      <Card>
        <div className="row between">
          <h3 style={{ margin: 0 }}>Blockers & next steps</h3>
          <Button variant="ghost sm" onClick={refresh}>Refresh</Button>
        </div>
        <div className="row" style={{ gap: 24, marginTop: 10 }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Current blocker</div>
            <strong>{rec?.problem?.startsWith('No') || rec?.problem?.startsWith('None') ? 'None 🎉' : rec?.problem || '—'}</strong>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>In progress</div>
            <strong>{progress.inProgressTasks?.join(', ') || 'Nothing yet'}</strong>
          </div>
        </div>
        <div className="pill-row" style={{ marginTop: 16 }}>
          {!project.analysis && <Button variant="primary sm" onClick={() => nav('idea')}>Analyze idea →</Button>}
          {project.analysis && !project.mvp && <Button variant="primary sm" onClick={() => nav('mvp')}>Generate MVP →</Button>}
          {project.mvp && !project.architecture && <Button variant="primary sm" onClick={() => nav('architecture')}>Design architecture →</Button>}
          {project.architecture && !project.tasks?.length && <Button variant="primary sm" onClick={() => nav('tasks')}>Generate tasks →</Button>}
          {project.tasks?.length > 0 && <Button variant="ghost sm" onClick={() => nav('tasks')}>Open task board →</Button>}
          {project.review && <Button variant="ghost sm" onClick={() => nav('demo')}>Prepare demo →</Button>}
        </div>
      </Card>
    </div>
  );
}
