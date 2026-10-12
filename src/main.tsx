import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// MedPath Design System
import '../css/tokens.css';
import '../css/base.css';
import '../css/components.css';
import '../css/layout.css';
import '../css/views.css';
import '../css/ui2.css';

const container = document.getElementById('root') || document.getElementById('app-root');

if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
