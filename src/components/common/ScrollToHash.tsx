import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
export default function ScrollToHash() {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (pathname.replace(/\/+$/, '') === '/contact') { navigate('/#contact', { replace: true }); return }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash, navigate])
  return null
}
