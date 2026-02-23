import { useState, useEffect } from 'react'

export function useSSE(path) {
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const connectionId = crypto.randomUUID()
    const es = new EventSource(`${path}?connectionId=${connectionId}`)

    es.onopen = () => setConnected(true)

    es.onmessage = e => {
      try {
        const parsed = JSON.parse(e.data)
        // StateleSSE wraps payload in { group, data }
        setData(parsed?.data ?? parsed)
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
