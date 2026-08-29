import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Toast } from '../components/UI.jsx';
import { api } from '../api.js';

const FIELDS = [
  { key: 'name', label: 'Project name', placeholder: 'CampusConnect', required: true },
  { key: 'problem', label: 'Problem statement', textarea: true, required: true, placeholder: 'College students struggle to discover internships, hackathons, events, and learning opportunities.' },
  { key: 'targetUsers', label: 'Target users', placeholder: 'Undergraduate college students' },
  { key: 'teamSize', label: 'Team size', placeholder: '2' },
  { key: 'availableTime', label: 'Available time', placeholder: '24 hours' },
  { key: 'technicalSkills', label: 'Technical skills', placeholder: 'React, Node.js, some AWS' },
  { key: 'preferredLanguage', label: 'Preferred language', placeholder: 'JavaScript' },
  { key: 'preferredTech', label: 'Preferred technologies', placeholder: 'React, Node.js' },
  { key: 'preferredAws', label: 'Preferred AWS services', placeholder: 'Lambda, DynamoDB, Bedrock' },
  { key: 'theme', label: 'Hackathon theme', placeholder: 'Education / Student productivity' }
];

export default function NewProject() {
  const nav = useNavigate();
  const [form, setForm] = useState({ availableTime: '24 hours' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError('Project name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const p = await api.createProject(form);
      nav(`/project/${p.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 820, paddingTop: 26, paddingBottom: 60 }}>
      <h1 style={{ marginBottom: 6 }}>Create a project</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Tell your AI teammate about your idea. It will analyze scope, design the architecture, and build a plan.
      </p>
      <Card>
        <form onSubmit={submit}>
          <div className="grid cols-2">
            {FIELDS.map((f) => (
              <label className="field" key={f.key} style={f.textarea ? { gridColumn: '1 / -1' } : undefined}>
                <span>
                  {f.label} {f.required && <em style={{ color: 'var(--danger)', fontStyle: 'normal' }}>*</em>}
                </span>
                {f.textarea ? (
                  <textarea
                    value={form[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    value={form[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="row between" style={{ marginTop: 10 }}>
            <Button type="button" variant="ghost" onClick={() => nav('/')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Create & Analyze
            </Button>
          </div>
        </form>
      </Card>
      <Toast message={error} onClose={() => setError('')} />
    </div>
  );
}
