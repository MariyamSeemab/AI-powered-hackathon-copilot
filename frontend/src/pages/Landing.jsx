import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Toast } from '../components/UI.jsx';
import { api } from '../api.js';

const JOURNEY = [
  { ic: '💡', label: 'IDEA' },
  { ic: '🎯', label: 'MVP' },
  { ic: '☁️', label: 'ARCHITECTURE' },
  { ic: '🛠️', label: 'BUILD' },
  { ic: '🧪', label: 'REVIEW' },
  { ic: '🎤', label: 'DEMO' }
];

const FEATURES = [
  { ic: '🧠', title: 'AI Idea Analyzer', text: 'Scores your idea 0–100 and challenges weak scope instead of blindly agreeing.' },
  { ic: '🎯', title: 'MVP Scoping', text: 'Splits features into Must / Nice / Future and reduces to the smallest useful MVP.' },
  { ic: '☁️', title: 'AWS Architect', text: 'Recommends only the AWS services you actually need, with tradeoffs.' },
  { ic: '🤝', title: 'AI Mentor', text: 'Tracks project state, detects scope creep, and tells you the next best action.' },
  { ic: '📊', title: 'Progress Dashboard', text: 'Live progress, blockers, remaining time, and an AI project score.' },
  { ic: '🎤', title: 'Demo & Pitch', text: 'Generates a 30s pitch, 60s demo script, and judge Q&A from your real data.' }
];

export default function Landing() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function tryDemo() {
    setLoading(true);
    setError('');
    try {
      const p = await api.createSample();
      nav(`/project/${p.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <section className="hero">
        <div className="tag">
          Hackathon <span className="grad">Copilot</span>
        </div>
        <h1>
          From raw idea to working MVP<br />
          with an <span className="grad">AI teammate</span>.
        </h1>
        <p className="sub">
          Plan smarter, make better technical decisions, stay focused on your MVP, and prepare your final demo
          with an AI teammate.
        </p>
        <div className="cta">
          <Button variant="primary" onClick={() => nav('/new')}>
            Start Building
          </Button>
          <Button variant="ghost" loading={loading} onClick={tryDemo}>
            Try Demo Project
          </Button>
        </div>
      </section>

      <div className="journey">
        {JOURNEY.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="step">
              <div style={{ fontSize: 24 }}>{s.ic}</div>
              {s.label}
            </div>
            {i < JOURNEY.length - 1 && <div className="arrow">→</div>}
          </React.Fragment>
        ))}
      </div>

      <div className="grid cols-3 features-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="feature">
            <div className="ic">{f.ic}</div>
            <h4>{f.title}</h4>
            <p>{f.text}</p>
          </Card>
        ))}
      </div>

      <Toast message={error} onClose={() => setError('')} />
    </div>
  );
}
