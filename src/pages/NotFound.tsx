import { Link } from 'react-router-dom'
import { useLang } from '../contexts/LanguageContext.tsx'
import { siteCopy } from '../lib/site-copy.ts'
export default function NotFound() {
  const copy = siteCopy[useLang().lang]
  return <section className="mm-not-found mm-shell"><span className="mm-kicker">404</span><h1>{copy.missingTitle}</h1><p>{copy.missingLead}</p><Link to="/" className="mm-btn mm-btn-primary">{copy.backHome}</Link></section>
}
