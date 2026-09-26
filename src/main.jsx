import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const DEMO_BEERS = [
  { id: 'demo-1', name: 'Duvel', brewery: 'Duvel Moortgat', country: 'Belgio', region: 'Puurs', style: 'Belgian Strong Ale', abv: 8.5, rating: 5, notes: 'Secca, profumata e molto equilibrata.', last_tasted_at: '2026-09-20', carbonation: 'Alta', to_try: false, place_names: ['Esselunga'] },
  { id: 'demo-2', name: 'Punk IPA', brewery: 'BrewDog', country: 'Scozia', region: 'Ellon', style: 'IPA', abv: 5.4, rating: 4, notes: 'Agrumata e resinosa.', last_tasted_at: '2026-09-14', carbonation: 'Media', to_try: false, place_names: ['Supermercato'] },
  { id: 'demo-3', name: 'Westmalle Tripel', brewery: 'Westmalle', country: 'Belgio', region: 'Malle', style: 'Tripel', abv: 9.5, rating: 5, notes: 'Complessa, secca, lunga.', last_tasted_at: '2026-09-08', carbonation: 'Alta', to_try: true, place_names: [] },
]

const emptyForm = {
  name: '', brewery: '', country: '', region: '', style: '', abv: '', rating: 0,
  description: '', notes: '', last_tasted_at: new Date().toISOString().slice(0, 10),
  carbonation: 'Media', to_try: false, places: [{ name: '', type: 'Altro', city: '' }]
}

