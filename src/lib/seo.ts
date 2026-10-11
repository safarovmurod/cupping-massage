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
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtml(meta.title) + '" />',
    '<meta name="twitter:description" content="' + escapeHtml(meta.description) + '" />',
    '<meta name="twitter:image" content="' + meta.image + '" />',
  ]
  if (meta.canonical) tags.push('<link rel="canonical" href="' + meta.canonical + '" />', '<meta property="og:url" content="' + meta.canonical + '" />')
  return tags.join('\n    ')
}
