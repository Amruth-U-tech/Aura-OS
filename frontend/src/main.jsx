import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppStateProvider } from './state/AppStateContext'
import { ThemeProvider } from './themes/ThemeProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppStateProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AppStateProvider>
  </StrictMode>,
)
