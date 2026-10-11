import { Link, useLocation } from 'react-router-dom'
import HomeOutlined from '@mui/icons-material/HomeOutlined'
import SpaOutlined from '@mui/icons-material/SpaOutlined'
import WhatsApp from '@mui/icons-material/WhatsApp'
import Instagram from '@mui/icons-material/Instagram'
import { INSTAGRAM_DM_URL } from '../../lib/brand.ts'
import { useLang } from '../../contexts/LanguageContext.tsx'
import '../../pages/dock.css'

export default function MobileBottomBar() {
 const {lang}=useLang()
 const location=useLocation()
 const text=lang==='tj'?['Асосӣ','Хизматҳо','Навбат','Instagram']:lang==='en'?['Home','Services','Book','Instagram']:['Главная','Услуги','Запись','Instagram']
 return <nav className="mm-mobile-dock" aria-label={lang==='tj'?'Роҳнамои мобилӣ':lang==='en'?'Mobile navigation':'Мобильное меню'}>
   <Link to="/" aria-current={location.pathname==='/'?'page':undefined}><HomeOutlined aria-hidden="true"/><span>{text[0]}</span></Link>
   <Link to="/services" aria-current={location.pathname==='/services'?'page':undefined}><SpaOutlined aria-hidden="true"/><span>{text[1]}</span></Link>
   <Link to="/booking" className="mm-dock-primary" aria-current={location.pathname==='/booking'?'page':undefined}><WhatsApp aria-hidden="true"/><span>{text[2]}</span></Link>
   <a href={INSTAGRAM_DM_URL} target="_blank" rel="noopener noreferrer"><Instagram aria-hidden="true"/><span>{text[3]}</span></a>
 </nav>
}