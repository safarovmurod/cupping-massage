import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import './styles/index.css'
import './styles/design-tokens.css'
import './pages/mama-malish.css'

const theme = createTheme({
  palette: { primary: { main: '#8b4660' }, background: { default: '#fbf6f1', paper: '#fffdfb' }, text: { primary: '#30242e', secondary: '#62515b' } },
  typography: { fontFamily: 'Inter, sans-serif' },
  components: { MuiButton: { styleOverrides: { root: { textTransform: 'none' } } }, MuiTextField: { defaultProps: { fullWidth: true, variant: 'outlined' } } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter><LanguageProvider><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></LanguageProvider></BrowserRouter>
  </React.StrictMode>,
)
