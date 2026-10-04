import { motion } from 'framer-motion'
import { FiSun, FiCircle, FiFeather, FiHome, FiMapPin } from 'react-icons/fi'
import { useLang } from '../../contexts/LanguageContext.tsx'
import ScrollReveal from '../common/ScrollReveal'
import { WhatsAppIcon, CheckIcon } from '../icons/Icons.tsx'
import { getWhatsAppLink } from '../layout/Header.tsx'
import { trackWhatsAppClick } from '../../lib/analytics.ts'

// Этапы одной процедуры: разогрев → банки → завершение
const steps = [
  { key: 'warmup', icon: FiSun },
  { key: 'cups', icon: FiCircle },
  { key: 'finish', icon: FiFeather },
]

export default function Services() {
  const { lang, t } = useLang()

  const handleWA = (e, type) => {
    e.preventDefault()
    trackWhatsAppClick(type)
    window.open(getWhatsAppLink(lang, type), '_blank', 'noopener,noreferrer')
  }

  return (
    <section id="services">
      <div className="container">
        <ScrollReveal className="section-title">
          <h2 className="gradient-text-animated">{t('services.title')}</h2>
          <p className="mt-3 text-lg max-w-[640px] mx-auto">{t('services.subtitle')}</p>
        </ScrollReveal>

        {/* Одна процедура: массаж + банки */}
        <ScrollReveal>
          <div className="glass-card max-w-[980px] mx-auto">
            <h3 className="text-xl font-semibold mb-2">{t('services.main.title')}</h3>
            <p className="text-sm mb-6">{t('services.main.desc')}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
              {steps.map((step, i) => (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.12, ease: [0.4, 0, 0.2, 1] }}
                  className="rounded-2xl p-5 bg-glass border border-glass-soft"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-glass-hover text-gold mb-3">
                    <step.icon className="text-[20px]" />
                  </span>
                  <h4 className="text-base font-semibold mb-1.5">{t(`services.step.${step.key}.title`)}</h4>
                  <p className="text-sm">{t(`services.step.${step.key}.desc`)}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5 border border-gold-soft bg-glass">
                <div className="flex items-center gap-2 mb-2 text-gold"><FiHome className="text-[18px]" />
                  <span className="text-sm font-semibold">{t('services.home.title')}</span>
                </div>
                <div className="gradient-text text-3xl font-bold mb-2">{t('pricing.card1.price')}</div>
                <p className="text-sm mb-4">{t('services.home.desc')}</p>
                <motion.a
                  href={getWhatsAppLink(lang, 'home')} target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  className="btn btn-primary btn-block" onClick={(e) => handleWA(e, 'home')}
                ><WhatsAppIcon size={18} /> {t('pricing.card1.btn')}</motion.a>
              </div>

              <div className="rounded-2xl p-5 border border-glass-soft bg-glass">
                <div className="flex items-center gap-2 mb-2 text-gold"><FiMapPin className="text-[18px]" />
                  <span className="text-sm font-semibold">{t('services.clinic.title')}</span>
                </div>
                <div className="gradient-text text-xl font-bold mb-2">{t('pricing.card2.price')}</div>
                <p className="text-sm mb-4">{t('services.clinic.desc')}</p>
                <motion.a
                  href={getWhatsAppLink(lang, 'clinic')} target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  className="btn btn-secondary btn-block" onClick={(e) => handleWA(e, 'clinic')}
                >{t('pricing.card2.btn')}</motion.a>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Массаж для детей */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mt-14 max-w-[980px] mx-auto">
          <ScrollReveal>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-[28px] overflow-hidden"
              style={{ aspectRatio: '4/3' }}
            >
              <img
                src="/images/child-massage.jpg"
                alt={t('services.kids.title')}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <h3 className="gradient-text-animated text-2xl font-bold mb-4">{t('services.kids.title')}</h3>
            <p className="mb-4 text-secondary-soft">{t('services.kids.desc')}</p>
            <ul className="list-none mb-5">
              {[1, 2, 3, 4].map(n => (
                <li key={n} className="py-2 text-sm flex items-start gap-2 border-b border-glass-soft last:border-b-0">
                  <span className="text-gold shrink-0"><CheckIcon width={18} height={18} /></span>
                  {t(`services.kids.f${n}`)}
                </li>
              ))}
            </ul>
            <motion.a
              href={getWhatsAppLink(lang, 'child')} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{ maxWidth: '100%', whiteSpace: 'normal', textAlign: 'center' }}
              className="btn btn-primary" onClick={(e) => handleWA(e, 'child')}
            ><WhatsAppIcon size={18} /> {t('services.kids.btn')}</motion.a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
