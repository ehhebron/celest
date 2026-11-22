import { describe, expect, it } from 'vitest'
import { formatInZone } from '../format'

describe('formatInZone', () => {
  it('shows one instant on the birth place’s clock, not the device’s', () => {
    // 19:06 UTC on 1 Jul is 12:06 PM in Los Angeles but 3:06 AM on 2 Jul in Manila.
    const t = new Date('2026-07-01T19:06:00Z')
    expect(formatInZone(t, 'America/Los_Angeles', 'en-US')).toMatchObject({ date: 'July 1, 2026', time: '12:06 PM' })
    const manila = formatInZone(t, 'Asia/Manila', 'en-US')
    expect(manila).toMatchObject({ date: 'July 2, 2026', time: '3:06 AM' })
    expect(manila.zone).toMatch(/Philippine/)
  })
})
