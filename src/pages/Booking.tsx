import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Instagram from '@mui/icons-material/Instagram'
import WhatsApp from '@mui/icons-material/WhatsApp'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import ServiceIcon from '../components/brand/ServiceIcon.tsx'
import { INSTAGRAM_DM_URL } from '../lib/brand.ts'
import { useLang } from '../contexts/LanguageContext.tsx'
import { SERVICE_IDS, bookingServiceLabel, bookingZoneLabel, makeWhatsAppLink, type BookingDraft, type BookingAudience, type BookingService, type BodyZone, type BookingLanguage } from '../lib/booking.ts'
import '../pages/mama-malish.css'
import '../pages/booking.css'

const copy = {
 ru: { eyebrow:'Запись без лишних шагов', title:'Выберите удобную запись', lead:'Заполните короткую форму — WhatsApp откроется с готовым сообщением. Отправку подтвердите сами.', steps:['Кому','Услуга','Контакты'], child:'Для ребёнка', adult:'Для себя', question:'Для кого нужна процедура?', choose:'Выберите процедуру', zone:'Какая одна зона тела?', name:'Ваше имя', age:'Возраст ребёнка в месяцах', day:'Желаемая дата', time:'Удобное время', note:'Комментарий (необязательно)', next:'Далее', back:'Назад', send:'Продолжить в WhatsApp', instagram:'Написать в Instagram', help:'В Instagram можно написать напрямую без заполнения формы.', safety:'Для детского массажа: с 3 месяцев, только с разрешения врача и в присутствии одного из родителей.', mandatory:'Укажите имя и возраст ребёнка от 3 месяцев.', nameRequired:'Укажите имя.', doctor:'Для электрофореза и светотерапии необходимо назначение врача.', why:'Ваши данные не сохраняются на сайте при записи через WhatsApp.', review:'Проверьте данные перед переходом:', service:'Услуга', forWhom:'Кому', noDate:'Уточним при переписке', intro:'Массаж для мам и малышей' },
 tj: { eyebrow:'Навбатгирии осон', title:'Тарзи қулайи навбатгириро интихоб кунед', lead:'Формаи кӯтоҳро пур кунед — WhatsApp бо паёми омода кушода мешавад. Фиристоданро худатон тасдиқ мекунед.', steps:['Барои кӣ','Хизмат','Маълумот'], child:'Барои кӯдак', adult:'Барои худ', question:'Массаж барои кӣ?', choose:'Хизматро интихоб кунед', zone:'Кадом як қисми бадан?', name:'Номи шумо', age:'Синну соли кӯдак (моҳ)', day:'Рӯзи интихобшуда', time:'Вақти қулай', note:'Шарҳ (ихтиёрӣ)', next:'Давом', back:'Қафо', send:'Ба WhatsApp гузаред', instagram:'Дар Instagram нависед', help:'Дар Instagram бе пур кардани форма навишта метавонед.', safety:'Массажи кӯдак аз 3-моҳагӣ, танҳо бо иҷозати духтур ва дар ҳузури яке аз волидон.', mandatory:'Ном ва синну соли кӯдакро аз 3 моҳагӣ нависед.', nameRequired:'Номро нависед.', doctor:'Барои электрофорез ва светотерапия таъйиноти духтур лозим аст.', why:'Ҳангоми навбатгирӣ тавассути WhatsApp маълумоти шумо дар сайт нигоҳ дошта намешавад.', review:'Маълумотро пеш аз гузаштан санҷед:', service:'Хизмат', forWhom:'Барои кӣ', noDate:'Дар чат аниқ мекунем', intro:'Массаж барои модарон ва кӯдакон' },
 en: { eyebrow:'Simple booking', title:'Choose how to book', lead:'Complete a short form to open WhatsApp with a prepared message. You choose when to send it.', steps:['For whom','Service','Details'], child:'For a child', adult:'For myself', question:'Who is the treatment for?', choose:'Choose a service', zone:'Which one body area?', name:'Your name', age:'Child age in months', day:'Preferred date', time:'Preferred time', note:'Note (optional)', next:'Continue', back:'Back', send:'Continue to WhatsApp', instagram:'Message on Instagram', help:'You can message us directly on Instagram without this form.', safety:'Child massage is available from 3 months, with a doctor’s permission and a parent present.', mandatory:'Enter your name and the child’s age (3 months or older).', nameRequired:'Enter your name.', doctor:'Electrophoresis and light therapy require a doctor’s prescription.', why:'We do not store this booking form on our website when you choose WhatsApp.', review:'Review your details:', service:'Service', forWhom:'For', noDate:'We will confirm by chat', intro:'Massage for mothers and babies' },
}

const serviceIcons: Record<BookingService,string> = {child_massage:'child',adult_massage:'adult',cupping:'cupping',partial:'partial',electro_child:'electro',electro_adult:'electro',light:'light'}
const zones: BodyZone[] = ['back','neck','arms','legs','other']
const initial: BookingDraft = { audience:'child',service:'child_massage',name:'',ageMonths:'',bodyZone:'back',preferredDate:'',preferredTime:'',note:'' }

