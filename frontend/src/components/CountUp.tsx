import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const frame = useRef<number>()

  useEffect(() => {
    const start = performance.now()
    const duration = 900
    function step(now: number) {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [value])

  return (
    <>
      {display}
      {suffix}
    </>
  )
}
