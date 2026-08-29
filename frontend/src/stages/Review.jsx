import React, { useState } from 'react';
import { Card, Button, ScoreCard, Empty } from '../components/UI.jsx';
import { api } from '../api.js';

export default function Review({ project, refresh, setError }) {
  const [loading, setLoading] = useState(false);
  const review = project.review;

  async function run() {
    setLoading(true);
    try {
      await api.review(project.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const s = review?.scores;

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>🧪 AI Project Review</h1>
        <Button variant="primary" loading={loading} onClick={run}>
          {review ? 'Re-review' : 'Review My Project'}
        </Button>
      </div>

      {!review ? (
        <Empty icon="🧪" title="Not reviewed yet">
          Get scored on functionality, architecture, security, UX, innovation, and more.
        </Empty>
      ) : (
        <>
          <Card className="rec-panel">
            <div className="row between">
              <div>
                <div className="muted">Overall score</div>
                <div className="big-pct">{s.overall}</div>
              </div>
              <div className="muted" style={{ maxWidth: 360, textAlign: 'right' }}>
                A blended score across functionality, architecture, security, scalability, UX, innovation, and docs.
              </div>
            </div>
          </Card>

          <div className="grid cols-4">
            <Card><ScoreCard label="Functionality" value={s.functionality} /></Card>
            <Card><ScoreCard label="Architecture" value={s.architecture} /></Card>
            <Card><ScoreCard label="Security" value={s.security} /></Card>
            <Card><ScoreCard label="Scalability" value={s.scalability} /></Card>
            <Card><ScoreCard label="UX" value={s.ux} /></Card>
            <Card><ScoreCard label="Innovation" value={s.innovation} /></Card>
            <Card><ScoreCard label="Documentation" value={s.documentation} /></Card>
          </div>

          <Card>
            <h3>Top 5 improvements</h3>
            <div className="stack">
              {review.topImprovements.map((imp, i) => (
                <div key={i} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <span className="badge">#{imp.priority}</span>
                  <div>
                    <strong>{imp.area}</strong>
                    <div className="muted" style={{ fontSize: 14 }}>{imp.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
