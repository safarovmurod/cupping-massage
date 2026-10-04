import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiLogIn, FiUserPlus, FiGrid, FiLogOut } from 'react-icons/fi'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { useTheme } from '../../contexts/ThemeContext.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { LogoIcon, SunIcon, MoonIcon, MenuIcon, CloseIcon, WhatsAppIcon } from '../icons/Icons.tsx'
import { trackWhatsAppClick, trackLanguageChange } from '../../lib/analytics.ts'

const WA_NUMBER = '992007336264'

export function getWhatsAppLink(lang, type = 'general') {
  const messages = {
    ru: { general: 'Здравствуйте! Я хочу узнать подробнее о баночном массаже и записаться на процедуру.', home: 'Меня интересует баночный массаж с выездом на дом.', clinic: 'Меня интересует баночный массаж по вашему адресу.', child: 'Меня интересует массаж для ребёнка.' },
    tj: { general: 'Салом! Ман мехоҳам дар бораи массажи бонкагӣ маълумот гирам ва нависам.', home: 'Ман массажи бонкагӣ бо омадан ба хонаро мехоҳам.', clinic: 'Ман массажи бонкагӣ дар суроғаи шуморо мехоҳам.', child: 'Ман массаж барои кӯдакро мехоҳам.' },
    en: { general: 'Hello! I would like to know more about cupping massage and book an appointment.', home: 'I am interested in cupping massage with a home visit.', clinic: 'I am interested in cupping massage at your location.', child: 'I am interested in massage for a child.' }
  }
  let msg = messages[lang]?.general || messages.ru.general
  if (type === 'home') msg += ' ' + (messages[lang]?.home || messages.ru.home)
  if (type === 'clinic') msg += ' ' + (messages[lang]?.clinic || messages.ru.clinic)
  if (type === 'child') msg += ' ' + (messages[lang]?.child || messages.ru.child)
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

// Фото профиля, а если его нет — первая буква имени на золотом круге
function Avatar({ photo, letter, size = 32 }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        className="rounded-full object-cover shrink-0 border border-gold-soft"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0 text-white font-bold bg-gradient-gold"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {letter}
    </span>
  )
}