function App() {
  const [screen, setScreen] = useState(localStorage.getItem('beerbook-user-key') ? 'home' : 'onboarding')
  const [beers, setBeers] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ rating: '', brewery: '', country: '', style: '', city: '', place: '', type: '', toTry: false })
  const [userKey, setUserKey] = useState(localStorage.getItem('beerbook-user-key') || '')
  const [displayName, setDisplayName] = useState(localStorage.getItem('beerbook-display-name') || '')
  const [sync, setSync] = useState('offline')
  const [form, setForm] = useState(emptyForm)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  useEffect(() => {
    if (userKey) {
      loadBeers()
      loadUserProfile()
    } else {
      setBeers([])
      setSync('offline')
    }
    const online = () => setSync('sync')
    const offline = () => setSync('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/BeerBook/sw.js').catch(() => {})
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  async function loadBeers(key = userKey) {
    const cacheKey = key ? 'beerbook-cache-' + key : 'beerbook-cache'
    if (!navigator.onLine || !API_BASE || !key) {
      setBeers(JSON.parse(localStorage.getItem(cacheKey) || 'null') || DEMO_BEERS)
      setSync(navigator.onLine ? 'pending' : 'offline')
      return
    }
    try {
      setSync('sync')
      const res = await fetch(API_BASE + '/api/beers', { headers: { 'x-user-key': key } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBeers(data.beers || [])
      localStorage.setItem(cacheKey, JSON.stringify(data.beers || []))
      setSync('ok')
    } catch {
      setBeers(JSON.parse(localStorage.getItem(cacheKey) || 'null') || DEMO_BEERS)
      setSync('pending')
    }
  }

  async function loadUserProfile(key = userKey) {
    if (!API_BASE || !key || !navigator.onLine) return
    try {
      const res = await fetch(API_BASE + '/api/user', { headers: { 'x-user-key': key } })
      if (!res.ok) return
      const data = await res.json()
      const name = data.user?.display_name || ''
      setDisplayName(name)
      if (name) localStorage.setItem('beerbook-display-name', name)
      else localStorage.removeItem('beerbook-display-name')
    } catch {}
  }

  async function enterUser(value) {
    const clean = value.trim().toLowerCase()
    if (!clean) return { ok: false, error: 'Inserisci l’identificativo del tuo archivio.' }
    if (!/^[a-z0-9_-]{3,30}$/.test(clean)) {
      return { ok: false, error: 'L’identificativo deve essere lungo tra 3 e 30 caratteri.' }
    }
    if (!API_BASE || !navigator.onLine) {
      return { ok: false, error: 'Serve una connessione internet per rientrare nell’archivio.' }
    }
    try {
      setSync('sync')
      const res = await fetch(API_BASE + '/api/user', { headers: { 'x-user-key': clean } })
      const data = await res.json().catch(() => ({}))
      if (res.status === 404) return { ok: false, error: 'Archivio non trovato.' }
      if (!res.ok) return { ok: false, error: data.error || 'Impossibile accedere all’archivio.' }
      const name = data.user?.display_name || ''
      setUserKey(clean)
      setDisplayName(name)
      localStorage.setItem('beerbook-user-key', clean)
      if (name) localStorage.setItem('beerbook-display-name', name)
      else localStorage.removeItem('beerbook-display-name')
      setBeers([])
      setScreen('home')
      await loadBeers(clean)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Impossibile accedere all’archivio. Controlla la connessione e riprova.' }
    }
  }

  async function registerUser(value, nameValue) {
    const clean = value.trim().toLowerCase()
    const name = nameValue.trim()
    if (!clean || !name) return { ok: false, error: 'Compila tutti i campi obbligatori.' }
    if (!/^[a-z0-9_-]{3,30}$/.test(clean)) {
      return { ok: false, error: 'L’identificativo deve essere lungo tra 3 e 30 caratteri.' }
    }
    if (!API_BASE || !navigator.onLine) {
      return { ok: false, error: 'Serve una connessione internet per creare un nuovo archivio.' }
    }
    try {
      setSync('sync')
      const res = await fetch(API_BASE + '/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-key': clean },
        body: JSON.stringify({ display_name: name })
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) return { ok: false, error: 'Identificativo univoco già utilizzato' }
      if (!res.ok) return { ok: false, error: data.error || 'Impossibile creare il profilo.' }
      setUserKey(clean)
      setDisplayName(data.user?.display_name || name)
      localStorage.setItem('beerbook-user-key', clean)
      localStorage.setItem('beerbook-display-name', data.user?.display_name || name)
      setBeers([])
      setSync('ok')
      setScreen('home')
      await loadBeers(clean)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Impossibile creare il profilo. Controlla la connessione e riprova.' }
    }
  }

  async function syncNow() {
    if (!userKey) return
    await loadBeers()
    await loadUserProfile()
  }

  function exitProfile() {
    localStorage.removeItem('beerbook-user-key')
    localStorage.removeItem('beerbook-display-name')
    setUserKey('')
    setDisplayName('')
    setBeers([])
    setSelected(null)
    setScreen('onboarding')
    setSync('offline')
  }

  async function saveUserKey(value, nameValue = displayName) {
    const clean = value.trim()
    const name = nameValue.trim()
    setUserKey(clean)
    setDisplayName(name)
    setBeers([])
    if (clean) localStorage.setItem('beerbook-user-key', clean)
    else localStorage.removeItem('beerbook-user-key')
    if (!API_BASE || !clean || !navigator.onLine) return
    try {
      const res = await fetch(API_BASE + '/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-key': clean },
        body: JSON.stringify({ display_name: name })
      })
      if (res.ok) {
        const data = await res.json()
        const saved = data.user?.display_name || ''
        setDisplayName(saved)
        if (saved) localStorage.setItem('beerbook-display-name', saved)
        else localStorage.removeItem('beerbook-display-name')
      }
    } catch {}
    return clean
  }

  const filtered = useMemo(() => beers.filter(b => {
    const text = [b.name, b.brewery, b.country, b.region, b.style, ...(b.place_names || [])].join(' ').toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (filters.rating && Number(b.rating) !== Number(filters.rating)) return false
    if (filters.brewery && b.brewery !== filters.brewery) return false
    if (filters.country && b.country !== filters.country) return false
    if (filters.style && b.style !== filters.style) return false
    if (filters.place && !(b.place_names || []).includes(filters.place)) return false
    if (filters.toTry && !b.to_try) return false
    return true
  }), [beers, query, filters])

  const stats = {
    total: beers.length,
    rated: beers.filter(b => b.rating > 0),
    breweries: new Set(beers.map(b => b.brewery).filter(Boolean)).size,
    places: new Set(beers.flatMap(b => b.place_names || [])).size
  }
  stats.average = stats.rated.length ? (stats.rated.reduce((s, b) => s + Number(b.rating), 0) / stats.rated.length).toFixed(1) : '—'

  function openBeer(beer) {
    setSelected(beer)
    setScreen('detail')
  }

  function startAdd() {
    setSelected(null)
    setForm({ ...emptyForm, places: [{ name: '', type: 'Altro', city: '' }] })
    setScreen('add')
  }

  function startEdit(beer) {
    setSelected(beer)
    const tastingDate = beer.last_tasted_at ? String(beer.last_tasted_at).slice(0, 10) : emptyForm.last_tasted_at
    setForm({
      ...emptyForm,
      ...beer,
      last_tasted_at: tastingDate,
      places: beer.places?.length ? beer.places : (beer.place_names || []).map(name => ({ name, type: 'Altro', city: '' }))
    })
    setScreen('add')
  }

  async function deleteBeer(beer) {
    setDeleteTarget(beer)
  }

  async function confirmDeleteBeer() {
    const beer = deleteTarget
    if (!beer) return
    setDeleteTarget(null)
    const local = beers.filter(b => b.id !== beer.id)
    setBeers(local)
    localStorage.setItem('beerbook-cache-' + userKey, JSON.stringify(local))
    if (!API_BASE || !userKey || !navigator.onLine || String(beer.id).startsWith('demo-')) { setSync('pending'); return }
    try {
      setSync('sync')
      const res = await fetch(API_BASE + '/api/beers/' + beer.id, { method: 'DELETE', headers: { 'x-user-key': userKey } })
      if (!res.ok) throw new Error()
      setSync('ok')
    } catch { setSync('pending') }
  }

  async function saveBeer(e) {
    e.preventDefault()
    const payload = {
      ...form,
      abv: form.abv === '' ? null : Number(form.abv),
      rating: Number(form.rating) || 0,
      places: form.places.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), type: p.type || 'Altro', city: p.city.trim() || null }))
    }
    const local = selected ? beers.map(b => b.id === selected.id ? { ...b, ...payload } : b) : [{ ...payload, id: crypto.randomUUID() }, ...beers]
    setBeers(local)
    localStorage.setItem('beerbook-cache-' + userKey, JSON.stringify(local))
    setScreen('library')
    if (!API_BASE || !userKey || !navigator.onLine) { setSync('pending'); return }
    try {
      setSync('sync')
      const method = selected ? 'PUT' : 'POST'
      const url = selected ? API_BASE + '/api/beers/' + selected.id : API_BASE + '/api/beers'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-user-key': userKey }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      await loadBeers()
    } catch { setSync('pending') }
  }

  const title = screen === 'home' ? 'Il tuo archivio' : screen === 'library' ? 'Le mie birre' : screen === 'detail' ? selected?.name : screen === 'add' ? (selected ? 'Modifica birra' : 'Aggiungi birra') : 'Impostazioni'

  const onboarding = !userKey

  return <div className={"app-shell " + (onboarding ? "onboarding-active" : "")}>
    <header className="topbar">
      <button className="brand" onClick={() => !onboarding && setScreen('home')}><span className="brand-mark">🍺</span><span>{displayName || userKey || 'Beer Book'}</span></button>
      {!onboarding && <div className="topbar-actions">
        <button className="topbar-action sync-button" onClick={syncNow} disabled={sync === 'sync'} aria-label="Sincronizza ora" title="Sincronizza ora">↻</button>
        <SyncBadge state={sync} />
        <button className="topbar-action exit-button" onClick={() => setShowExitConfirm(true)} aria-label="Esci dal profilo" title="Esci dal profilo">↪</button>
      </div>}
    </header>

    <main>
      {screen === 'onboarding' && <Onboarding onRegister={registerUser} onEnter={enterUser} />}
      {screen === 'home' && <Home displayName={displayName} userKey={userKey} stats={stats} beers={beers} onOpen={openBeer} onDelete={deleteBeer} onLibrary={() => setScreen('library')} onAdd={startAdd} onTry={() => { setFilters({ ...filters, toTry: true }); setScreen('library') }} />}
      {screen === 'library' && <Library beers={filtered} query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} onOpen={openBeer} onAdd={startAdd} onDelete={deleteBeer} />}
      {screen === 'detail' && selected && <Detail beer={selected} onBack={() => setScreen('library')} onEdit={() => startEdit(selected)} />}
      {screen === 'add' && <AddBeer form={form} setForm={setForm} onBack={() => setScreen(selected ? 'detail' : 'library')} onSave={saveBeer} />}
      {screen === 'settings' && <Settings userKey={userKey} displayName={displayName} saveUserKey={saveUserKey} />}
    </main>

    {deleteTarget && <DeleteDialog beer={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDeleteBeer} />}
    {showExitConfirm && <ExitDialog onCancel={() => setShowExitConfirm(false)} onConfirm={() => { setShowExitConfirm(false); exitProfile() }} />}

    {!onboarding && <nav className="bottom-nav">
      <NavItem active={screen === 'home'} icon="home" label="Home" onClick={() => setScreen('home')} />
      <NavItem active={screen === 'library' || screen === 'detail'} icon="bottle" label="Birre" onClick={() => setScreen('library')} />
      <button className="add-fab" onClick={startAdd} aria-label="Aggiungi birra">＋</button>
      <NavItem active={false} icon="places" label="Luoghi" onClick={() => setScreen('library')} />
      <NavItem active={screen === 'settings'} icon="settings" label="Settings" onClick={() => setScreen('settings')} />
    </nav>}
  </div>
}

