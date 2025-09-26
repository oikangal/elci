
import React, { useEffect, useState } from 'react'

export default function Countdown({ endDate }){
  const [days, setDays] = useState(null)

  useEffect(()=>{
    const tick = () => {
      if (!endDate) return setDays(null)
      const end = new Date(endDate)
      const now = new Date()
      const diff = Math.ceil((end - now) / (1000*60*60*24))
      setDays(diff < 0 ? 0 : diff)
    }
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [endDate])

  if (!endDate) return null

  return (
    <div className="text-center my-2">
      <div className="inline-block bg-white/80 rounded-full px-4 py-2 text-sm font-semibold text-fuchsia-700 shadow">
        Bitişe kalan gün: <span className="font-bold">{days}</span>
      </div>
    </div>
  )
}
