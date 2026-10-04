export const SITE_URL = 'https://massagev1-one.vercel.app'

const copy = {
  ru: {
    brand: 'Баночный массаж', home: 'Баночный массаж в Душанбе — для женщин и детей',
    description: 'Баночный массаж для женщин и детей в Душанбе. Приём в кабинете и выезд на дом. Адрес, часы работы и запись в WhatsApp.',
    contact: 'Контакты и запись — Баночный массаж в Душанбе',
    contactDescription: 'Адрес в Душанбе, часы работы и контакты. Напишите в WhatsApp или оставьте заявку на массаж для женщин и детей.',
    login: 'Вход', register: 'Регистрация', recovery: 'Восстановление пароля', reset: 'Новый пароль', admin: 'Админ-панель', missing: 'Страница не найдена',
  },
  tj: {
    brand: 'Массажи бонкагӣ', home: 'Массажи бонкагӣ дар Душанбе — барои занон ва кӯдакон',
    description: 'Массажи бонкагӣ барои занон ва кӯдакон дар Душанбе. Қабул дар кабинет ва хизмат дар хона. Суроға, соатҳои кор ва сабти ном тавассути WhatsApp.',
    contact: 'Тамос ва сабти ном — Массажи бонкагӣ дар Душанбе',
    contactDescription: 'Суроға, соатҳои кор ва роҳҳои тамос дар Душанбе. Ба WhatsApp нависед ё барои массажи занон ва кӯдакон дархост гузоред.',
    login: 'Вуруд', register: 'Бақайдгирӣ', recovery: 'Барқарор кардани парол', reset: 'Пароли нав', admin: 'Панели идоракунӣ', missing: 'Саҳифа ёфт нашуд',
  },
  en: {
    brand: 'Cupping massage', home: 'Cupping massage in Dushanbe — for women and children',
    description: 'Cupping massage for women and children in Dushanbe. Appointments at our location and home visits. Address, opening hours and WhatsApp booking.',
    contact: 'Contact and booking — Cupping massage in Dushanbe',
    contactDescription: 'Find our Dushanbe address, opening hours and contact details. Message us on WhatsApp or request a massage for women and children.',
    login: 'Sign in', register: 'Register', recovery: 'Password recovery', reset: 'New password', admin: 'Administration', missing: 'Page not found',
  },
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
    image: `${SITE_URL}/images/hero-poster.jpg`,
  }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}

// Shared by build-time HTML generation and browser navigation.
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