export default function Booking() {
  const { lang } = useLang()
  const language: BookingLanguage = lang === 'tj' ? 'tj' : lang === 'en' ? 'en' : 'ru'
  const t = copy[language]
  const [step,setStep] = useState(0)
  const [draft,setDraft] = useState<BookingDraft>(initial)
  const [error,setError] = useState('')
  const update = (values:Partial<BookingDraft>) => {setDraft(previous=>({...previous,...values}));setError('')}
  const options = useMemo(()=>SERVICE_IDS[draft.audience], [draft.audience])
  const selectAudience = (audience:BookingAudience) => update({audience,service:audience==='child'?'child_massage':'adult_massage'})
  const continueToDetails = () => {setError('');setStep(2)}
  const openWhatsApp = (event:React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if(!draft.name.trim()){setError(t.nameRequired);return}
    if(draft.audience==='child' && draft.service==='child_massage' && (!draft.ageMonths || Number(draft.ageMonths)<3 || Number(draft.ageMonths)>216)){setError(t.mandatory);return}
    const target=makeWhatsAppLink(draft,language)
    // Same-tab navigation works reliably in mobile in-app browsers and avoids popup blocking.
    window.location.assign(target)
  }
  return <div className="mm-site mm-book-page">
    <div className="mm-shell mm-book-wrap">
      <Link to="/" className="mm-back-link mm-book-return"><ArrowBackRounded fontSize="small" /> {t.intro}</Link>
      <div className="mm-book-heading">
        <span className="mm-kicker">{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </div>
      <div className="mm-book-layout">
        <div className="mm-book-card">
          <div className="mm-book-progress" aria-label={t.title}>{t.steps.map((label,i)=><div key={label} className={i===step?'current':i<step?'completed':''}><span>{i<step?<CheckRounded sx={{fontSize:16}}/>:i+1}</span><small>{label}</small></div>)}</div>
          {step===0 && <div className="mm-book-stage">
            <h2>{t.question}</h2>
            <div className="mm-book-choice">
              {(['child','adult'] as BookingAudience[]).map(audience=><button type="button" key={audience} aria-pressed={draft.audience===audience} className={'mm-book-option'+(draft.audience===audience?' selected':'')} onClick={()=>selectAudience(audience)}><ServiceIcon name={audience==='child'?'child':'adult'}/><span>{t[audience]}</span><CheckRounded className="mm-book-check" /></button>)}
            </div>
            <p className="mm-book-safety">{t.safety}</p>
            <button className="mm-btn mm-btn-primary mm-book-next" type="button" onClick={()=>setStep(1)}>{t.next} <ArrowForwardRounded fontSize="small"/></button>
          </div>}
          {step===1 && <div className="mm-book-stage">
            <h2>{t.choose}</h2>
            <div className="mm-book-services">{options.map(service=><button key={service} type="button" aria-pressed={draft.service===service} className={'mm-book-service'+(draft.service===service?' selected':'')} onClick={()=>update({service})}><ServiceIcon name={serviceIcons[service]}/><span>{bookingServiceLabel(service,language)}</span><CheckRounded className="mm-book-check"/></button>)}</div>
            {draft.service==='partial' && <label className="mm-book-field">{t.zone}<select value={draft.bodyZone||'back'} onChange={e=>update({bodyZone:e.target.value as BodyZone})}>{zones.map(zone=><option value={zone} key={zone}>{bookingZoneLabel(zone,language)}</option>)}</select></label>}
            {(draft.service==='electro_child'||draft.service==='electro_adult'||draft.service==='light')&&<p className="mm-book-safety">{t.doctor}</p>}
            <div className="mm-book-controls"><button type="button" className="mm-btn mm-btn-outline" onClick={()=>setStep(0)}>{t.back}</button><button className="mm-btn mm-btn-primary" type="button" onClick={continueToDetails}>{t.next} <ArrowForwardRounded fontSize="small"/></button></div>
          </div>}
          {step===2 && <form className="mm-book-stage mm-book-form" onSubmit={openWhatsApp} noValidate>
            <h2>{t.review}</h2>
            <p className="mm-book-selected">{t.forWhom}: <strong>{t[draft.audience]}</strong><br/>{t.service}: <strong>{bookingServiceLabel(draft.service,language)}</strong></p>
            <label className="mm-book-field">{t.name}<input name="name" maxLength={80} autoComplete="name" required value={draft.name} onChange={e=>update({name:e.target.value})} placeholder={t.name}/></label>
            {draft.audience==='child'&&<label className="mm-book-field">{t.age}<input type="number" min={1} max={216} inputMode="numeric" name="age" value={draft.ageMonths||''} onChange={e=>update({ageMonths:e.target.value})} placeholder="3" /></label>}
            <div className="mm-book-field-row"><label className="mm-book-field">{t.day}<input type="date" name="date" value={draft.preferredDate||''} onChange={e=>update({preferredDate:e.target.value})} /></label><label className="mm-book-field">{t.time}<input type="time" name="time" value={draft.preferredTime||''} onChange={e=>update({preferredTime:e.target.value})}/></label></div>
            <label className="mm-book-field">{t.note}<textarea rows={3} maxLength={160} name="note" value={draft.note||''} onChange={e=>update({note:e.target.value})}/></label>
            {draft.audience==='child'&&<p className="mm-book-safety">{t.safety}</p>}
            {error&&<p role="alert" className="mm-book-error">{error}</p>}
            <div className="mm-book-controls"><button type="button" className="mm-btn mm-btn-outline" onClick={()=>setStep(1)}>{t.back}</button><button className="mm-btn mm-btn-primary" type="submit"><WhatsApp fontSize="small" /> {t.send}</button></div>
            <p className="mm-book-privacy">{t.why}</p>
          </form>}
        </div>
        <aside className="mm-book-aside"><span className="mm-kicker">Instagram · WhatsApp</span><h2>{t.instagram}</h2><p>{t.help}</p><a href={INSTAGRAM_DM_URL} target="_blank" rel="noopener noreferrer" className="mm-btn mm-btn-outline"><Instagram fontSize="small"/>{t.instagram} <ArrowForwardRounded fontSize="small"/></a><p className="mm-book-safety">{t.safety}</p></aside>
      </div>
    </div>
  </div>
}