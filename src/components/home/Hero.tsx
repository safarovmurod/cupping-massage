import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { WhatsAppIcon } from '../icons/Icons.tsx'
import { getWhatsAppLink } from '../layout/Header.tsx'
import { trackWhatsAppClick } from '../../lib/analytics.ts'

export default function Hero() {
  const { lang, t } = useLang()
  const reducedMotion = useReducedMotion()
  const video = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoPaused, setVideoPaused] = useState(false)

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (reducedMotion || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) {
      setVideoReady(false)
      return
    }
    // Let the main text and poster render before fetching decorative video.
    const timer = window.setTimeout(() => setVideoReady(true), 1000)
    return () => window.clearTimeout(timer)
  }, [reducedMotion])

  useEffect(() => { video.current?.load() }, [videoReady])

  useEffect(() => {
    const element = video.current
    if (!element || !videoReady) return
    let visible = true
    const synchronize = () => {
      if (!visible || document.hidden || videoPaused) element.pause()
      else element.play().catch(() => { /* The poster remains if autoplay is unavailable. */ })
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; synchronize() })
    observer.observe(element)
    document.addEventListener('visibilitychange', synchronize)
    synchronize()
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', synchronize); element.pause() }
  }, [videoReady, videoPaused])

  const handleWA = (e, type) => {
    e.preventDefault()
    trackWhatsAppClick(type)
    window.open(getWhatsAppLink(lang, type), '_blank', 'noopener,noreferrer')
  }

  const titleWords = t('hero.title').split(' ')
  const titleMain = titleWords.slice(0, -1).join(' ')
  const titleAccent = titleWords.slice(-1).join(' ')

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
  }
  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
  }

  // Один файл на все устройства: на телефоне картинка чётче,
  // цена — примерно 4 МБ трафика при первом заходе.
  const videoSrc = '/video/hero-massage.mp4'

  return (
    <section
      className="hero-section relative flex items-center overflow-hidden min-h-[92svh] pt-[60px] md:pt-[110px] pb-[130px] md:pb-20"
      id="home"
    >
      {/* Фоновое видео на всю секцию */}
      <div className="absolute inset-0 z-0">
        <video
          ref={video}
          key={videoSrc}
          className="w-full h-full object-cover"
          poster="/images/hero-poster.jpg"
          autoPlay={videoReady && !videoPaused}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
        >
          {videoReady && <source src={videoSrc} type="video/mp4" />}
        </video>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(20,16,25,0.94) 0%, rgba(20,16,25,0.85) 45%, rgba(20,16,25,0.55) 100%), radial-gradient(ellipse at 75% 25%, rgba(212,168,87,0.18), transparent 55%)',
          }}
        />
      </div>

      {videoReady && <button type="button" onClick={() => setVideoPaused(paused => !paused)}
        aria-pressed={videoPaused} className="btn btn-secondary btn-sm absolute bottom-6 right-6 z-[3]">
        {t(videoPaused ? 'hero.video.play' : 'hero.video.pause')}
      </button>}

      <div className="container">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-[2] max-w-[680px] break-words"
        >
          <motion.h1
            variants={item}
            className="mb-4 font-bold leading-tight tracking-tight break-words"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', overflowWrap: 'break-word', color: '#f5ede4' }}
          >
            {titleMain} <span className="gradient-text-animated">{titleAccent}</span>
          </motion.h1>

          <motion.p variants={item} className="text-lg mb-5 max-w-[560px]" style={{ color: '#ded3c6' }}>
            {t('hero.subtitle')}
          </motion.p>

          <motion.div
            variants={item}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gold-soft rounded-full text-xs font-semibold text-gold mb-5 backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <span>♀</span><span>{t('hero.badge')}</span>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5 max-w-[680px]">
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              className="rounded-[20px] p-4 border backdrop-blur-xl"
              style={{ background: 'rgba(26,21,32,0.55)', borderColor: 'rgba(212,168,87,0.35)' }}
            >
              <h3 className="text-base font-semibold mb-1" style={{ color: '#f5ede4' }}>{t('hero.card1.title')}</h3>
              <div className="gradient-text text-2xl font-bold mb-1.5">{t('hero.card1.price')}</div>
              <p className="text-xs" style={{ color: '#c9bfb4' }}>{t('hero.card1.desc')}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              className="rounded-[20px] p-4 border backdrop-blur-xl"
              style={{ background: 'rgba(26,21,32,0.55)', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              <h3 className="text-base font-semibold mb-1" style={{ color: '#f5ede4' }}>{t('hero.card2.title')}</h3>
              <p className="text-xs" style={{ color: '#c9bfb4' }}>{t('hero.card2.desc')}</p>
            </motion.div>
          </motion.div>

          <motion.div variants={item} className="hero-actions flex flex-wrap gap-3">
            <motion.a
              href={getWhatsAppLink(lang)} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-lg" onClick={(e) => handleWA(e, 'general')}
            ><WhatsAppIcon size={20} /> {t('hero.btn.whatsapp')}</motion.a>
            <Link to="/#services" className="btn btn-secondary btn-lg">{t('hero.btn.more')}</Link>
            <Link to="/contact" className="btn btn-outline btn-lg">{t('hero.btn.address')}</Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
