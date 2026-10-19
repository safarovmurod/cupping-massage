import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import ChildCareRounded from '@mui/icons-material/ChildCareRounded'
import SpaRounded from '@mui/icons-material/SpaRounded'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { getMassageCatalogue } from '../../lib/massage.ts'

export default function MassageDirections({ onSelect, compact = false }: { onSelect: (id: string) => void; compact?: boolean }) {
  const { lang } = useLang()
  return <div className={compact ? 'mm-directions mm-directions-prices' : 'mm-directions'}>
    {getMassageCatalogue(lang).groups.map(group => <article className="mm-direction mm-depth" key={group.audience}>
      <div className="mm-direction-heading"><span className="mm-direction-icon">{group.audience === 'woman' ? <SpaRounded /> : <ChildCareRounded />}</span><div><h3>{group.title}</h3>{!compact && <p>{group.hint}</p>}</div></div>
      <ul>{group.services.map(service => <li key={service.id}><a href={compact ? '#contact' : '#services'} onClick={() => onSelect(service.id)}><span>{service.title}</span><ArrowOutwardRounded fontSize="small" aria-hidden="true" /></a></li>)}</ul>
    </article>)}
  </div>
}
