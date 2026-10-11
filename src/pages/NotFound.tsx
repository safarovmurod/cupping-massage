import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLang } from '../contexts/LanguageContext.tsx'
import InstagramIcon from '@mui/icons-material/Instagram'
import { INSTAGRAM_DM_URL } from '../lib/brand.ts'

export default function NotFound() {
  const { t } = useLang()
  return (
    <section className="min-h-[90vh] flex items-center justify-center text-center">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="gradient-text-animated font-bold leading-none"
            style={{ fontSize: 'clamp(5rem, 15vw, 10rem)' }}
          >404</motion.div>
          <h1 className="text-2xl font-bold mb-3">{t('404.title')}</h1>
          <p className="mb-7">{t('404.desc')}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/" className="btn btn-primary btn-lg">{t('404.btn.home')}</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <a href={INSTAGRAM_DM_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                <InstagramIcon sx={{ fontSize: 20 }} /> {t('404.btn.whatsapp')}
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