function DeleteDialog({ beer, onCancel, onConfirm }) {
  return <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
    <div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={e => e.stopPropagation()}>
      <h2 id="delete-title">Vuoi eliminare questa birra?</h2>
      <p><strong>{beer.name}</strong> verrà rimossa dall’archivio.</p>
      <div className="dialog-actions">
        <button className="secondary-button" onClick={onCancel}>No, torna indietro</button>
        <button className="delete-confirm" onClick={onConfirm}>Sì, elimina</button>
      </div>
    </div>
  </div>
}

function ExitDialog({ onCancel, onConfirm }) {
  return <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
    <div className="delete-dialog exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title" onClick={e => e.stopPropagation()}>
      <div className="dialog-mark">↪</div>
      <h2 id="exit-title">Vuoi uscire dall’archivio?</h2>
      <p>Verrai riportato alla schermata iniziale. I dati già sincronizzati resteranno nel tuo archivio.</p>
      <div className="dialog-actions">
        <button className="secondary-button" onClick={onCancel}>No, resta qui</button>
        <button className="primary-button" onClick={onConfirm}>Sì, esci</button>
      </div>
    </div>
  </div>
}

function SyncBadge({ state }) {
  const map = {
    ok: ['✓', 'Sincronizzato', 'good'],
    sync: ['↻', 'Sincronizzazione…', 'working'],
    pending: ['!', 'Da sincronizzare', 'pending'],
    offline: ['×', 'Offline', 'offline']
  }
  const [icon, text, cls] = map[state] || map.offline
  return <div className={'sync-badge ' + cls}><b>{icon}</b><span>{text}</span></div>
}

