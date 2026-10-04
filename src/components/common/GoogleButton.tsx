import { useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { GoogleIcon } from '../icons/Icons.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'

// Кнопка «Продолжить с Google» для страниц входа и регистрации.
export default function GoogleButton({ label, onError }) {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await signInWithGoogle()
      // Дальше Supabase сам уводит на страницу Google
    } catch (err) {
      setLoading(false)
      if (onError) onError(err)
    }
  }

  return (
    <Button
      aria-label={label}
      aria-busy={loading}
      fullWidth
      onClick={handleClick}
      disabled={loading}
      startIcon={loading ? null : <GoogleIcon size={20} />}
      sx={{
        background: '#ffffff',
        color: '#3c4043',
        fontWeight: 600,
        textTransform: 'none',
        borderRadius: '999px',
        py: 1.35,
        border: '1px solid #dadce0',
        '&:hover': { background: '#f5f5f5', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' },
        '&.Mui-disabled': { background: 'rgba(255,255,255,0.7)', color: '#8a7f76' },
      }}
    >
      {loading ? <CircularProgress size={20} sx={{ color: '#8a7f76' }} /> : label}
    </Button>
  )
}
