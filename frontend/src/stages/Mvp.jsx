import React, { useState } from 'react';
import { Card, Button, Badge, Empty } from '../components/UI.jsx';
import { api } from '../api.js';

function FeatureCard({ f }) {
  return (
    <Card style={{ padding: 14 }}>
      <div className="row between">
        <strong>{f.name}</strong>
        <Badge kind={f.priority}>{f.priority}</Badge>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>{f.description}</p>
      <div className="row" style={{ gap: 8, fontSize: 12 }}>
        <span className="badge">~{f.effortHours}h</span>
        {f.aws?.map((s) => <span className="badge" key={s}>{s}</span>)}
      </div>
      {f.dependencies?.length > 0 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Depends on: {f.dependencies.join(', ')}
        </div>
      )}
    </Card>
  );
}

export default function Mvp({ project, refresh, setError }) {
  const [loading, setLoading] = useState('');
  const mvp = project.mvp;

  async function gen(reduce) {
    setLoading(reduce ? 'reduce' : 'gen');
    try {
      await api.mvp(project.id, reduce);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  }

  const groups = [
    { key: 'mustHave', title: 'Must have', kind: 'must' },
    { key: 'niceToHave', title: 'Nice to have', kind: 'nice' },
    { key: 'future', title: 'Future', kind: 'future' }
  ];

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>🎯 MVP Generator</h1>
        <div className="row">
          <Button variant="ghost" loading={loading === 'reduce'} onClick={() => gen(true)} disabled={!mvp}>
            Reduce Scope
          </Button>
          <Button variant="primary" loading={loading === 'gen'} onClick={() => gen(false)}>
            {mvp ? 'Regenerate' : 'Generate MVP'}
          </Button>
        </div>
      </div>

      {!mvp ? (
        <Empty icon="🎯" title="No MVP yet">Generate an MVP to split features into Must / Nice / Future.</Empty>
      ) : (
        <>
          <div className="grid cols-2">
            <Card className="rec-panel">
              <div className="muted">MVP scope</div>
              <div className="big-pct" style={{ fontSize: 34 }}>{mvp.summary.mustHaveCount} Must-Have Features</div>
              {mvp.reduced && <Badge kind="done">Scope reduced to smallest useful MVP</Badge>}
            </Card>
            <Card>
              <div className="muted">Estimated build time</div>
              <div className="big-pct" style={{ fontSize: 34 }}>{mvp.summary.estimatedBuildTime}</div>
            </Card>
          </div>

          {groups.map((g) =>
            mvp[g.key]?.length ? (
              <div key={g.key}>
                <h3>{g.title} <span className="muted">({mvp[g.key].length})</span></h3>
                <div className="grid cols-3">
                  {mvp[g.key].map((f) => <FeatureCard key={f.id} f={f} />)}
                </div>
              </div>
            ) : null
          )}
        </>
      )}
    </div>
  );
}