function NavItem({ active, icon, label, onClick }) {
  return <button className={'nav-item ' + (active ? 'active' : '')} onClick={onClick}><span className="nav-icon"><Icon name={icon} /></span><small>{label}</small></button>
}

function Icon({ name }) {
  const common = {
    width: '1em',
    height: '1em',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.65,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  }

  if (name === 'beer') return <svg {...common}>
    <path d="M5.5 7.5h8.8v11.2H5.5z"/>
    <path d="M14.3 9.3h3a2.7 2.7 0 0 1 0 5.4h-3"/>
    <path d="M7.5 5.2c0 1 1 1 1 2.1M10.4 5.2c0 1 1 1 1 2.1"/>
    <path d="M5.5 18.7h8.8"/>
    <path d="M7.1 10.1h5.6M7.1 13h5.6"/>
  </svg>

  if (name === 'star') return <svg {...common} fill="currentColor" stroke="none">
    <path d="m12 2.6 2.78 5.63 6.21.9-4.5 4.39 1.06 6.2L12 16.8l-5.55 2.92 1.06-6.2-4.5-4.39 6.21-.9L12 2.6Z"/>
    <path d="m12 5.3 1.98 4.01 4.43.64-3.2 3.12.76 4.4L12 15.4l-3.97 2.08.76-4.4-3.2-3.12 4.43-.64L12 5.3Z" fill="none" stroke="currentColor" strokeWidth="1"/>
  </svg>

  if (name === 'brewery') return <svg {...common}>
    <path d="M3.8 20.2h16.4"/>
    <path d="M5.2 20.2V9.2L12 5.5l6.8 3.7v11"/>
    <path d="M8 20.2v-4.8h3v4.8M13 20.2v-4.8h3v4.8"/>
    <path d="M7.1 11.7h2M14.9 11.7h2M12 8.3v3.4"/>
    <path d="M3.8 9.2 12 4.8l8.2 4.4"/>
  </svg>

  if (name === 'cart') return <svg {...common}>
    <path d="M3.2 4.2h2l2.05 9.2a2.2 2.2 0 0 0 2.15 1.72h7.15a2.2 2.2 0 0 0 2.08-1.49L20.2 8H6.1"/>
    <path d="M9 18.9h.01M17.1 18.9h.01"/>
    <circle cx="9" cy="18.9" r="1.15"/>
    <circle cx="17.1" cy="18.9" r="1.15"/>
    <path d="M7.7 11.2h10.5"/>
  </svg>

  if (name === 'home') return <svg {...common}>
    <path d="m3.2 10.5 8.8-7.1 8.8 7.1"/>
    <path d="M5.1 9.6v10.2h13.8V9.6"/>
    <path d="M9.4 19.8v-6.1h5.2v6.1"/>
    <path d="M8.4 8.9h.01M12 8.9h.01M15.6 8.9h.01"/>
  </svg>

  if (name === 'bottle') return <svg {...common}>
    <path d="M10.1 3h3.8v3.1l1.1 2.1v11.1H9V8.2l1.1-2.1z"/>
    <path d="M9 10.2h6M9 12.4h6"/>
    <path d="M10.1 4.7h3.8"/>
    <path d="M11.1 19.3v-3.5h1.8v3.5"/>
  </svg>

  if (name === 'places') return <svg {...common}>
    <path d="M12 21s6.4-5.7 6.4-11.1A6.4 6.4 0 1 0 5.6 9.9C5.6 15.3 12 21 12 21Z"/>
    <circle cx="12" cy="9.7" r="2.25"/>
    <path d="M9.4 14.8c1.7.7 3.5.7 5.2 0"/>
  </svg>

  if (name === 'settings') return <svg {...common}>
    <circle cx="12" cy="12" r="3.1"/>
    <path d="M19.1 15.1a1.9 1.9 0 0 0 .4 2.1l.1.1-1.9 1.9-.1-.1a1.9 1.9 0 0 0-2.1-.4 1.9 1.9 0 0 0-1.2 1.7v.2h-2.7v-.2a1.9 1.9 0 0 0-1.2-1.7 1.9 1.9 0 0 0-2.1.4l-.1.1-1.9-1.9.1-.1a1.9 1.9 0 0 0 .4-2.1 1.9 1.9 0 0 0-1.7-1.2H4.9v-2.7h.2a1.9 1.9 0 0 0 1.7-1.2 1.9 1.9 0 0 0-.4-2.1l-.1-.1 1.9-1.9.1.1a1.9 1.9 0 0 0 2.1.4 1.9 1.9 0 0 0 1.2-1.7V4.8h2.7V5a1.9 1.9 0 0 0 1.2 1.7 1.9 1.9 0 0 0 2.1-.4l.1-.1 1.9 1.9-.1.1a1.9 1.9 0 0 0-.4 2.1 1.9 1.9 0 0 0 1.7 1.2h.2v2.7h-.2a1.9 1.9 0 0 0-1.7 1.2Z"/>
  </svg>

  return null
}

