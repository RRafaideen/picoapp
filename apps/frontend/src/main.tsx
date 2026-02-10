import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import AppRoot from './AppRoot.tsx'
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
        <AppRoot />
    </BrowserRouter>
  </StrictMode>,
)
