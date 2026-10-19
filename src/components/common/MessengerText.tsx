import Instagram from '@mui/icons-material/Instagram'
import WhatsApp from '@mui/icons-material/WhatsApp'

/** Keep the familiar messenger icon beside names in translated copy. */
export default function MessengerText({ text }: { text: string }) {
  return text.split(/(WhatsApp(?:-ро)?|Instagram(?:-ро)?)/g).map((part, index) => {
    const Icon = part.startsWith('WhatsApp') ? WhatsApp : part.startsWith('Instagram') ? Instagram : null
    return Icon ? <span className="mm-messenger-label" key={index}><Icon fontSize="small" aria-hidden="true" />{part}</span> : part
  })
}
