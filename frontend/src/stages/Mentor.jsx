import React, { useState } from 'react';
import { Card, Button } from '../components/UI.jsx';
import { api } from '../api.js';

const SUGGESTIONS = [
  'I want to add 10 more features.',
  'Should I add a mobile app now?',
  'I am stuck on a bug, what should I do?',
  'What should I work on next?'
];

export default function Mentor({ project, refresh, setError }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);

  async function ask(q) {
    const text = q ?? question;
    setLoading(true);
    try {
      const res = await api.mentor(project.id, text);
      setAnswer(res);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>🤝 AI Hackathon Mentor</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Your mentor reads the current project state — progress, open tasks, time left — and pushes you toward shipping.
        It won’t blindly agree.
      </p>

      <Card>
        <label className="field">
          <span>Ask your mentor</span>
          <textarea
            value={question}
            placeholder="e.g. Should I add a mobile app now?"
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <div className="row between">
          <div className="pill-row">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn ghost sm" onClick={() => { setQuestion(s); ask(s); }}>
                {s}
              </button>
            ))}
          </div>
          <Button variant="primary" loading={loading} onClick={() => ask()} disabled={!question.trim()}>
            Ask Mentor
          </Button>
        </div>
      </Card>

      {answer && (
        <Card className="rec-panel">
          <h3>Mentor response</h3>
          {answer.question && <p className="muted">“{answer.question}”</p>}
          <div className="k">Observe</div><div>{answer.observe}</div>
          <div className="k">Analyze</div><div>{answer.analyze}</div>
          <div className="k">Problem</div><div>{answer.problem}</div>
          <div className="k">Recommendation</div><div style={{ fontWeight: 600 }}>{answer.recommendation}</div>
          <div className="k">Next best action</div><div style={{ fontWeight: 700 }}>{answer.nextBestAction}</div>
        </Card>
      )}

      {project.mentorLog?.length > 0 && (
        <Card>
          <h3>Recent mentor history</h3>
          <div className="stack">
            {[...project.mentorLog].reverse().slice(0, 5).map((m, i) => (
              <div key={i} className="card" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>“{m.question || '(status check)'}”</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{m.response.recommendation}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
