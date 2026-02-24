// Aerodynamic blade path (hub-relative, points upward)
// Blade radius scaled to 100 px (was 82)
const BLADE = 'M 0 5 C -7 -6 -10 -46 -5 -88 C -2 -100 2 -100 5 -88 C 10 -46 7 -6 0 5 Z'

// ── Status system ────────────────────────────────────────────────────────────

const STATUS = {
  good:     { color: '#22c55e', label: 'NORMAL',   bg: '#020d06' },
  warning:  { color: '#f59e0b', label: 'WARNING',  bg: '#0f0900' },
  critical: { color: '#ef4444', label: 'CRITICAL', bg: '#0f0202' },
  idle:     { color: '#4b5563', label: 'OFFLINE',  bg: '#0a0a0f' },
}

/**
 * Classify a metric value as good / warning / critical (or idle when offline).
 * Thresholds are based on typical IEC 61400 / industry practice.
 *
 * rotorSpeed  : cut-in ≈5 RPM, rated ≈15, cut-out ≈25
 * temperatures: warn > 65 °C, critical > 80 °C (for both generator & gearbox)
 * windSpeed   : too low < 3 m/s; storm warning > 20; emergency > 25
 * vibration   : warn > 0.3 g; critical > 0.6 g
 * powerOutput : if running but < 50 kW something is off → warning
 */
function classify(key, value, running) {
  if (!running || value == null) return 'idle'
  switch (key) {
    case 'generatorTemp':
    case 'gearboxTemp':
      return value > 80 ? 'critical' : value > 65 ? 'warning' : 'good'
    case 'rotorSpeed':
      return value > 23 || value < 2 ? 'critical'
           : value > 20 || value < 5 ? 'warning' : 'good'
    case 'powerOutput':
      return value < 50 ? 'warning' : 'good'
    case 'windSpeed':
      return value > 25 || value < 2 ? 'critical'
           : value > 20 || value < 5 ? 'warning' : 'good'
    case 'vibration':
      return value > 0.6 ? 'critical' : value > 0.3 ? 'warning' : 'good'
    default:
      return 'good'
  }
}

// ── Callout annotation (pure SVG) ────────────────────────────────────────────

/**
 * A labelled box attached to a windmill component via a dashed connector line.
 *
 * bx / by     – top-left x and centre-y of the box
 * lineFrom    – [x, y] point on the windmill component (dot drawn here)
 * align       – 'left'  → box is left of windmill, face at bx+W
 *               'right' → box is right of windmill, face at bx
 */
