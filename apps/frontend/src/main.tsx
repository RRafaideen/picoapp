import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Provider } from 'react-redux'
import { AppStore } from './Store.ts'
import AppRoot from './AppRoot.tsx'
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={AppStore}>
      <BrowserRouter>
          <AppRoot />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
