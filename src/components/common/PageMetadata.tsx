import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { getPageMetadata } from '../../lib/seo.ts'

export default function PageMetadata() {
  const { pathname } = useLocation()
  const { lang } = useLang()
  useEffect(() => {
    const meta = getPageMetadata(pathname, lang, import.meta.env.VITE_PRODUCTION_ORIGIN)
    document.title = meta.title
    for (const [attribute, name, value] of [
      ['name', 'description', meta.description], ['name', 'robots', meta.robots],
      ['property', 'og:title', meta.title], ['property', 'og:description', meta.description],
      ['property', 'og:image', meta.image], ['property', 'og:url', meta.canonical],
      ['property', 'og:locale', meta.locale], ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', meta.title], ['name', 'twitter:description', meta.description], ['name', 'twitter:image', meta.image],
    ]) {
      let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
      if (!value) { element?.remove(); continue }
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, name)
        document.head.append(element)
      }
      element.setAttribute('content', value)
    }
    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!meta.canonical) canonical?.remove()
    else {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.append(canonical)
      }
      canonical.setAttribute('href', meta.canonical)
    }
  }, [pathname, lang])
  return null
}