function Callout({ bx, by, label, value, unit, statusKey, lineFrom, align = 'right' }) {
  const W = 140, H = 40, R = 5
  const s = STATUS[statusKey] || STATUS.idle
  const ry = by - H / 2
  const faceX = align === 'left' ? bx + W : bx

  return (
    <g>
      {/* Dashed connector */}
      <line
        x1={faceX} y1={by}
        x2={lineFrom[0]} y2={lineFrom[1]}
        stroke={s.color} strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3"
      />
      {/* Dot on turbine component */}
      <circle cx={lineFrom[0]} cy={lineFrom[1]} r="3" fill={s.color} opacity="0.9" />

      {/* Box */}
      <rect x={bx} y={ry} width={W} height={H} rx={R} fill={s.bg} />
      <rect x={bx} y={ry} width={W} height={H} rx={R}
        fill="none" stroke={s.color} strokeWidth="1" strokeOpacity="0.5" />

      {/* Label + status badge on same row */}
      <text
        x={bx + 8} y={ry + 12}
        dominantBaseline="middle"
        fill="#9ca3af" fontSize="7" fontFamily="system-ui"
        fontWeight="500" letterSpacing="0.6"
      >
        {label}
      </text>
      <rect x={bx + W - 48} y={ry + 4} width={42} height={14} rx="3"
        fill={s.color} fillOpacity="0.15" />
      <text
        x={bx + W - 27} y={ry + 12}
        dominantBaseline="middle" textAnchor="middle"
        fill={s.color} fontSize="6.5" fontFamily="system-ui" fontWeight="700" letterSpacing="0.4"
      >
        {s.label}
      </text>

      {/* Value + unit */}
      <text x={bx + 8} y={ry + 29} dominantBaseline="middle" fontFamily="system-ui">
        <tspan fill="white" fontWeight="700" fontSize="16">{value}</tspan>
        <tspan fill="#6b7280" fontWeight="400" fontSize="9" dx="3">{unit}</tspan>
      </text>
    </g>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WindmillVisualization({ latest, isRunning }) {
  const rotorSpeed    = latest?.rotorSpeed         ?? 0
  const windSpeed     = latest?.windSpeed           ?? 0
  const powerOutput   = latest?.powerOutput         ?? 0
  const generatorTemp = latest?.generatorTemp       ?? 0
  const gearboxTemp   = latest?.gearboxTemp         ?? 0
  const windDir       = latest?.windDirection       ?? 0
  const bladePitch    = latest?.bladePitch          ?? 0
  const vibration     = latest?.vibration           ?? 0

  // Blade spin: RPM → seconds per revolution
  const spinDuration = isRunning && rotorSpeed > 0 ? (60 / rotorSpeed).toFixed(2) : null
  const spinStyle = spinDuration
    ? { animation: `windmill-spin ${spinDuration}s linear infinite`, transformOrigin: '0 0' }
    : {}

  // Power ground-glow intensity (0–2000 kW nominal range)
  const powerPct    = Math.min(100, (powerOutput / 2000) * 100)
  const glowOpacity = isRunning ? 0.1 + (powerPct / 100) * 0.45 : 0

  // Nacelle heat colour (generator temp)
  const nacelleFill   = generatorTemp > 80 ? '#3b0000' : generatorTemp > 65 ? '#1c0900' : '#0f172a'
  const nacelleStroke = generatorTemp > 80 ? '#ef4444' : generatorTemp > 65 ? '#f97316' : '#334155'
  const nacelleGlow   = generatorTemp > 65
    ? `drop-shadow(0 0 7px ${generatorTemp > 80 ? '#ef444455' : '#f9731640'})`
    : 'none'

  // Wind streak speed (faster at higher wind)
  const streakSpeed = windSpeed > 0 ? Math.max(0.6, 3 - (windSpeed / 30) * 2.4) : 2
  const streakYs    = [35, 62, 90, 118, 152, 185, 222, 258]

  // Classify every metric
  const st = {
    generatorTemp: classify('generatorTemp', generatorTemp, isRunning),
    gearboxTemp:   classify('gearboxTemp',   gearboxTemp,   isRunning),
    rotorSpeed:    classify('rotorSpeed',    rotorSpeed,    isRunning),
    powerOutput:   classify('powerOutput',   powerOutput,   isRunning),
    windSpeed:     classify('windSpeed',     windSpeed,     isRunning),
    vibration:     classify('vibration',     vibration,     isRunning),
  }

  // ── Windmill geometry (hub centred at 258, 165) ──
  // HX shifted left to keep clearance: left blade tip 258-100=158 vs callout face 145 (+13 px)
  //                                    right blade tip 258+100=358 vs callout face 375 (+17 px)
  const HX = 258, HY = 165
  // Tower right edge at y (interp: top ±8 px → base ±22 px)
  const towerRightAt = y => HX + 8 + ((y - (HY + 11)) / (295 - HY - 11)) * 14

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-8">
      <svg
        viewBox="0 0 620 315"
        width="100%"
        style={{ display: 'block' }}
        aria-label="Windmill live metrics visualisation"
      >
        <defs>
          <linearGradient id="wv-tower" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#0f172a" />
            <stop offset="45%"  stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="wv-blade" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%"   stopColor={isRunning ? '#475569' : '#1e293b'} />
            <stop offset="55%"  stopColor={isRunning ? '#94a3b8' : '#374151'} />
            <stop offset="100%" stopColor={isRunning ? '#e2e8f0' : '#4b5563'} />
          </linearGradient>
          <radialGradient id="wv-glow" cx="50%" cy="0%" r="80%">
            <stop offset="0%"   stopColor="#34d399" stopOpacity={glowOpacity} />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Background ── */}
        <rect width="620" height="295" fill="#020712" />
        <rect x="0" y="295" width="620" height="20" fill="#031209" />

        {/* Power glow at base */}
        <ellipse
          cx={HX} cy="296" rx="72" ry="22"
          fill="url(#wv-glow)"
          style={isRunning ? { animation: 'power-pulse 2.5s ease-in-out infinite' } : {}}
        />

        {/* ── Wind streaks — start at x=145 (clear of left callout boxes),
               animate +175 px rightward, fade before reaching right callouts at x=362 ── */}
        {isRunning && streakYs.map((y, i) => (
          <line key={i}
            x1={145} y1={y}
            x2={182 - (i % 3) * 10} y2={y}
            stroke="#60a5fa"
            strokeWidth={i % 2 === 0 ? 1 : 0.6}
            strokeLinecap="round"
            style={{
              animation: `wind-streak ${(streakSpeed + (i % 3) * 0.25).toFixed(2)}s linear infinite`,
              animationDelay: `${(i * 0.34).toFixed(2)}s`,
            }}
          />
        ))}

        {/* ── Tower ── */}
        <path
          d={`M ${HX - 8} ${HY + 11} L ${HX - 22} 295 L ${HX + 22} 295 L ${HX + 8} ${HY + 11} Z`}
          fill="url(#wv-tower)"
        />
        <line x1={HX} y1={HY + 11} x2={HX} y2="295"
          stroke="#475569" strokeWidth="0.5" opacity="0.3" />

        {/* ── Nacelle ── */}
        <rect
          x={HX - 23} y={HY - 15} width="46" height="22" rx="6"
          fill={nacelleFill} stroke={nacelleStroke} strokeWidth="1.5"
          style={{ filter: nacelleGlow }}
        />
        <line
          x1={HX - 18} y1={HY - 5} x2={HX + 18} y2={HY - 5}
          stroke={nacelleStroke} strokeWidth="0.5" opacity="0.4"
        />

        {/* ── Hub ── */}
        <circle
          cx={HX} cy={HY} r="11"
          fill={isRunning ? '#1d4ed8' : '#1e293b'}
          stroke={isRunning ? '#60a5fa' : '#334155'}
          strokeWidth="2.5"
        />
        <circle cx={HX} cy={HY} r="4.5" fill={isRunning ? '#93c5fd' : '#374151'} />

        {/* ── Rotating blades ── */}
        <g transform={`translate(${HX}, ${HY})`}>
          <g style={spinStyle}>
            {[0, 120, 240].map(a => (
              <g key={a} transform={`rotate(${a})`}>
                <path d={BLADE} fill="url(#wv-blade)" stroke="#64748b" strokeWidth="0.4" />
              </g>
            ))}
          </g>
        </g>

        {/* ── Wind compass (top-right) ── */}
        <g transform="translate(590, 36)">
          <circle r="22" fill="#07090f" stroke="#1e293b" strokeWidth="1.5" />
          {[['N', 0, -14], ['S', 0, 17], ['W', -16, 2], ['E', 16, 2]].map(([d, dx, dy]) => (
            <text key={d} x={dx} y={dy}
              textAnchor="middle" dominantBaseline="middle"
              fill="#374151" fontSize="7" fontFamily="system-ui" fontWeight="600">
              {d}
            </text>
          ))}
          <g transform={`rotate(${windDir})`}>
            <polygon points="0,-14 3.5,1 0,-2 -3.5,1" fill="#38bdf8" />
            <polygon points="0,14 3.5,-1 0,2 -3.5,-1" fill="#1e3a5f" />
          </g>
        </g>
        <text x="590" y="66" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="system-ui">
          {windDir?.toFixed(0)}° wind
        </text>

        {/* ── Left callouts (face at bx+140=145, blade tip at HX-100=158 → +13 px gap) ── */}

        <Callout
          bx={5} by={80}
          label="WIND SPEED"
          value={windSpeed.toFixed(1)} unit="m/s"
          statusKey={st.windSpeed}
          lineFrom={[210, 78]}
          align="left"
        />
        <Callout
          bx={5} by={162}
          label="BLADE PITCH"
          value={bladePitch.toFixed(1)} unit="°"
          statusKey={isRunning ? 'good' : 'idle'}
          lineFrom={[HX - 23, HY - 5]}
          align="left"
        />

        {/* ── Right callouts (face at bx=375, blade tip at HX+100=358 → +17 px gap) ── */}

        <Callout
          bx={375} by={95}
          label="GENERATOR TEMP"
          value={generatorTemp.toFixed(1)} unit="°C"
          statusKey={st.generatorTemp}
          lineFrom={[HX + 23, HY - 10]}
          align="right"
        />
        <Callout
          bx={375} by={147}
          label="ROTOR SPEED"
          value={rotorSpeed.toFixed(1)} unit="RPM"
          statusKey={st.rotorSpeed}
          lineFrom={[HX + 11, HY]}
          align="right"
        />
        <Callout
          bx={375} by={199}
          label="POWER OUTPUT"
          value={powerOutput.toFixed(0)} unit="kW"
          statusKey={st.powerOutput}
          lineFrom={[Math.round(towerRightAt(210)), 210]}
          align="right"
        />
        <Callout
          bx={375} by={251}
          label="VIBRATION"
          value={vibration.toFixed(3)} unit=""
          statusKey={st.vibration}
          lineFrom={[Math.round(towerRightAt(255)), 255]}
          align="right"
        />

        {/* ── Status legend (ground strip) ── */}
        {[
          ['#22c55e', 'NORMAL — all clear'],
          ['#f59e0b', 'WARNING — attention needed'],
          ['#ef4444', 'CRITICAL — act immediately'],
        ].map(([color, text], i) => (
          <g key={text} transform={`translate(${105 + i * 145}, 305)`}>
            <circle r="3.5" fill={color} opacity="0.85" />
            <text x="8" y="1"
              dominantBaseline="middle"
              fill={color} fontSize="7.5" fontFamily="system-ui"
              fontWeight="500" opacity="0.85">
              {text}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
