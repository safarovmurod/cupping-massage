import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: { primary: { main: '#8b4660' }, background: { default: '#fbf6f1', paper: '#fffdfb' }, text: { primary: '#30242e', secondary: '#62515b' } },
  typography: { fontFamily: 'Inter, sans-serif' },
  components: { MuiButton: { styleOverrides: { root: { textTransform: 'none' } } }, MuiTextField: { defaultProps: { fullWidth: true, variant: 'outlined' } } },
})
