import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useLang } from '../../contexts/LanguageContext.tsx'
import ScrollReveal from '../common/ScrollReveal'

export default function WhatIsCupping() {
  const { t } = useLang()
  const photo = useRef(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: photo, offset: ['start end', 'end start'] })
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [9, 0, -6])
  const rotateY = useTransform(scrollYProgress, [0, 0.45, 1], [-6, 0, 4])
  const lift = useTransform(scrollYProgress, [0, 1], [22, -22])
  return (
    <section id="whatis" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div ref={photo} className="relative" style={{ perspective: '1200px' }}>
            <motion.div
              data-scroll-scene="massage-photo"
              className="rounded-[28px] overflow-hidden shadow-card"
              style={{ aspectRatio: '4/3', rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY, y: reducedMotion ? 0 : lift }}
            >
              <img src="/images/infant-massage.jpg" alt={t('services.kids.title')} loading="lazy" decoding="async"
                className="w-full h-full object-cover" />
            </motion.div>
          </div>
          <ScrollReveal delay={0.15}>
            <h2 className="gradient-text-animated text-left mb-5">{t('whatis.title')}</h2>
            <p className="mb-4 text-secondary-soft">{t('whatis.p1')}</p>
            <p className="text-secondary-soft">{t('whatis.p2')}</p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
