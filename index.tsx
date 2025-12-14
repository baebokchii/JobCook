import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log('Initializing JobCook application...');

const rootElement = document.getElementById('root');

if (!rootElement) {
  const err = "Could not find root element to mount to";
  console.error(err);
  document.body.innerHTML = `<div style="color:red; padding: 20px;">${err}</div>`;
  throw new Error(err);
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('React app mounted successfully.');
} catch (error) {
  console.error("Failed to mount React app:", error);
  rootElement.innerHTML = `<div style="color:red; padding: 20px;">
    <h2>Failed to load application</h2>
    <pre>${error instanceof Error ? error.message : String(error)}</pre>
  </div>`;
}