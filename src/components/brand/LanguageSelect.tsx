import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import { useLang } from '../../contexts/LanguageContext.tsx'

const languages = { ru: 'Русский', tj: 'Тоҷикӣ', en: 'English' }
export default function LanguageSelect() {
  const { lang, changeLang } = useLang()
  const label = lang === 'tj' ? 'Забони сомона' : lang === 'en' ? 'Website language' : 'Язык сайта'
  return (
    <FormControl size="small" className="mm-language-select" variant="outlined">
      <Select
        value={lang}
        inputProps={{ 'aria-label': label }}
        onChange={(event) => changeLang(event.target.value)}
        IconComponent={ExpandMoreRounded}
        renderValue={(value) => (
          <span className="mm-language-value">
            <span className="mm-language-code">{String(value).toUpperCase()}</span>
            <span className="mm-language-name"> · {languages[value] || languages.ru}</span>
          </span>
        )}
        MenuProps={{ PaperProps: { sx: { background: '#fffdfb', color: '#30242e', border: '1px solid #e7d3d9', borderRadius: 2 } } }}
        sx={{
          height: 43, background: '#fffaf7', color: '#30242e', borderRadius: '12px',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cfb2bc' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b4660' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b4660', borderWidth: 2 },
          '& .MuiSvgIcon-root': { color: '#74374f' },
        }}
      >
        {Object.entries(languages).map(([code, name]) =>
          <MenuItem key={code} value={code} sx={{ color: '#30242e', minHeight: 44 }}>{code.toUpperCase()} · {name}</MenuItem>
        )}
      </Select>
    </FormControl>
  )
}
