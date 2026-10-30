'use client'

import { useEffect, useState } from 'react'

interface CountUpProps {
  to: number
  /** animation length in ms */
  duration?: number
  /** wait before starting, in ms (lets the card entrance animation finish first) */
  delay?: number
  className?: string
}

/** Number that counts up from 0 → `to` with an ease-out curve. Respects reduced motion. */
export function CountUp({ to, duration = 1200, delay = 350, className }: CountUpProps) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to)
      return
    }

    let raf = 0
    const start = performance.now() + delay

    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration))
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration, delay])

  return <span className={`tabular-nums ${className ?? ''}`}>{value}</span>
}