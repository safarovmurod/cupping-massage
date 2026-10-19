import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { theme } from './theme.ts'
import './styles/index.css'
import './styles/design-tokens.css'
import './pages/mama-malish.css'

const root = document.getElementById('root')!
const application = (
  <React.StrictMode>
    <BrowserRouter><LanguageProvider><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></LanguageProvider></BrowserRouter>
  </React.StrictMode>
)
if (root.hasChildNodes()) ReactDOM.hydrateRoot(root, application)
else ReactDOM.createRoot(root).render(application)
