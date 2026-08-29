import React, { useState } from 'react';
import { Card, Button, Empty } from '../components/UI.jsx';
import { api } from '../api.js';

export default function Architecture({ project, refresh, setError }) {
  const [loading, setLoading] = useState(false);
  const arch = project.architecture;

  async function gen() {
    setLoading(true);
    try {
      await api.architecture(project.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>☁️ AWS Architect</h1>
        <Button variant="primary" loading={loading} onClick={gen}>
          {arch ? 'Regenerate' : 'Design Architecture'}
        </Button>
      </div>

      {!arch ? (
        <Empty icon="☁️" title="No architecture yet">
          The AI analyzes your MVP and recommends only the AWS services you actually need.
        </Empty>
      ) : (
        <>
          <div className="grid cols-2">
            <Card>
              <h3>Data flow</h3>
              <pre className="diagram">{arch.diagram}</pre>
            </Card>
            <Card>
              <h3>At a glance</h3>
              <p className="muted">
                {arch.services.length} services · Auth: {arch.usesAuth ? 'Cognito' : 'not required'} · AI:{' '}
                {arch.usesAi ? 'Bedrock/Nova' : 'none'} · Storage: {arch.usesFiles ? 'S3' : 'DynamoDB only'}
              </p>
              <div className="pill-row">
                {arch.services.map((s) => <span className="badge" key={s.name}>{s.name}</span>)}
              </div>
            </Card>
          </div>

          <h3>Service decisions</h3>
          <div className="grid cols-2">
            {arch.services.map((s) => (
              <Card key={s.name} style={{ padding: 16 }}>
                <strong>{s.name}</strong>
                <Field k="Purpose" v={s.purpose} />
                <Field k="Why it fits" v={s.why} />
                <Field k="Alternative" v={s.alternative} />
                <Field k="Tradeoff" v={s.tradeoff} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ k, v }) {
  return (
    <div style={{ marginTop: 8 }}>
      <span className="muted" style={{ fontSize: 12 }}>{k}: </span>
      <span style={{ fontSize: 14 }}>{v}</span>
    </div>
  );
}
