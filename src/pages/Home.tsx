import { useState } from 'react'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded'
import ServiceIcon from '../components/brand/ServiceIcon.tsx'
import { useLang } from '../contexts/LanguageContext.tsx'
import { BRAND_NAME, INSTAGRAM_DM_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL, getBrandCopy } from '../lib/brand.ts'
import './mama-malish.css'

const DM = ({ children, className = '', ...props }) => (
  <a href={INSTAGRAM_DM_URL} target="_blank" rel="noopener noreferrer" className={className} {...props}>{children}</a>
)

export default function Home() {
  const { lang } = useLang()
  const copy = getBrandCopy(lang)
  const [activeFaq, setActiveFaq] = useState<number | null>(0)
  return (
    <div className="mm-site">
      <section className="mm-hero" id="home" aria-labelledby="mm-heading">
        <div className="mm-shell mm-hero-layout">
          <div className="mm-hero-text">
            <div className="mm-eyebrow"><span className="mm-dot" /> {copy.eyebrow}</div>
            <h1 id="mm-heading">{copy.heroTitle}</h1>
            <p className="mm-hero-subtitle">{copy.heroLead}</p>
            <div className="mm-actions">
              <DM className="mm-btn mm-btn-primary">{copy.heroPrimary} <ArrowOutwardRounded aria-hidden="true" fontSize="small" /></DM>
              <a className="mm-btn mm-btn-ghost" href="#services">{copy.heroSecondary} <ArrowDownwardRounded aria-hidden="true" fontSize="small" /></a>
            </div>
            <div className="mm-highlights" aria-label={copy.tagline}>
              {[copy.featureOne, copy.featureTwo, copy.featureThree].map((v) => <span key={v}><CheckRounded aria-hidden="true" sx={{ fontSize: 16 }} /> {v}</span>)}
            </div>
          </div>
          <div className="mm-hero-image">
            <img src="/images/infant-massage.jpg" alt={lang === 'tj' ? 'Массажи эҳтиёткоронаи кӯдакона' : lang === 'en' ? 'Gentle massage for babies' : 'Бережный массаж для малышей'} fetchPriority="high" />
            <div className="mm-image-label"><FavoriteBorderRounded aria-hidden="true" sx={{ fontSize: 23, verticalAlign: "middle" }} /> {copy.tagline}</div>
          </div>
        </div>
      </section>

      <section className="mm-section mm-services" id="services" aria-labelledby="mm-services-title">
        <div className="mm-shell">
          <div className="mm-section-heading"><span className="mm-kicker">{BRAND_NAME}</span><h2 id="mm-services-title">{copy.introTitle}</h2><p>{copy.introText}</p></div>
          <div className="mm-service-grid">
            {copy.prices.map((item, i) => (
              <article key={item.title} className={'mm-service-card' + (i === 0 ? ' mm-service-featured' : '')}>
                <div className="mm-service-icon" aria-hidden="true"><ServiceIcon name={item.icon} /></div>
                <h3>{item.title}</h3>
                <div className="mm-price">{item.price}</div>
                <div className="mm-duration">{item.duration}</div>
                <p>{item.note}</p>
                <DM className="mm-card-link">{copy.instagramButton} <ArrowOutwardRounded aria-hidden="true" fontSize="small" /></DM>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mm-section mm-about" id="about" aria-labelledby="mm-about-title">
        <div className="mm-shell mm-about-layout">
          <div className="mm-about-photo"><img src="/images/child-massage.jpg" loading="lazy" decoding="async" alt={copy.tagline} /></div>
          <div className="mm-about-content"><span className="mm-kicker">{copy.aboutEyebrow}</span><h2 id="mm-about-title">{copy.aboutTitle}</h2><p>{copy.aboutText}</p><p className="mm-small-copy">{copy.aboutNote}</p><DM className="mm-btn mm-btn-primary">{copy.instagramButton} <ArrowOutwardRounded aria-hidden="true" fontSize="small" /></DM></div>
        </div>
      </section>

      <section className="mm-section mm-safety" aria-labelledby="mm-safety-title">
        <div className="mm-shell mm-safety-panel">
          <div className="mm-safety-symbol" aria-hidden="true"><FavoriteBorderRounded sx={{ fontSize: 43 }} /></div>
          <div><h2 id="mm-safety-title">{copy.safetyTitle}</h2><p>{copy.safetyText}</p><p className="mm-small-copy">{copy.safetyDisclaimer}</p></div>
        </div>
      </section>

      <section className="mm-section mm-faq" id="faq" aria-labelledby="mm-faq-title">
        <div className="mm-shell mm-faq-layout">
          <div className="mm-faq-intro"><span className="mm-kicker">FAQ</span><h2 id="mm-faq-title">{copy.faqTitle}</h2><p>{copy.faqLead}</p></div>
          <div className="mm-faq-questions">
            {copy.faqs.map((faq, index) => (
              <div className="mm-faq-item" key={faq.question}>
                <button type="button" className="mm-faq-question" aria-expanded={activeFaq === index} aria-controls={'mm-faq-answer-' + index} onClick={() => setActiveFaq(activeFaq === index ? null : index)}>
                  <span>{faq.question}</span><span aria-hidden="true" className="mm-faq-toggle">{activeFaq === index ? '−' : '+'}</span>
                </button>
                {activeFaq === index && <div id={'mm-faq-answer-' + index} className="mm-faq-answer"><p>{faq.answer}</p></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mm-section mm-contact" id="contact" aria-labelledby="mm-contact-title">
        <div className="mm-shell mm-contact-panel">
          <div><span className="mm-kicker">{INSTAGRAM_HANDLE}</span><h2 id="mm-contact-title">{copy.contactTitle}</h2><p>{copy.contactLead}</p>
            <ol className="mm-contact-steps">{copy.bookingSteps.map(step => <li key={step}>{step}</li>)}</ol>
            <p className="mm-small-copy">{copy.contactsNote}</p>
          </div>
          <div className="mm-contact-actions">
            <DM className="mm-btn mm-btn-primary">{copy.instagramButton} <ArrowOutwardRounded aria-hidden="true" fontSize="small" /></DM>
            <a className="mm-btn mm-btn-outline" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{copy.profileButton}</a>
            <p>{copy.hoursLabel}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
