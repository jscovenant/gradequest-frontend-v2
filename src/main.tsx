import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import { ToastProvider } from './contexts/ToastContext.js'
import './styles/gradequest-ui.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <ToastProvider>
    <App />
    </ToastProvider>
  </StrictMode>,
)
