import { useState } from 'react'
import { login, auth } from '../services/api'

export default function LoginModal({ onSuccess }) {
  const [email,    setEmail]    = useState('admin@wind.local')
  const [password, setPassword] = useState('admin123')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await login(email, password)
      auth.setToken(token)
      onSuccess()
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-cyan-400 text-2xl">⚡</span>
          <span className="font-bold text-white text-lg tracking-wide">WindMonitor</span>
        </div>

        <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
        <p className="text-gray-500 text-sm mb-6">Operator access required</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white
                text-sm focus:outline-none focus:border-cyan-700 transition-colors"
              placeholder="admin@wind.local"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white
                text-sm focus:outline-none focus:border-cyan-700 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50
              text-white font-medium text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