export default function Header() {
  const { lang, changeLang, t } = useLang()
  const { theme, toggleTheme } = useTheme()
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => { setMenuOpen(false); setAccountOpen(false) }, [location])

  const isAdmin = profile?.role === 'admin'
  // Google кладёт имя и фото в user_metadata
  const accountName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    ''
  const accountPhoto = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const accountLetter = (accountName || user?.email || '?').charAt(0).toUpperCase()

  async function handleSignOut() {
    setAccountOpen(false)
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  const handleLangChange = (newLang) => {
    trackLanguageChange(lang, newLang)
    changeLang(newLang)
  }
  const handleWA = (e, type) => {
    e.preventDefault()
    trackWhatsAppClick(type)
    window.open(getWhatsAppLink(lang, type), '_blank', 'noopener,noreferrer')
  }
  const langs = ['ru', 'tj', 'en']

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="hidden lg:block sticky top-0 z-[1000] backdrop-blur-xl border-b border-gold-soft"
        style={{ background: 'var(--header-bg)' }}
      >
        <div className="flex items-center justify-between px-6 max-w-[1280px] mx-auto gap-3 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <LogoIcon size={34} />
            <span className="text-lg font-bold text-primary-soft whitespace-nowrap">{t('brand.name')}</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {isAdmin && profile?.is_active === true && <Link to="/admin" className="btn btn-primary btn-sm"><FiGrid /> Админ-панель</Link>}
            <div className="flex gap-1">
              {langs.map(l => (
                <motion.button key={l} whileTap={{ scale: 0.9 }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 border border-glass-soft
                    ${lang === l ? 'bg-gradient-gold text-white border-transparent' : 'bg-glass text-muted-soft hover:text-primary-soft hover:bg-glass-hover'}`}
                  onClick={() => handleLangChange(l)}>{l.toUpperCase()}</motion.button>
              ))}
            </div>
            <motion.button whileHover={{ rotate: 15 }} whileTap={{ scale: 0.9 }}
              onClick={toggleTheme} aria-label={t('a11y.theme')}
              className="rounded-full bg-glass border border-glass-soft flex items-center justify-center text-primary-soft transition-all shrink-0"
              style={{ width: 38, height: 38 }}
            >
              {theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
            </motion.button>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  aria-expanded={accountOpen}
                  aria-controls={accountOpen ? 'account-menu' : undefined}
                  className="flex items-center gap-2 text-sm font-semibold pl-1.5 pr-3.5 py-1.5 rounded-full border border-glass-soft text-primary-soft hover:bg-glass transition-all max-w-[210px]"
                >
                  <Avatar photo={accountPhoto} letter={accountLetter} size={30} />
                  <span className="truncate">{accountName}</span>
                </button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      id="account-menu"
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-[48px] min-w-[190px] p-1.5 rounded-2xl border border-glass-soft z-[1002]"
                      style={{ background: 'var(--bg-secondary)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}
                    >
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-secondary-soft hover:bg-glass hover:text-primary-soft transition-all">
                          <FiGrid className="text-[17px]" /> {t('nav.admin')}
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-secondary-soft hover:bg-glass hover:text-primary-soft transition-all"
                      >
                        <FiLogOut className="text-[17px]" /> {t('nav.logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Link to="/login" className="text-sm font-semibold px-3.5 py-2 rounded-xl border border-glass-soft text-secondary-soft hover:text-primary-soft hover:bg-glass transition-all">{t('nav.login')}</Link>
                <Link to="/register" className="text-sm font-semibold px-3.5 py-2 rounded-xl bg-glass text-gold hover:bg-glass-hover transition-all">{t('nav.register')}</Link>
              </div>
            )}
            <motion.a href={getWhatsAppLink(lang)} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-sm" onClick={(e) => handleWA(e, 'general')}
            ><WhatsAppIcon size={18} /> {t('header.whatsapp')}</motion.a>
          </div>

          <div className="md:hidden flex items-center gap-2">
            {user && <Avatar photo={accountPhoto} letter={accountLetter} size={30} />}
          <button className="flex flex-col p-2 z-[1001] text-primary-soft" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
          </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-[998] md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)} />
            <motion.div className="fixed top-0 right-0 w-full max-w-[320px] h-screen z-[999] flex flex-col px-5 pt-[80px] pb-5 md:hidden"
              style={{ background: 'var(--bg-secondary)', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            >
              <motion.div className="flex justify-center gap-1.5 mb-5"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              >
                {langs.map(l => (
                  <button key={l} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-glass-soft
                    ${lang === l ? 'bg-gradient-gold text-white border-transparent' : 'bg-glass text-muted-soft hover:text-primary-soft'}`}
                    onClick={() => handleLangChange(l)}>{l.toUpperCase()}</button>
                ))}
              </motion.div>

              <motion.div className="flex flex-col gap-2.5"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              >
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-glass border border-glass-soft">
                      <Avatar photo={accountPhoto} letter={accountLetter} size={40} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-primary-soft truncate">{accountName}</div>
                        <div className="text-xs text-muted-soft truncate">{user.email}</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Link to="/admin" className="btn btn-secondary btn-block flex items-center justify-center gap-2">
                        <FiGrid className="text-[20px]" /> {t('nav.admin')}
                      </Link>
                    )}
                    <button onClick={handleSignOut} className="btn btn-secondary btn-block flex items-center justify-center gap-2">
                      <FiLogOut className="text-[20px]" /> {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn btn-secondary btn-block flex items-center justify-center gap-2">
                      <FiLogIn className="text-[20px]" /> {t('nav.login')}
                    </Link>
                    <Link to="/register" className="btn btn-secondary btn-block flex items-center justify-center gap-2">
                      <FiUserPlus className="text-[20px]" /> {t('nav.register')}
                    </Link>
                  </>
                )}
                <a href={getWhatsAppLink(lang)} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary btn-block flex items-center justify-center gap-2"
                  onClick={(e) => handleWA(e, 'general')}
                >
                  <WhatsAppIcon size={18} /> {t('header.whatsapp')}
                </a>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
