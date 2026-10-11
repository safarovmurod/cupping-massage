import { useState } from 'react'
import { Link } from 'react-router-dom'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import ServiceIcon from '../components/brand/ServiceIcon.tsx'
import useBrandCopy from '../hooks/useBrandCopy.ts'
import { BRAND_NAME, INSTAGRAM_DM_URL } from '../lib/brand.ts'
import './mama-malish.css'

export function ServicesPage(){
 const copy=useBrandCopy()
 return <div className="mm-site mm-inner-page"><section className="mm-section"><div className="mm-shell">
   <div className="mm-section-heading"><span className="mm-kicker">{BRAND_NAME}</span><h1>{copy.introTitle}</h1><p>{copy.introText}</p></div>
   <div className="mm-service-grid">{copy.prices.map((item,index)=><article key={item.title} className={'mm-service-card'+(index===0?' mm-service-featured':'')}>
     <div className="mm-service-icon"><ServiceIcon name={item.icon}/></div><h2>{item.title}</h2><div className="mm-price">{item.price}</div><div className="mm-duration">{item.duration}</div><p>{item.note}</p>
     <Link to="/booking" className="mm-card-link">{copy.formButton}<ArrowForwardRounded fontSize="small"/></Link>
   </article>)}</div>
   <div className="mm-inner-cta"><p>{copy.safetyText}</p><Link className="mm-btn mm-btn-primary" to="/booking">{copy.formButton}<ArrowForwardRounded fontSize="small"/></Link></div>
 </div></section></div>
}
export function AboutPage(){
 const copy=useBrandCopy()
 return <div className="mm-site mm-inner-page"><section className="mm-section"><div className="mm-shell mm-about-layout"><div className="mm-about-photo"><img src="/images/child-massage.jpg" alt={copy.aboutTitle} loading="lazy"/></div><div className="mm-about-content"><span className="mm-kicker">{copy.aboutEyebrow}</span><h1>{copy.aboutTitle}</h1><p>{copy.aboutText}</p><p className="mm-small-copy">{copy.aboutNote}</p><div className="mm-actions"><Link className="mm-btn mm-btn-primary" to="/booking">{copy.formButton}</Link><a className="mm-btn mm-btn-outline" href={INSTAGRAM_DM_URL} rel="noopener noreferrer" target="_blank">{copy.instagramButton}</a></div></div></div></section><section className="mm-section mm-safety"><div className="mm-shell mm-safety-panel"><div><h2>{copy.safetyTitle}</h2><p>{copy.safetyText}</p><p className="mm-small-copy">{copy.safetyDisclaimer}</p></div></div></section></div>
}
export function FAQPage(){
 const copy=useBrandCopy()
 const [active,setActive]=useState<number|null>(0)
 return <div className="mm-site mm-inner-page"><section className="mm-section"><div className="mm-shell mm-faq-layout"><div className="mm-faq-intro"><span className="mm-kicker">{BRAND_NAME}</span><h1>{copy.faqTitle}</h1><p>{copy.faqLead}</p><Link className="mm-btn mm-btn-primary" to="/booking">{copy.formButton}</Link></div><div className="mm-faq-questions">{copy.faqs.map((item,i)=><div className="mm-faq-item" key={item.question}><button className="mm-faq-question" type="button" aria-expanded={active===i} aria-controls={'faq-answer-'+i} onClick={()=>setActive(active===i?null:i)}><span>{item.question}</span><span aria-hidden="true">{active===i?'−':'+'}</span></button>{active===i&&<div className="mm-faq-answer" id={'faq-answer-'+i}><p>{item.answer}</p></div>}</div>)}</div></div></section></div>
}
