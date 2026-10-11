import type { SVGProps } from 'react'
type Props = SVGProps<SVGSVGElement> & { size?: number }
export default function BrandMark({ size = 40, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" {...props}>
      <circle cx="32" cy="32" r="30" fill="#F9EDF0" />
      <path d="M32 52C19 43 13 35 13 26c0-8 5-13 12-13 4 0 7 2 9 6 2-4 5-6 9-6 7 0 12 5 12 13 0 9-10 20-23 26Z" stroke="#A65F7A" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="28" cy="29" r="5.1" fill="#A65F7A" />
      <circle cx="39" cy="35" r="3.7" fill="#D7A0B0" />
      <path d="M18.5 43c3.2-7.5 13.2-11.5 20.3-6.2" stroke="#A65F7A" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
