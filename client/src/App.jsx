import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard    from './pages/Dashboard'
import TurbineDetail from './pages/TurbineDetail'
import AlertsPage   from './pages/AlertsPage'
import AlertBell    from './components/AlertBell'

function Navbar() {
  const { pathname } = useLocation()

  const link = (to, label) => (
    <Link
      to={to}
      className={`text-sm transition-colors ${
        pathname === to ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center gap-6 sticky top-0 z-10">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-cyan-400 text-xl">⚡</span>
        <span className="font-bold text-white tracking-wide text-sm">WindMonitor</span>
      </Link>

      <div className="h-4 w-px bg-gray-700" />

      {link('/', 'Dashboard')}
      {link('/alerts', 'Alerts')}

      <div className="ml-auto">
        <AlertBell />
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <main className="max-w-screen-xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/turbine/:id" element={<TurbineDetail />} />
            <Route path="/alerts"      element={<AlertsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
