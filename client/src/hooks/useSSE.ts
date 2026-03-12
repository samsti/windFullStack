import { useState, useEffect } from 'react'

export function useSSE<T>(path: string): { data: T | null; connected: boolean } {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const connectionId = crypto.randomUUID()
    const base = import.meta.env.VITE_API_URL ?? ''
    const es = new EventSource(`${base}${path}?connectionId=${connectionId}`)

    es.onopen = () => setConnected(true)

    es.onmessage = e => {
      try {
        const parsed = JSON.parse(e.data as string)
        setData((parsed?.data ?? parsed) as T)
      } catch {}
    }

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      setConnected(false)
    }
  }, [path])

  return { data, connected }
}
