import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initializeCsrf } from './services/api'

const root = ReactDOM.createRoot(document.getElementById('root'))

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

const renderBootstrapError = () => {
  root.render(
    <React.StrictMode>
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        Failed to initialize application security. Refresh the page and try again.
      </div>
    </React.StrictMode>,
  )
}

initializeCsrf()
  .then(renderApp)
  .catch(renderBootstrapError)
