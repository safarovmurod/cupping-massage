import { useState } from 'react'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

const baseSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(212,168,87,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#d4a857' },
  },
  '& .MuiInputLabel-root': { color: '#8a7f76' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#d4a857' },
}

/**
 * Поле пароля с кнопкой "показать / скрыть" (глазок).
 * Полностью заменяет <TextField type="password" />.
 *
 * Пропсы: те же, что у MUI TextField.
 *  showLabel / hideLabel — подписи для подсказки (локализуются снаружи).
 */
export default function PasswordField({
  sx = {},
  showLabel = 'Показать пароль',
  hideLabel = 'Скрыть пароль',
  ...props
}) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      sx={{ ...baseSx, ...sx }}
      InputProps={{
        ...(props.InputProps || {}),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={visible ? hideLabel : showLabel}
              aria-pressed={visible}
              aria-controls={props.id}
              type="button"
              disabled={props.disabled}
              onClick={() => setVisible(v => !v)}
              onMouseDown={e => e.preventDefault()}
              edge="end"
              sx={{
                color: visible ? '#d4a857' : '#8a7f76',
                transition: 'color 0.2s ease',
                '&:hover': { color: '#d4a857', background: 'rgba(212,168,87,0.08)' },
              }}
            >
              {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}