function Home({ displayName, userKey, stats, beers, onOpen, onDelete, onLibrary, onAdd, onTry }) {
  const recent = beers.slice(0, 3)
  return <section className="page home-page">
    <div className="home-hero">
      <div className="home-hero-copy">
        <p className="eyebrow">IL MIO ARCHIVIO DI BIRRE</p>
        <h1>Beer Book</h1>
        <p>Il mio archivio di birre</p>
      </div>
      <div className="hero-beer-art" aria-hidden="true">🍺</div>
    </div>

    <div className="stats-grid mock-stats">
      <Stat icon="beer" value={stats.total} label="Birre" />
      <Stat icon="star" value={stats.average} label="Voto medio" />
      <Stat icon="brewery" value={stats.breweries} label="Birrifici" />
      <Stat icon="cart" value={stats.places} label="Luoghi" />
    </div>

    <div className="section-head compact-head latest-head">
      <div><h2>Ultime birre</h2></div>
      <button className="text-button" onClick={onLibrary}>Vedi tutte ›</button>
    </div>
    <div className="recent-grid">
      {recent.map(b => <BeerCard key={b.id} beer={b} onClick={() => onOpen(b)} onDelete={() => onDelete(b)} />)}
    </div>
    {!recent.length && <EmptyState />}
  </section>
}

function Stat({ icon, value, label }) {
  return <div className="stat"><span className="stat-icon"><Icon name={icon} /></span><strong>{value}</strong><span className="stat-label">{label}</span></div>
}

