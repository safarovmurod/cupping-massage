import { useEffect, useState } from 'react'
import HomeRounded from '@mui/icons-material/HomeRounded'
import SpaRounded from '@mui/icons-material/SpaRounded'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import PlaceRounded from '@mui/icons-material/PlaceRounded'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { siteCopy } from '../../lib/site-copy.ts'
import useBrandCopy from '../../hooks/useBrandCopy.ts'

export default function MobileNav() {
  const { lang } = useLang()
  const copy = useBrandCopy()
  const text = siteCopy[lang]
  const [active, setActive] = useState('home')
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
    }, { rootMargin: '-15% 0px -65% 0px' })
    for (const id of ['home', 'services', 'contact', 'location']) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])
  const links = [
    { id: 'home', label: copy.nav[0], Icon: HomeRounded },
    { id: 'services', label: copy.nav[1], Icon: SpaRounded },
    { id: 'contact', label: text.bookingNav, Icon: CalendarMonthRounded },
    { id: 'location', label: text.locationNav, Icon: PlaceRounded },
  ]
  return <nav className="mm-bottom-nav" aria-label={text.mobileNav}>
    {links.map(({ id, label, Icon }) => <a href={'#' + id} key={id} aria-current={active === id ? 'location' : undefined}><Icon aria-hidden="true" /><span>{label}</span></a>)}
  </nav>
}
