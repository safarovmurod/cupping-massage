import { BRAND_NAME, INSTAGRAM_URL, brandCopy } from './brand.ts'
import { getMassageCatalogue } from './massage.ts'
import { LATITUDE, LONGITUDE, YANDEX_MAP_URL } from './location.ts'

export const SITE_URL = 'https://mama-i-malish-tj.pages.dev'
const copy = {
  ru: { brand: 'Мама и малыш', title: 'Мама и малыш — детский и женский массаж в Душанбе', description: 'Детский массаж с 3 месяцев, женский и баночный массаж, электрофорез и светотерапия. Цены в сомони. Запись в WhatsApp или Instagram. Зарафшон 22/1, Душанбе.', missing: 'Страница не найдена' },
  tj: { brand: 'Мама и малыш', title: 'Мама и малыш — массаж барои кӯдакон ва занон дар Душанбе', description: 'Массаж аз 3-моҳагӣ, барои занон, массажи банкагӣ, электрофорез ва светотерапия. Нархҳо бо сомонӣ. Навбатгирӣ дар WhatsApp ё Instagram. Зарафшон 22/1, Душанбе.', missing: 'Саҳифа ёфт нашуд' },
  en: { brand: 'Mama & Baby', title: 'Mama & Baby — massage for mothers and babies in Dushanbe', description: 'Baby massage from 3 months, women’s massage, cupping and physiotherapy. Prices in somoni. Book via WhatsApp or Instagram. Zarafshon 22/1, Dushanbe.', missing: 'Page not found' },
}
export function getPageMetadata(pathname: string, language = 'ru', siteUrl = SITE_URL) {
  const origin = new URL(siteUrl).origin
  const text = copy[language] || copy.ru
  const path = pathname.replace(/\/+$/, '') || '/'
  const publicPage = path === '/' || path === '/contact'
  return {
    title: publicPage ? text.title : text.missing + ' — ' + text.brand,
    description: text.description,
    canonical: publicPage ? origin + '/' : null,
    robots: publicPage ? 'index, follow' : 'noindex, nofollow',
    locale: language === 'tj' ? 'tg_TJ' : language === 'en' ? 'en_US' : 'ru_RU',
    image: origin + '/images/baby-care.webp',
  }
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}
export function renderMetadata(pathname: string, siteUrl = SITE_URL) {
  const meta = getPageMetadata(pathname, 'ru', siteUrl)
  const tags = [
    '<title>' + escapeHtml(meta.title) + '</title>',
    '<meta name="description" content="' + escapeHtml(meta.description) + '" />',
    '<meta name="robots" content="' + meta.robots + '" />',
    '<meta property="og:title" content="' + escapeHtml(meta.title) + '" />',
    '<meta property="og:description" content="' + escapeHtml(meta.description) + '" />',
    '<meta property="og:image" content="' + meta.image + '" />',
    '<meta property="og:locale" content="' + meta.locale + '" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="' + BRAND_NAME + '" />',
    '<meta property="og:image:alt" content="' + escapeHtml(meta.title) + '" />',
    '<meta property="og:image:width" content="1120" />',
    '<meta property="og:image:height" content="1400" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtml(meta.title) + '" />',
    '<meta name="twitter:description" content="' + escapeHtml(meta.description) + '" />',
    '<meta name="twitter:image" content="' + meta.image + '" />',
  ]
  if (meta.canonical) tags.push(
    '<link rel="canonical" href="' + meta.canonical + '" />', '<meta property="og:url" content="' + meta.canonical + '" />',
    '<link data-seo-image rel="preload" as="image" href="/images/baby-care.webp" imagesrcset="/images/baby-care-mobile.webp 600w, /images/baby-care.webp 1120w" imagesizes="(max-width:700px) 92vw, 46vw" fetchpriority="high" />',
    '<script id="site-schema" type="application/ld+json">' + JSON.stringify(getStructuredData(siteUrl)).replace(/</g, '\\u003c') + '</script>',
  )
  return tags.join('\n    ')
}

export function getStructuredData(siteUrl = SITE_URL) {
  const origin = new URL(siteUrl).origin
  const businessId = origin + '/#business'
  return {
    '@context': 'https://schema.org', '@type': 'HealthAndBeautyBusiness', '@id': businessId,
    name: BRAND_NAME, url: origin + '/', image: origin + '/images/baby-care.webp', telephone: '+992007336264',
    address: { '@type': 'PostalAddress', streetAddress: 'Зарафшон 22/1', addressLocality: 'Душанбе', addressCountry: 'TJ' },
    geo: { '@type': 'GeoCoordinates', latitude: LATITUDE, longitude: LONGITUDE },
    hasMap: YANDEX_MAP_URL, sameAs: [INSTAGRAM_URL],
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: 'Женский и детский массаж',
      itemListElement: getMassageCatalogue('ru').groups.map(group => ({
        '@type': 'OfferCatalog', name: group.title,
        itemListElement: group.services.map(service => ({ '@type': 'Service', name: service.title, provider: { '@id': businessId } })),
      })),
    },
    makesOffer: brandCopy.ru.prices.slice(0, 4).map(service => ({
      '@type': 'Offer', price: Number(service.price.replace(/\D/g, '')), priceCurrency: 'TJS', url: origin + '/#services',
      itemOffered: { '@type': 'Service', name: service.title, description: service.duration },
    })),
  }
}
