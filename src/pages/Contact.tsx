import { Link } from 'react-router-dom'
import { useLang } from '../contexts/LanguageContext.tsx'
import { INSTAGRAM_DM_URL, INSTAGRAM_URL, INSTAGRAM_HANDLE, getBrandCopy } from '../lib/brand.ts'
import './mama-malish.css'

export default function Contact() {
  const { lang } = useLang()
  const copy = getBrandCopy(lang)
  return (
    <div className="mm-site mm-contact-page">
      <section className="mm-section" aria-labelledby="mm-contact-page-title">
        <div className="mm-shell mm-contact-panel">
          <div>
            <span className="mm-kicker">{INSTAGRAM_HANDLE}</span>
            <h1 id="mm-contact-page-title">{copy.contactTitle}</h1>
            <p>{copy.contactLead}</p>
            <ol className="mm-contact-steps">{copy.bookingSteps.map(step => <li key={step}>{step}</li>)}</ol>
            <p className="mm-small-copy">{copy.contactsNote}</p>
          </div>
          <div className="mm-contact-actions">
            <a className="mm-btn mm-btn-primary" href={INSTAGRAM_DM_URL} target="_blank" rel="noopener noreferrer">{copy.instagramButton} ↗</a>
            <a className="mm-btn mm-btn-outline" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{copy.profileButton}</a>
            <Link className="mm-btn mm-btn-ghost" to="/#services">{copy.heroSecondary}</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
