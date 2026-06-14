import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept fetch calls when running via file:// protocol in Electron
if (typeof window !== "undefined" && window.location.protocol === "file:") {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === "string" && input.startsWith("/api/")) {
      input = "http://localhost:3000" + input;
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
