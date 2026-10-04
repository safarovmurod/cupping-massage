import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function AnalyticsOverview({ summary }) {
  if (!summary) return null
  const cards = [
    { label: 'Посетители', value: summary.uniqueVisitors, detail: 'Уникальные браузеры за всё время' },
    { label: 'Просмотры страниц', value: summary.totalVisits, detail: `${summary.viewsToday} сегодня · ${summary.viewsWeek} за 7 дней` },
    { label: 'Пришли из Instagram', value: summary.instagramVisitors, detail: 'Браузеры с источником Instagram' },
    { label: 'Пришли из WhatsApp', value: summary.whatsappVisitors, detail: 'Браузеры с источником WhatsApp' },
    { label: 'Клиенты', value: summary.totalUsers, detail: `${summary.newToday} новых сегодня · ${summary.newMonth} за 30 дней` },
    { label: 'Заявки', value: summary.formSubmits, detail: 'Заявки, сохранённые в базе' },
    { label: 'Активны сейчас', value: summary.onlineNow, detail: 'Браузеры с активностью за 2 минуты' },
    { label: 'Открыли WhatsApp', value: summary.whatsappClicks, detail: 'Нажатия на кнопку на сайте' },
  ]
  return <Stack gap="14px">
    <Stack direction="row" alignItems="center" gap="8px">
      <Box sx={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9cb998' }} />
      <Typography sx={{ color: '#c4b8ab', fontSize: '13px' }}>За всё время · администраторы и их известные браузеры исключены</Typography>
    </Stack>
    <Grid container spacing={2}>
      {cards.map(card => <Grid item xs={6} lg={3} key={card.label}>
        <Card sx={{ height: '100%', background: '#242522', border: '1px solid #ffffff12', borderRadius: '16px' }}>
          <CardContent sx={{ padding: '20px', '&:last-child': { pb: '20px' } }}>
            <Typography sx={{ minHeight: '38px', color: '#dedbd2', fontSize: '13px', lineHeight: 1.45 }}>{card.label}</Typography>
            <Typography sx={{ my: '8px', color: '#e4cca1', fontSize: { xs: '30px', lg: '36px' }, lineHeight: 1.1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{card.value.toLocaleString('ru-RU')}</Typography>
            <Typography sx={{ color: '#b7b4aa', fontSize: '11px', lineHeight: 1.5 }}>{card.detail}</Typography>
          </CardContent>
        </Card>
      </Grid>)}
    </Grid>
    <Typography sx={{ fontSize: '12px', color: '#b7b4aa', lineHeight: 1.65 }}>
      Считаются записанные посещения после согласия на аналитику. Один человек может использовать несколько браузеров.
      Один браузер может прийти из разных источников — их числа не нужно складывать.
      Нажатие на WhatsApp не подтверждает отправку сообщения.
    </Typography>
  </Stack>
}
