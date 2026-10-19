import type { BrandLanguage } from './brand.ts'

const ids = {
  woman: ['adult', 'anti-cellulite', 'face', 'brush', 'cupping', 'back', 'other-woman'],
  child: ['child', 'child-valgus', 'child-dysplasia', 'child-rickets', 'child-strengthening', 'child-legs', 'other-child'],
} as const

const copy = {
  ru: {
    woman: 'Женский массаж', child: 'Детский массаж',
    womanHint: 'Время для себя и заботы о теле', childHint: 'Бережный подход к вашему малышу',
    priceNote: 'Цены ниже — для указанных услуг. Стоимость остальных видов массажа уточним при записи.',
    womanNames: ['Классический женский массаж', 'Антицеллюлитный массаж', 'Массаж лица', 'Четка-массаж', 'Баночный массаж', 'Массаж для спины', 'Другие виды массажа'],
    childNames: ['Массаж для детей от 3 месяцев', 'Массаж при вальгусе', 'Массаж при дисплазии тазобедренных суставов', 'Массаж при рахите', 'Общеукрепляющий детский массаж', 'Массаж при Х-образных и О-образных ногах', 'Другие виды детского массажа'],
  },
  tj: {
    woman: 'Массаҷи занона', child: 'Массаҷи кӯдакона',
    womanHint: 'Вақт барои худ ва ғамхорӣ ба бадан', childHint: 'Муносибати эҳтиёткорона ба кӯдаки шумо',
    priceNote: 'Нархҳои поён барои хизматҳои нишондодашудаанд. Нархи дигар намудҳои массажро ҳангоми навбатгирӣ аниқ мекунем.',
    womanNames: ['Массажи классикии занона', 'Массажи зиддиселлюлитӣ', 'Массажи рӯй', 'Массаж бо чӯтка', 'Массажи банкагӣ', 'Массажи пушт', 'Дигар намудҳои массаж'],
    childNames: ['Массаж барои кӯдакон аз 3-моҳагӣ', 'Массаж ҳангоми валгус', 'Массаж ҳангоми дисплазияи буғумҳои косу рон', 'Массаж ҳангоми рахит', 'Массажи умумии тақвиятдиҳандаи кӯдакон', 'Массаж ҳангоми пойҳои Х-шакл ва О-шакл', 'Дигар намудҳои массажи кӯдакона'],
  },
  en: {
    woman: 'Massage for women', child: 'Massage for children',
    womanHint: 'Time for yourself and your wellbeing', childHint: 'A gentle approach to your little one',
    priceNote: 'Prices below apply to the listed services. Please ask about pricing for other massage types when booking.',
    womanNames: ['Classic massage for women', 'Anti-cellulite massage', 'Facial massage', 'Brush massage', 'Cupping massage', 'Back massage', 'Other massage types'],
    childNames: ['Massage for babies from 3 months', 'Massage for valgus alignment', 'Massage for hip dysplasia', 'Massage for rickets', 'General strengthening massage for children', 'Massage for knock knees and bow legs', 'Other children’s massage types'],
  },
}

export function getMassageCatalogue(language: BrandLanguage) {
  const text = copy[language]
  return {
    priceNote: text.priceNote,
    groups: (['woman', 'child'] as const).map(audience => ({
      audience, title: text[audience], hint: text[`${audience}Hint`],
      services: ids[audience].map((id, index) => ({ id, title: text[`${audience}Names`][index], audience })),
    })),
  }
}
