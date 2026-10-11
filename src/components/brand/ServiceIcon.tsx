import ChildCareOutlined from '@mui/icons-material/ChildCareOutlined'
import SpaOutlined from '@mui/icons-material/SpaOutlined'
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined'
import PanToolAltOutlined from '@mui/icons-material/PanToolAltOutlined'
import BoltOutlined from '@mui/icons-material/BoltOutlined'
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined'

const icons = {
  child: ChildCareOutlined,
  adult: SpaOutlined,
  cupping: RadioButtonUncheckedOutlined,
  partial: PanToolAltOutlined,
  electro: BoltOutlined,
  light: WbSunnyOutlined,
}
export default function ServiceIcon({ name }: { name: string }) {
  const Icon = icons[name as keyof typeof icons] || SpaOutlined
  return <Icon sx={{ fontSize: 26 }} aria-hidden="true" focusable="false" />
}
