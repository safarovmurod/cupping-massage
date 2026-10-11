import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {makeBookingMessage,makeWhatsAppLink,bookingServiceLabel,bookingZoneLabel,SERVICE_IDS,WHATSAPP_NUMBER} from '../src/lib/booking.ts'
import {getPageMetadata} from '../src/lib/seo.ts'
import {brandCopy} from '../src/lib/brand.ts'
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('WhatsApp booking has a country-code number and properly URL-encodes structured information',()=>{
 assert.match(WHATSAPP_NUMBER,/^992[0-9]{9}$/)
 const draft={audience:'child' as const,service:'child_massage' as const,name:'Саида Апа',ageMonths:'3',preferredDate:'2026-10-14',preferredTime:'10:30'}
 const message=makeBookingMessage(draft,'tj')
 assert.match(message,/Саида Апа/)
 assert.match(message,/700 сомонӣ/)
 assert.match(message,/иҷозати духтур/)
 assert.match(message,/ҳузури яке аз волидон/)
 assert.match(message,/2026-10-14/)
 assert.equal(decodeURIComponent(new URL(makeWhatsAppLink(draft,'tj')).searchParams.get('text')||''),message)
 assert.equal(new URL(makeWhatsAppLink(draft,'tj')).host,'wa.me')
})
test('Adult one-area massage costs exactly 70 somoni and is not mislabeled as a course',()=>{
 const draft={audience:'adult' as const,service:'partial' as const,name:'Мунира',bodyZone:'back' as const}
 const message=makeBookingMessage(draft,'ru')
 assert.match(message,/70 сомони/)
 assert.match(message,/Спина/)
 assert.doesNotMatch(message,/10 дней/)
 assert.match(bookingServiceLabel('partial','tj'),/70 сомонӣ/)
 assert.equal(bookingZoneLabel('legs','tj'),'Пойҳо')
 assert.equal(SERVICE_IDS.child.includes('partial'),false)
 assert.equal(SERVICE_IDS.adult.includes('partial'),true)
})
test('Message sanitization prevents multiline injection and extra personal data',()=>{
 const msg=makeBookingMessage({audience:'adult',service:'cupping',name:'Name\nFake: hidden',note:'Hello\nSecurity: false'},'en')
 assert.doesNotMatch(msg,/Name\nFake/)
 assert.doesNotMatch(msg,/Hello\nSecurity/)
})
test('Booking, services, about and FAQs are public; private routes remain hidden from search',()=>{
 for(const path of ['/booking','/services','/about','/faq']) assert.equal(getPageMetadata(path).robots,'index, follow')
 for(const path of ['/login','/register','/admin','/admin/users']) assert.equal(getPageMetadata(path).robots,'noindex, nofollow')
 const app=read('src/App.tsx')
 for(const path of ['/booking','/services','/about','/faq'])assert.ok(app.includes('path="'+path+'"'))
 assert.match(app,/lazy\(/)
})
test('WhatsApp and Instagram calls are both present and public service icons stay vector-based',()=>{
 const header=read('src/components/layout/Header.tsx')
 const home=read('src/pages/Home.tsx')
 const book=read('src/pages/Booking.tsx')
 assert.match(header,/WhatsApp/)
 assert.match(header,/Instagram/)
 assert.match(home,/ServiceIcon/)
 assert.match(book,/makeWhatsAppLink/)
 assert.match(book,/type="date"/)
 assert.match(book,/type="time"/)
 assert.equal(brandCopy.ru.prices[3].price,'70 сомони')
 assert.equal(brandCopy.tj.prices[3].price,'70 сомонӣ')
})
