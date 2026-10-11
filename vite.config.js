import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveSupabaseConfig } from './src/lib/supabaseConfig.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Prevent a cloud Preview build with inherited Production secrets.
  if ((process.env.VERCEL_ENV === 'preview' || process.env.CONTEXT === 'deploy-preview')
      && env.VITE_DEPLOY_STAGE !== 'preview') {
    throw new Error('Preview builds require VITE_DEPLOY_STAGE=preview and a dedicated staging Supabase project.')
  }
  if (env.VITE_DEPLOY_STAGE === 'production'
      && ((process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')
          || (process.env.CONTEXT && process.env.CONTEXT !== 'production'))) {
    throw new Error('A non-production hosting context cannot build with the production Supabase stage.')
  }
  if (env.VITE_DEPLOY_STAGE === 'ci-mock' && process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('ci-mock may only be built by the controlled GitHub Actions job.')
  }
  resolveSupabaseConfig({
    stage: env.VITE_DEPLOY_STAGE,
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
    productionOrigin: env.VITE_PRODUCTION_ORIGIN,
  })
  return {
  plugins: [react()],
  base: '/',
  // Prebundle lazy-route UI dependencies to avoid a dev-server reload on first use.
  optimizeDeps: {
    include: [
      '@mui/icons-material/AdminPanelSettingsRounded',
      '@mui/icons-material/ArrowForwardRounded',
      '@mui/icons-material/CleaningServices',
      '@mui/icons-material/Close',
      '@mui/icons-material/CloseRounded',
      '@mui/icons-material/ContentCopy',
      '@mui/icons-material/DarkModeRounded',
      '@mui/icons-material/Delete',
      '@mui/icons-material/DeleteOutline',
      '@mui/icons-material/ExpandMore',
      '@mui/icons-material/HomeRounded',
      '@mui/icons-material/Language',
      '@mui/icons-material/LightModeRounded',
      '@mui/icons-material/LockReset',
      '@mui/icons-material/Logout',
      '@mui/icons-material/LogoutRounded',
      '@mui/icons-material/Menu',
      '@mui/icons-material/MenuRounded',
      '@mui/icons-material/OpenInNew',
      '@mui/icons-material/Refresh',
      '@mui/icons-material/Restore',
      '@mui/icons-material/Search',
      '@mui/icons-material/SpaRounded',
      '@mui/icons-material/Visibility',
      '@mui/icons-material/VisibilityOff',
      '@mui/icons-material/VpnKey',
      '@mui/icons-material/WhatsApp',
      '@mui/material/Accordion',
      '@mui/material/AccordionDetails',
      '@mui/material/AccordionSummary',
      '@mui/material/Alert',
      '@mui/material/AppBar',
      '@mui/material/Avatar',
      '@mui/material/Box',
      '@mui/material/Button',
      '@mui/material/Card',
      '@mui/material/CardContent',
      '@mui/material/Chip',
      '@mui/material/CircularProgress',
      '@mui/material/CssBaseline',
      '@mui/material/Dialog',
      '@mui/material/DialogActions',
      '@mui/material/DialogContent',
      '@mui/material/DialogTitle',
      '@mui/material/Divider',
      '@mui/material/Drawer',
      '@mui/material/FormControlLabel',
      '@mui/material/Grid',
      '@mui/material/IconButton',
      '@mui/material/InputAdornment',
      '@mui/material/List',
      '@mui/material/ListItemButton',
      '@mui/material/ListItemIcon',
      '@mui/material/ListItemText',
      '@mui/material/MenuItem',
      '@mui/material/Paper',
      '@mui/material/Select',
      '@mui/material/Snackbar',
      '@mui/material/Stack',
      '@mui/material/Switch',
      '@mui/material/Tab',
      '@mui/material/Table',
      '@mui/material/TableBody',
      '@mui/material/TableCell',
      '@mui/material/TableContainer',
      '@mui/material/TableHead',
      '@mui/material/TableRow',
      '@mui/material/Tabs',
      '@mui/material/TextField',
      '@mui/material/Toolbar',
      '@mui/material/Tooltip',
      '@mui/material/Typography',
      '@mui/material/styles',
    ],
  },
  build: { outDir: 'dist', sourcemap: false },
  }
})
