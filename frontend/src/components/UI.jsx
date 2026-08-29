import React from 'react';

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Button({ children, variant = '', loading, className = '', ...rest }) {
  return (
    <button className={`btn ${variant} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}

export function Badge({ kind = '', children }) {
  return <span className={`badge ${kind.toLowerCase()}`}>{children}</span>;
}

export function Progress({ value }) {
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

export function ScoreCard({ label, value }) {
  return (
    <div className="score">
      <div className="num">{value}</div>
      <div className="label">{label}</div>
      <div className="score-bar" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Toast({ message, onClose }) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="toast" role="alert" onClick={onClose}>
      {message}
    </div>
  );
}

export function Empty({ icon = '📭', title, children }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 34 }}>{icon}</div>
      <h3 style={{ margin: '10px 0 6px' }}>{title}</h3>
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  );
}
