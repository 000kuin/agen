import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Router, Route, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import App from './App.tsx'
import Docs from './Docs.tsx'

function HashRouter({ children }: { children: React.ReactNode }) {
  return <Router hook={useHashLocation}>{children}</Router>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Switch>
        <Route path="/docs" component={Docs} />
        <Route path="/docs/:section" component={Docs} />
        <Route component={App} />
      </Switch>
    </HashRouter>
  </StrictMode>,
)