function BeerCard({ beer, onClick, onDelete }) {
  return <article className="beer-card">
    <button className="beer-card-main" onClick={onClick}>
      <div className="beer-card-art"><span>🍺</span></div>
      <div className="beer-card-body">
        <strong>{beer.name}</strong>
        <span>{beer.style || 'Stile non indicato'}</span>
        <div className="card-rating"><b>{'★'.repeat(Number(beer.rating || 0))}</b><small>{beer.last_tasted_at ? String(beer.last_tasted_at).slice(0,10).split('-').reverse().join('/') : '—'}</small></div>
      </div>
    </button>
    <button className="card-delete" onClick={onDelete} aria-label={'Elimina ' + beer.name}>×</button>
  </article>
}

function Library({ beers, query, setQuery, filters, setFilters, showFilters, setShowFilters, onOpen, onAdd, onDelete }) {
  const styles = [...new Set(beers.map(b => b.style).filter(Boolean))]
  const breweries = [...new Set(beers.map(b => b.brewery).filter(Boolean))]
  return <section className="page library-page">
    <div className="page-heading library-heading">
      <div><h1>Le mie birre</h1><p>{beers.length} {beers.length === 1 ? 'birra' : 'birre'}</p></div>
      <button className="round-button" onClick={onAdd}>＋</button>
    </div>
    <div className="library-search-row">
      <div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca birra, birrificio, stile, paese..." /></div>
      <button className="filter-icon-button" onClick={() => setShowFilters(!showFilters)} aria-label="Filtri">☷</button>
    </div>
    <div className="filter-chips">
      <button className="active">★ Voto⌄</button>
      <button>♜ Birrificio</button>
      <button>🌐 Paese⌄</button>
      <button>♧ Stile⌄</button>
      <button>⌖ Città⌄</button>
      <button>◆ Tipologia⌄</button>
    </div>
    <div className="library-options">
      <label><input type="checkbox" checked={filters.toTry} onChange={e => setFilters({ ...filters, toTry:e.target.checked })} /><span>▮</span> Solo da provare</label>
      <span>Ordina per <b>Più recenti</b></span>
    </div>
    {showFilters && <div className="filter-panel">
      <label>Valutazione<select value={filters.rating} onChange={e => setFilters({ ...filters, rating: e.target.value })}><option value="">Tutte</option>{[5,4,3,2,1].map(x => <option key={x} value={x}>{x} stelle</option>)}</select></label>
      <label>Birrificio<select value={filters.brewery} onChange={e => setFilters({ ...filters, brewery: e.target.value })}><option value="">Tutti</option>{breweries.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Stile<select value={filters.style} onChange={e => setFilters({ ...filters, style: e.target.value })}><option value="">Tutti</option>{styles.map(x => <option key={x}>{x}</option>)}</select></label>
    </div>}
    <div className="library-list">{beers.map(b => <BeerRow key={b.id} beer={b} onClick={() => onOpen(b)} onDelete={() => onDelete(b)} />)}</div>
    {!beers.length && <EmptyState />}
  </section>
}

function BeerRow({ beer, onClick, onDelete }) {
  return <div className="beer-row">
    <button className="beer-row-main" onClick={onClick}>
      <div className="beer-list-art"><span>🍺</span></div>
      <div className="beer-info"><strong>{beer.name}</strong><span>{beer.brewery || 'Birrificio non indicato'}</span><small>{beer.style || 'Stile non indicato'}{beer.country ? ' · ' + beer.country : ''}{beer.abv ? ' · ' + beer.abv + '%' : ''}</small><div className="list-rating"><b>{'★'.repeat(Number(beer.rating || 0))}</b> <strong>{Number(beer.rating || 0) ? Number(beer.rating).toFixed(1) : '—'}</strong></div></div>
      <time>{beer.last_tasted_at ? String(beer.last_tasted_at).slice(0,10).split('-').reverse().join('/') : '—'}</time>
      <span className="row-more">⋮</span>
    </button>
    <button className="delete-beer" onClick={onDelete} aria-label={'Elimina ' + beer.name} title="Elimina birra">×</button>
  </div>
}

function Detail({ beer, onBack, onEdit }) {
  return <section className="page detail-page">
    <div className="detail-top"><button className="back-icon" onClick={onBack}>‹</button><button className="detail-more">•••</button></div>
    <div className="detail-hero-art"><span>🍺</span></div>
    <div className="detail-sheet">
      <p className="eyebrow">{beer.brewery || 'BIRRA'}</p>
      <h1>{beer.name}</h1>
      <h3>{beer.style || 'Stile non indicato'}</h3>
      <div className="detail-country">{beer.country ? '🇧🇪' : '🌐'} <span>{beer.country || 'Paese non indicato'}</span></div>
      <div className="detail-rating-row"><div className="big-rating">{'★'.repeat(Number(beer.rating || 0))}<span>{'★'.repeat(5 - Number(beer.rating || 0))}</span></div><strong>{Number(beer.rating || 0) ? Number(beer.rating).toFixed(1) : '—'}</strong><label className="try-toggle"><span>▮ Da provare</span><input type="checkbox" checked={!!beer.to_try} readOnly /></label></div>
      <div className="detail-facts">
        <div><b>♧</b><strong>{beer.abv ? beer.abv + '%' : '—'}</strong><span>Alcol</span></div>
        <div><b>▥</b><strong>{beer.style || '—'}</strong><span>Stile</span></div>
        <div><b>🇧🇪</b><strong>{beer.country || '—'}</strong><span>Paese</span></div>
      </div>
      <div className="detail-section tasting-section"><h3>Ultima degustazione</h3><div className="tasting-card"><b>▣</b><strong>{beer.last_tasted_at ? String(beer.last_tasted_at).slice(0,10).split('-').reverse().join('/') : '—'}</strong><span>★ {Number(beer.rating || 0) ? Number(beer.rating).toFixed(1) : '—'}</span><button onClick={onEdit}>✎</button><p>{beer.notes || 'Nessuna nota inserita.'}</p></div></div>
      <div className="detail-section places-section"><div className="section-head compact-head"><h3>Luoghi di acquisto</h3><button className="text-button">Aggiungi ›</button></div>{(beer.places || []).length ? beer.places.map((p,i)=><div className="purchase-row" key={i}><span className="purchase-icon">🛒</span><div><b>{p.name}</b><small>{p.type} · {p.city || 'Città non indicata'}</small></div><time>›</time></div>) : <p className="muted">Nessun luogo di acquisto.</p>}</div>
      <button className="primary-button full" onClick={onEdit}>Modifica scheda</button>
    </div>
  </section>
}

function Tag({ text }) { return text ? <span className="tag">{text}</span> : null }

function AddBeer({ form, setForm, onBack, onSave }) {
  const update = (key, value) => setForm({ ...form, [key]: value })
  return <section className="page add-page">
    <div className="form-top"><button className="back-icon" onClick={onBack}>‹</button><h1>{form.name ? 'Modifica birra' : 'Nuova birra'}</h1></div>
    <form className="form" onSubmit={onSave}>
      <Field label="Nome birra *"><input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Duvel" /></Field>
      <Field label="Birrificio"><input value={form.brewery} onChange={e => update('brewery', e.target.value)} placeholder="Duvel" /></Field>
      <div className="two-cols"><Field label="Paese"><input value={form.country} onChange={e => update('country', e.target.value)} placeholder="Belgio" /></Field><Field label="Stile"><input value={form.style} onChange={e => update('style', e.target.value)} placeholder="Belgian Strong Ale" /></Field></div>
      <Field label="Gradazione alcolica"><input type="number" step="0.1" min="0" value={form.abv} onChange={e => update('abv', e.target.value)} placeholder="8,5%" /></Field>
      <div className="form-secondary">
        <h2 className="tasting-title">Ultima degustazione</h2>
        <Field label="Data degustazione"><input type="date" value={form.last_tasted_at} onChange={e => update('last_tasted_at', e.target.value)} /></Field>
        <Field label="Carbonazione"><div className="segmented">{['Bassa','Media','Alta'].map(x => <button type="button" key={x} className={form.carbonation === x ? 'selected' : ''} onClick={() => update('carbonation', x)}>{x}</button>)}</div></Field>
        <Field label="Valutazione"><div className="star-input">{[1,2,3,4,5].map(x => <button type="button" key={x} className={x <= form.rating ? 'on' : ''} onClick={() => update('rating', x)}>★</button>)}</div></Field>
        <Field label="Note personali"><textarea rows="4" value={form.notes} onChange={e => update('notes', e.target.value)} /></Field>
        <Field label="Luoghi di acquisto">{form.places.map((place,index)=><div className="place-row" key={index}><input value={place.name} onChange={e=>{const places=[...form.places];places[index]={...places[index],name:e.target.value};update('places',places)}} placeholder="Nome luogo"/><select value={place.type} onChange={e=>{const places=[...form.places];places[index]={...places[index],type:e.target.value};update('places',places)}}><option>Supermercato</option><option>Pub</option><option>Bar</option><option>Ristorante</option><option>Altro</option></select><input value={place.city} onChange={e=>{const places=[...form.places];places[index]={...places[index],city:e.target.value};update('places',places)}} placeholder="Città"/><button type="button" className="remove-place" onClick={()=>update('places',form.places.length>1?form.places.filter((_,i)=>i!==index):[{name:'',type:'Altro',city:''}])}>×</button></div>)}<button type="button" className="secondary-button" onClick={()=>update('places',[...form.places,{name:'',type:'Altro',city:''}])}>＋ Aggiungi luogo</button></Field>
        <label className="switch-line"><input type="checkbox" checked={form.to_try} onChange={e=>update('to_try',e.target.checked)}/><span>Da provare</span></label>
      </div>
      <button className="primary-button full save-beer-button" type="submit">Salva birra</button>
    </form>
  </section>
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label> }

function Onboarding({ onRegister, onEnter }) {
  const [mode, setMode] = useState('create')
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const result = mode === 'create' ? await onRegister(value, name) : await onEnter(value)
    setSaving(false)
    if (!result.ok) setError(result.error)
  }

  return <section className="page onboarding">
    <div className="onboarding-hero">
      <div className="onboarding-mark">🍺</div>
      <p className="eyebrow">BENVENUTO IN BEER BOOK</p>
      <h1>{mode === 'create' ? <>Crea il tuo<br /><em>archivio personale.</em></> : <>Rientra nel tuo<br /><em>archivio.</em></>}</h1>
      <p>{mode === 'create' ? 'Prima di iniziare, scegli il nome con cui vuoi essere chiamato e un identificativo univoco per il tuo archivio.' : 'Inserisci l’identificativo del tuo archivio per continuare.'}</p>
    </div>

    <form className="form onboarding-form" onSubmit={submit}>
      {mode === 'create' && <Field label="Nome utente *"><input required value={name} onChange={e => setName(e.target.value)} placeholder="Inserisci il tuo nome" autoFocus /></Field>}
      <Field label="Identificativo univoco *">
        <input required value={value} onChange={e => setValue(e.target.value)} placeholder="Scegli un identificativo" autoCapitalize="none" autoCorrect="off" spellCheck="false" autoFocus={mode === 'enter'} />
      </Field>
      {error && <div className="form-error" role="alert">⚠ {error}</div>}
      <button className="primary-button full" type="submit" disabled={saving}>{saving ? (mode === 'create' ? 'Creazione in corso…' : 'Accesso in corso…') : (mode === 'create' ? 'Crea il mio archivio' : 'Entra nel mio archivio')}</button>
    </form>

    <div className="onboarding-switch">
      {mode === 'create' ? <>Hai già un archivio? <button type="button" onClick={() => switchMode('enter')}>Rientra nel tuo archivio →</button></> : <>Devi ancora creare un archivio? <button type="button" onClick={() => switchMode('create')}>Crea un nuovo archivio →</button></>}
    </div>
  </section>
}


function Settings({ userKey, displayName, saveUserKey }) {
  const [value, setValue] = useState(userKey)
  const [name, setName] = useState(displayName)
  return <section className="page">
    <p className="eyebrow">CONFIGURAZIONE</p><h1>Impostazioni</h1>
    <div className="settings-card">
      <h3>Profilo</h3>
      <p>Identificativo dell'archivio e nome mostrato in Home.</p>
      <label className="field"><span>Nome utente</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Inserisci il tuo nome" /></label>
      <label className="field"><span>Identificativo archivio</span><input value={value} onChange={e => setValue(e.target.value)} placeholder="Scegli un identificativo" /></label>
      <button className="primary-button" onClick={() => saveUserKey(value, name)}>Salva profilo</button>
    </div>
  </section>
}

function EmptyState() { return <div className="empty"><div>🍺</div><h3>Nessuna birra trovata</h3><p>Prova a cambiare ricerca o filtri.</p></div> }

createRoot(document.getElementById('root')).render(<App />)
