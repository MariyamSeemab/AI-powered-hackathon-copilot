import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import NewProject from './pages/NewProject.jsx';
import Projects from './pages/Projects.jsx';
import Workspace from './pages/Workspace.jsx';

function TopBar() {
  const loc = useLocation();
  const onLanding = loc.pathname === '/';
  return (
    <div className="topbar">
      <div className="container topbar-inner">
        <Link to="/" className="brand">
          <span className="logo">🚀</span>
          <span>
            Hackathon <span className="grad">Copilot</span>
          </span>
        </Link>
        <div className="spacer" />
        {!onLanding && (
          <>
            <Link to="/projects" className="btn ghost sm">
              My Projects
            </Link>
            <Link to="/new" className="btn primary sm">
              + New Project
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/new" element={<NewProject />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:id/*" element={<Workspace />} />
      </Routes>
    </>
  );
}
