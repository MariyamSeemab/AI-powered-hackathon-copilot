import React, { useState } from 'react';
import { Card, Button, Empty } from '../components/UI.jsx';
import { api } from '../api.js';

export default function Demo({ project, refresh, setError }) {
  const [loading, setLoading] = useState('');
  const demo = project.demo;
  const pitch = project.pitch;

  async function prepare() {
    setLoading('demo');
    try {
      await api.demo(project.id);
      await api.pitch(project.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>🎤 Demo & Pitch Generator</h1>
        <Button variant="primary" loading={loading === 'demo'} onClick={prepare}>
          {demo ? 'Regenerate' : 'Prepare My Demo'}
        </Button>
      </div>

      {!demo ? (
        <Empty icon="🎤" title="No demo material yet">
          Generate a 30s pitch, 60s demo script, 3-min presentation, and judge Q&A — all from your real project data.
        </Empty>
      ) : (
        <>
          <div className="grid cols-2">
            <Card className="rec-panel">
              <h3>30-second pitch</h3>
              <p>{demo.pitch30}</p>
            </Card>
            <Card>
              <h3>60-second demo script</h3>
              <ol className="list-clean">{demo.demoScript60.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </Card>
          </div>

          <Card>
            <h3>3-minute presentation</h3>
            <div className="grid cols-2">
              {demo.presentation3min.map((p, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div className="muted" style={{ fontSize: 12 }}>{p.section}</div>
                  <div>{p.content}</div>
                </div>
              ))}
            </div>
          </Card>

          {pitch && (
            <Card>
              <h3>Final pitch flow</h3>
              <div className="grid cols-2">
                <PitchRow k="Problem" v={pitch.problem} />
                <PitchRow k="Why it matters" v={pitch.whyItMatters} />
                <PitchRow k="Solution" v={pitch.solution} />
                <PitchRow k="How it works" v={pitch.howItWorks} />
                <PitchRow k="AI capability" v={pitch.aiCapability} />
                <PitchRow k="AWS architecture" v={pitch.awsArchitecture} />
                <PitchRow k="Impact" v={pitch.impact} />
                <PitchRow k="Future" v={pitch.future} />
              </div>
            </Card>
          )}

          <div className="grid cols-3">
            <Card>
              <h3>Technical challenges</h3>
              <ul className="list-clean">{demo.technicalChallenges.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </Card>
            <Card>
              <h3>Lessons learned</h3>
              <ul className="list-clean">{demo.lessonsLearned.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </Card>
            <Card>
              <h3>Future improvements</h3>
              <ul className="list-clean">{demo.futureImprovements.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </Card>
          </div>

          <Card>
            <h3>Likely judge questions</h3>
            <div className="stack">
              {demo.judgeQuestions.map((q, i) => (
                <div key={i} className="card" style={{ padding: 12 }}>
                  <strong>Q: {q.q}</strong>
                  <div className="muted" style={{ marginTop: 4 }}>A: {q.a}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ textAlign: 'center' }}>
            <div className="tag" style={{ fontSize: 22, fontWeight: 800 }}>
              “From idea to MVP with an <span className="grad">AI teammate</span>.”
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function PitchRow({ k, v }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="muted" style={{ fontSize: 12 }}>{k}</div>
      <div>{v}</div>
    </div>
  );
}
