import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getUnackSummary } from '../services/api'

export default function AlertBell() {
  const { data } = useQuery({
    queryKey: ['alerts', 'unack-summary'],
    queryFn: getUnackSummary,
    refetchInterval: 15_000,
  })

  const count       = data?.count ?? 0
  const hasCritical = data?.hasCritical ?? false

  return (
    <Link
      to="/alerts"
      className="relative flex items-center text-gray-400 hover:text-white transition-colors"
      aria-label={`Alerts${count > 0 ? ` — ${count} unacknowledged` : ''}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {count > 0 && (
        <span className={`
          absolute -top-1.5 -right-2 min-w-[18px] h-[18px]
          rounded-full text-[10px] font-bold flex items-center justify-center px-1
          ${hasCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'} text-white
        `}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
