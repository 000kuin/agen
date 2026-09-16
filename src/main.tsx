import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Router, Route, Switch } from 'wouter'
import App from './App.tsx'
import Docs from './Docs.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Switch>
        <Route path="/docs" component={Docs} />
        <Route path="/docs/:section" component={Docs} />
        <Route component={App} />
      </Switch>
    </Router>
  </StrictMode>,
)
