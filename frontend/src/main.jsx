import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { API_BASE_URL } from './config.js'

// Intercept errors and console logs to send to backend for remote debugging
if (typeof window !== 'undefined') {
  const logToBackend = async (type, data) => {
    try {
      await fetch(`${API_BASE_URL}/api/debug/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, timestamp: new Date().toISOString() })
      });
    } catch (e) {
      // Ignore
    }
  };

  window.onerror = (message, source, lineno, colno, error) => {
    logToBackend('global-error', {
      message,
      source,
      lineno,
      colno,
      stack: error?.stack
    });
  };

  window.onunhandledrejection = (event) => {
    logToBackend('unhandled-rejection', {
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    });
  };

  // Intercept console.error
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError.apply(console, args);
    logToBackend('console-error', {
      args: args.map(arg => arg instanceof Error ? { message: arg.message, stack: arg.stack } : String(arg))
    });
  };
  
  // Intercept console.log for our specific debug statements
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    originalConsoleLog.apply(console, args);
    logToBackend('console-log', {
      args: args.map(arg => String(arg))
    });
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
