import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import { motion } from 'framer-motion'
import { useLang } from '../../contexts/LanguageContext.tsx'
import ScrollReveal from '../common/ScrollReveal'
import { ShieldIcon } from '../icons/Icons.tsx'

export default function Contraindications() {
  const { t } = useLang()
  const items = [1, 2, 3, 4, 5, 6, 7]

  return (
    <section id="contra">
      <div className="container">
        <ScrollReveal className="section-title">
          <h2 className="gradient-text-animated">{t('contra.title')}</h2>
          <p className="mt-3 text-lg max-w-[600px] mx-auto">{t('contra.subtitle')}</p>
        </ScrollReveal>
        <ScrollReveal>
          <motion.div
            whileHover={{ scale: 1.005 }}
            className="rounded-[28px] p-5 sm:p-10 border border-gold-soft"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* На телефоне иконка сверху: иначе текст остаётся в узкой колонке
                и переносится по два слова */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <motion.div whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-12 h-12 rounded-full flex items-center justify-center text-orange-400 shrink-0"
                style={{ background: 'rgba(232,145,90,0.15)' }}
              >
                <ShieldIcon width={26} height={26} />
              </motion.div>
              <h3 className="text-lg font-semibold">{t('contra.header')}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
              {items.map((n, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="px-3.5 py-2.5 rounded-xl bg-glass text-sm text-secondary-soft"
                ><WarningAmberRounded aria-hidden="true" sx={{ fontSize: 17, verticalAlign: 'middle', mr: 0.5 }} /> {t(`contra.${n}`)}</motion.div>
              ))}
            </div>
            <div className="px-4 py-3.5 rounded-xl text-sm mb-3.5 border-l-[3px] border-orange-400"
              style={{ background: 'rgba(232,145,90,0.1)' }}>{t('contra.warning')}</div>
            <div className="px-4 py-3.5 rounded-xl text-sm border-l-[3px] border-gold"
              style={{ background: 'rgba(212,168,87,0.1)' }}>{t('contra.children')}</div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  )
}
