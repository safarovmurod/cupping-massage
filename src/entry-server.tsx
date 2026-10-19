import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { theme } from './theme.ts'
import App from './App.tsx'

export function render(pathname: string) {
  return renderToString(<StaticRouter location={pathname}><LanguageProvider><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></LanguageProvider></StaticRouter>)
}
