import React, { useState } from 'react';
import { Card, Button, ScoreCard, Empty } from '../components/UI.jsx';
import { api } from '../api.js';

export default function Idea({ project, refresh, setError }) {
  const [loading, setLoading] = useState(false);
  const a = project.analysis;

  async function analyze() {
    setLoading(true);
    try {
      await api.analyze(project.id);
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
        <h1 style={{ margin: 0 }}>💡 AI Idea Analyzer</h1>
        <Button variant="primary" loading={loading} onClick={analyze}>
          {a ? 'Re-analyze' : 'Analyze Idea'}
        </Button>
      </div>

      <Card>
        <div className="muted" style={{ fontSize: 12 }}>Problem statement</div>
        <p style={{ marginTop: 4 }}>{project.problem || 'No problem statement provided.'}</p>
      </Card>

      {!a ? (
        <Empty icon="🧠" title="Not analyzed yet">
          Click “Analyze Idea” and your AI teammate will score the idea and challenge weak scope.
        </Empty>
      ) : (
        <>
          <div className="grid cols-3">
            <Card style={{ gridColumn: '1 / 2' }}>
              <ScoreCard label="Overall idea score" value={a.score.overall} />
            </Card>
            <Card style={{ gridColumn: '2 / 4' }}>
              <div className="grid cols-3">
                <ScoreCard label="Problem clarity" value={a.score.problemClarity} />
                <ScoreCard label="User value" value={a.score.userValue} />
                <ScoreCard label="Feasibility" value={a.score.technicalFeasibility} />
                <ScoreCard label="Innovation" value={a.score.innovation} />
                <ScoreCard label="Hackathon fit" value={a.score.hackathonSuitability} />
              </div>
            </Card>
          </div>

          <Card className="rec-panel">
            <h3>The AI’s honest take</h3>
            <p>{a.challenge}</p>
          </Card>

          <div className="grid cols-2">
            <Card>
              <h3>Analysis</h3>
              <Row k="Problem" v={a.problemDefinition} />
              <Row k="Target users" v={a.targetUsers} />
              <Row k="Proposed solution" v={a.proposedSolution} />
              <Row k="Unique value" v={a.uniqueValueProposition} />
              <Row k="Expected impact" v={a.expectedImpact} />
              <Row k="Complexity" v={a.technicalComplexity} />
              <Row k="Feasibility" v={a.hackathonFeasibility} />
              <Row k="Recommended MVP scope" v={a.recommendedMvpScope} />
            </Card>
            <Card>
              <h3>Pain points</h3>
              <ul className="list-clean">
                {a.painPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <h3 style={{ marginTop: 14 }}>Risks</h3>
              {a.risks.length ? (
                <ul className="list-clean">{a.risks.map((r, i) => <li key={i}>⚠️ {r}</li>)}</ul>
              ) : (
                <p className="muted">No major risks detected.</p>
              )}
              <h3 style={{ marginTop: 14 }}>Assumptions</h3>
              <ul className="list-clean">{a.assumptions.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="muted" style={{ fontSize: 12 }}>{k}</div>
      <div>{v}</div>
    </div>
  );
}
