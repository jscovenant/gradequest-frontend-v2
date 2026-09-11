import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import { ToastProvider } from './contexts/ToastContext.js'
import './styles/gradequest-ui.scss'

// Automatic recovery from outdated chunk references following new production deployments
function handleChunkLoadFailure(reason?: any) {
  try {
    const key = 'sp_chunk_reload_ts';
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    // Allow auto-refresh at most once every 10 seconds to avoid infinite loops
    if (!last || now - parseInt(last, 10) > 10000) {
      sessionStorage.setItem(key, String(now));
      console.warn('New frontend build detected or chunk load failed. Refreshing to latest version...', reason);
      window.location.reload();
    }
  } catch (e) {
    window.location.reload();
  }
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault?.();
  handleChunkLoadFailure(event);
});

window.addEventListener('error', (event) => {
  const msg = String(event?.message || '');
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk')
  ) {
    handleChunkLoadFailure(msg);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event?.reason?.message || event?.reason || '');
  if (
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('Importing a module script failed') ||
    reason.includes('error loading dynamically imported module') ||
    reason.includes('Loading chunk')
  ) {
    handleChunkLoadFailure(reason);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <ToastProvider>
    <App />
    </ToastProvider>
  </StrictMode>,
)

