import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import './styles/index.css'
import './styles/design-tokens.css'

const muiDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#be7994', light: '#e4b5c3' },
    secondary: { main: '#b96988' },
    background: {
      default: '#1a1520',
      paper: 'rgba(42,34,53,0.6)',
    },
    text: {
      primary: '#f5ede4',
      secondary: '#c4b8ab',
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(42,34,53,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none' } },
      defaultProps: {
        disableElevation: true,
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <MuiThemeProvider theme={muiDarkTheme}>
              <CssBaseline />
              <App />
            </MuiThemeProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>
)
