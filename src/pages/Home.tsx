import { useMemo, useState } from 'react'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import NearMeRounded from '@mui/icons-material/NearMeRounded'
import Instagram from '@mui/icons-material/Instagram'
import WhatsApp from '@mui/icons-material/WhatsApp'
import BookingForm from '../components/home/BookingForm.tsx'
import MassageDirections from '../components/home/MassageDirections.tsx'
import MessengerText from '../components/common/MessengerText.tsx'
import { useLang } from '../contexts/LanguageContext.tsx'
import { BRAND_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../lib/brand.ts'
import { getMassageCatalogue } from '../lib/massage.ts'
import { getWhatsAppBookingUrl } from '../lib/booking.ts'
import { siteCopy } from '../lib/site-copy.ts'
import { YANDEX_MAP_URL, YANDEX_ROUTE_URL, YANDEX_WIDGET_URL } from '../lib/location.ts'
import useBrandCopy from '../hooks/useBrandCopy.ts'

const photos: Record<string, string> = {
  child: 'baby-care', adult: 'adult-massage', cupping: 'cupping', partial: 'hand-massage', electro: 'electrophoresis', light: 'light-therapy',
}

export default function Home() {
  const { lang } = useLang()
  const copy = useBrandCopy()
  const text = siteCopy[lang]
  const [activeFaq, setActiveFaq] = useState<number | null>(0)
  const [selectedService, setSelectedService] = useState('')
  const catalogue = useMemo(() => getMassageCatalogue(lang), [lang])
  const services = useMemo(() => [...catalogue.groups.flatMap(group => group.services), ...copy.prices.filter(item => !catalogue.groups.some(group => group.services.some(service => service.id === item.id)))], [catalogue, copy.prices])
  return <div className="mm-site">
    <section className="mm-hero" id="home" aria-labelledby="mm-heading">
      <div className="mm-shell mm-hero-layout">
        <div className="mm-hero-text">
          <div className="mm-eyebrow"><span className="mm-dot" />{copy.eyebrow}</div>
          <h1 id="mm-heading">{copy.heroTitle}</h1>
          <p className="mm-hero-subtitle">{copy.heroLead}</p>
          <div className="mm-actions">
            <a href="#contact" className="mm-btn mm-btn-primary">{copy.heroPrimary}<ArrowDownwardRounded aria-hidden="true" fontSize="small" /></a>
            <a href="#services" className="mm-btn mm-btn-ghost">{copy.heroSecondary}</a>
          </div>
        </div>
        <div className="mm-hero-visual mm-depth">
          <div className="mm-hero-photo"><img src="/images/baby-care.webp" srcSet="/images/baby-care-mobile.webp 600w, /images/baby-care.webp 1120w" sizes="(max-width:700px) 92vw, 46vw" alt={copy.tagline} width="1120" height="1400" fetchPriority="high" /></div>
          <div className="mm-image-label"><img src="/images/brand-mark.webp" alt="" width="48" height="48" /><span><strong>{text.heroBadge}</strong><small>{text.heroDetail}</small></span></div>
        </div>
      </div>
      <div className="mm-shell mm-hero-directions"><MassageDirections onSelect={setSelectedService} /></div>
    </section>

    <section className="mm-section mm-services" id="services" aria-labelledby="mm-services-title">
      <div className="mm-shell">
        <div className="mm-section-heading"><span className="mm-kicker">{BRAND_NAME}</span><h2 id="mm-services-title">{copy.introTitle}</h2><p>{copy.introText}</p></div>
        <MassageDirections onSelect={setSelectedService} compact />
        <p className="mm-price-note">{catalogue.priceNote}</p>
        <div className="mm-service-grid">
          {copy.prices.map(item => <article key={item.id} className="mm-service-card mm-depth">
            <img className="mm-service-photo" src={'/images/' + photos[item.id] + '-card.webp'} alt={item.title} width="600" height="400" loading="lazy" decoding="async" />
            <div className="mm-service-body"><h3>{item.title}</h3><div className="mm-price">{item.price}</div><div className="mm-duration">{item.duration}</div><p>{item.note}</p>
              <a className="mm-card-link" href="#contact" onClick={() => setSelectedService(item.id)}>{copy.heroPrimary}<ArrowOutwardRounded aria-hidden="true" fontSize="small" /></a>
            </div>
          </article>)}
        </div>
      </div>
    </section>

    <section className="mm-section mm-about" id="about" aria-labelledby="mm-about-title">
      <div className="mm-shell mm-about-layout">
        <div className="mm-about-photo mm-depth"><img src="/images/hand-massage-card.webp" alt={copy.tagline} width="600" height="400" loading="lazy" /></div>
        <div><span className="mm-kicker">{copy.aboutEyebrow}</span><h2 id="mm-about-title">{copy.aboutTitle}</h2><p>{copy.aboutText}</p><p className="mm-small-copy">{copy.aboutNote}</p><a className="mm-btn mm-btn-outline" href="#contact">{copy.heroPrimary}</a></div>
      </div>
    </section>

    <section className="mm-section mm-safety" id="care" aria-labelledby="mm-safety-title">
      <div className="mm-shell mm-safety-panel"><img src="/images/brand-mark.webp" width="84" height="84" alt="" loading="lazy" /><div><h2 id="mm-safety-title">{copy.safetyTitle}</h2><div className="mm-highlights">{[copy.featureOne, copy.featureTwo, copy.featureThree].map(item => <span key={item}><CheckRounded aria-hidden="true" sx={{ fontSize: 16 }} />{item}</span>)}</div><p>{copy.safetyText}</p><p className="mm-small-copy">{copy.safetyDisclaimer}</p></div></div>
    </section>

    <section className="mm-section" id="faq" aria-labelledby="mm-faq-title">
      <div className="mm-shell mm-faq-layout">
        <div><span className="mm-kicker">FAQ</span><h2 id="mm-faq-title">{copy.faqTitle}</h2><p>{copy.faqLead}</p></div>
        <div className="mm-faq-questions">{copy.faqs.map((faq, index) => <div className="mm-faq-item" key={faq.question}>
          <button className="mm-faq-question" type="button" aria-expanded={activeFaq === index} aria-controls={'mm-faq-answer-' + index} onClick={() => setActiveFaq(activeFaq === index ? null : index)}><span>{faq.question}</span><span className="mm-faq-toggle" aria-hidden="true">{activeFaq === index ? '−' : '+'}</span></button>
          <div id={'mm-faq-answer-' + index} className="mm-faq-answer" hidden={activeFaq !== index}><p><MessengerText text={faq.answer} /></p></div>
        </div>)}</div>
      </div>
    </section>

    <section className="mm-section mm-contact" id="contact" aria-labelledby="mm-contact-title">
      <div className="mm-shell mm-contact-form-grid">
        <div className="mm-contact-info"><span className="mm-kicker">{text.bookingNav}</span><h2 id="mm-contact-title">{copy.contactTitle}</h2><p><MessengerText text={text.bookingLead} /></p>
          <div className="mm-social-contacts">
            <a href={getWhatsAppBookingUrl('')} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp: +992 00 733 6264"><WhatsApp aria-hidden="true" /><span><small>WhatsApp</small>+992 00 733 6264</span><ArrowOutwardRounded fontSize="small" aria-hidden="true" /></a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={'Instagram: ' + INSTAGRAM_HANDLE}><Instagram aria-hidden="true" /><span><small>Instagram</small>{INSTAGRAM_HANDLE}</span><ArrowOutwardRounded fontSize="small" aria-hidden="true" /></a>
          </div>
          <ol className="mm-contact-steps">{text.bookingSteps.map((step, index) => <li key={step}><span>{index + 1}</span><div><MessengerText text={step} /></div></li>)}</ol>
          <p className="mm-small-copy">{text.bookingNote}</p>
        </div>
        <BookingForm services={services} selectedService={selectedService} onServiceChange={setSelectedService} />
      </div>
    </section>

    <section className="mm-section mm-location" id="location" aria-labelledby="mm-location-title">
      <div className="mm-shell mm-location-layout">
        <div><span className="mm-kicker">{text.locationNav}</span><h2 id="mm-location-title">{text.locationTitle}</h2><p>{text.locationLead}</p>
          <address>{text.address}<small>38.585812, 68.716695</small></address><p className="mm-small-copy">{text.locationNote}</p>
          <div className="mm-actions"><a className="mm-btn mm-btn-primary" href={YANDEX_ROUTE_URL} target="_blank" rel="noopener noreferrer"><NearMeRounded fontSize="small" aria-hidden="true" />{text.route}</a>
            <a className="mm-card-link" href={YANDEX_MAP_URL} target="_blank" rel="noopener noreferrer">{text.openMap}<ArrowOutwardRounded fontSize="small" aria-hidden="true" /></a></div>
          <p className="mm-small-copy">{text.mapHint}</p>
        </div>
        <div className="mm-map-card"><iframe src={YANDEX_WIDGET_URL} title={text.mapTitle} loading="eager" referrerPolicy="strict-origin-when-cross-origin" /></div>
      </div>
    </section>
  </div>
}
