import type { BodyId, SignId } from '../astro/zodiac'
import { BODY_GLYPHS, SIGN_GLYPHS } from './glyphs'

interface Props {
  body?: BodyId
  sign?: SignId
  size?: number
  className?: string
  strokeWidth?: number
}

/** Inline glyph icon for HTML contexts (decorative; pair with text). */
export function Glyph({ body, sign, size = 20, className, strokeWidth = 1.5 }: Props) {
  const d = body ? BODY_GLYPHS[body] : sign ? SIGN_GLYPHS[sign] : ''
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`glyph ${className ?? ''}`}
      style={{ strokeWidth }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
