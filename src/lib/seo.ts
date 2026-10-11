export const SITE_URL = 'https://massagev1-one.vercel.app'
const copy = {
  ru: { brand: 'Мама и малыш', home: 'Мама и малыш — детский и женский массаж', description: 'Детский массаж с 3 месяцев, женский и баночный массаж, электрофорез и светотерапия. Цены в сомони, запись через Instagram Direct.', contact: 'Запись на массаж — Мама и малыш', contactDescription: 'Запишитесь на детский или женский массаж через Instagram Direct. Уточните свободное время и условия процедур.', login: 'Вход', register: 'Регистрация', recovery: 'Восстановление пароля', reset: 'Новый пароль', admin: 'Админ-панель', missing: 'Страница не найдена' },
  tj: { brand: 'Мама и малыш', home: 'Мама и малыш — массаж барои кӯдакон ва занон', description: 'Массажи кӯдакон аз 3-моҳагӣ, массаж барои занон, массажи банкагӣ, электрофорез ва светотерапия. Нархҳо бо сомонӣ, навбат дар Instagram Direct.', contact: 'Навбатгирӣ — Мама и малыш', contactDescription: 'Барои массажи кӯдак ё зан дар Instagram Direct навбат гиред. Вақт ва шартҳоро аниқ кунед.', login: 'Вуруд', register: 'Бақайдгирӣ', recovery: 'Барқарор кардани парол', reset: 'Пароли нав', admin: 'Панели идоракунӣ', missing: 'Саҳифа ёфт нашуд' },
  en: { brand: 'Mama & Baby', home: 'Mama & Baby — massage for mothers and babies', description: 'Baby massage from 3 months, women’s massage, cupping and physiotherapy options. Prices in somoni, booking via Instagram Direct.', contact: 'Massage bookings — Mama & Baby', contactDescription: 'Book massage for mothers and babies through Instagram Direct. Ask about availability.', login: 'Sign in', register: 'Register', recovery: 'Password recovery', reset: 'New password', admin: 'Administration', missing: 'Page not found' },
}
export function getPageMetadata(pathname: string, language = 'ru') {
  const text = copy[language] || copy.ru
  const path = pathname.replace(/\/+$/, '') || '/'
  const publicPage = path === '/' || path === '/contact'
  const privateTitle = {
    '/login': text.login, '/register': text.register,
    '/forgot-password': text.recovery, '/reset-password': text.reset,
  }[path] || (path === '/admin' || path.startsWith('/admin/') ? text.admin : text.missing)
  return {
    title: path === '/' ? text.home : path === '/contact' ? text.contact : `${privateTitle} — ${text.brand}`,
    description: path === '/contact' ? text.contactDescription : text.description,
    canonical: publicPage ? `${SITE_URL}${path}` : null,
    robots: publicPage ? 'index, follow' : 'noindex, nofollow',
    locale: language === 'tj' ? 'tg_TJ' : language === 'en' ? 'en_US' : 'ru_RU',
    image: `${SITE_URL}/images/infant-massage.jpg`,
  }
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}
export function renderMetadata(pathname: string) {
  const meta = getPageMetadata(pathname)
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="robots" content="${meta.robots}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:image" content="${meta.image}" />`,
    `<meta property="og:locale" content="${meta.locale}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${meta.image}" />`,
  ]
  if (meta.canonical) tags.push(`<link rel="canonical" href="${meta.canonical}" />`, `<meta property="og:url" content="${meta.canonical}" />`)
  return tags.join('\n    ')
}
