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
  const [screen, setScreen] = useState('home')
  const [beers, setBeers] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ rating: '', brewery: '', country: '', style: '', city: '', place: '', type: '', toTry: false })
  const [userKey, setUserKey] = useState(localStorage.getItem('beerbook-user-key') || '')
  const [displayName, setDisplayName] = useState(localStorage.getItem('beerbook-display-name') || '')
  const [sync, setSync] = useState('offline')
  const [form, setForm] = useState(emptyForm)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadBeers()
    loadUserProfile()
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

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setScreen('home')}><span className="brand-mark">🍺</span><span>Beer Book</span></button>
      <SyncBadge state={sync} />
    </header>

    <main>
      {screen === 'home' && <Home displayName={displayName} userKey={userKey} stats={stats} beers={beers} onOpen={openBeer} onLibrary={() => setScreen('library')} onAdd={startAdd} onTry={() => { setFilters({ ...filters, toTry: true }); setScreen('library') }} />}
      {screen === 'library' && <Library beers={filtered} query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} onOpen={openBeer} onAdd={startAdd} />}
      {screen === 'detail' && selected && <Detail beer={selected} onBack={() => setScreen('library')} onEdit={() => startEdit(selected)} />}
      {screen === 'add' && <AddBeer form={form} setForm={setForm} onBack={() => setScreen(selected ? 'detail' : 'library')} onSave={saveBeer} />}
      {screen === 'settings' && <Settings userKey={userKey} displayName={displayName} saveUserKey={saveUserKey} sync={sync} onReload={loadBeers} />}
    </main>

    <nav className="bottom-nav">
      <NavItem active={screen === 'home'} icon="⌂" label="Home" onClick={() => setScreen('home')} />
      <NavItem active={screen === 'library' || screen === 'detail'} icon="▤" label="Birre" onClick={() => setScreen('library')} />
      <button className="add-fab" onClick={startAdd} aria-label="Aggiungi birra">＋</button>
      <NavItem active={screen === 'settings'} icon="⚙" label="Impostazioni" onClick={() => setScreen('settings')} />
    </nav>
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
  return <button className={'nav-item ' + (active ? 'active' : '')} onClick={onClick}><span>{icon}</span><small>{label}</small></button>
}

function Home({ displayName, userKey, stats, beers, onOpen, onLibrary, onAdd, onTry }) {
  const recent = beers.slice(0, 3)
  return <section className="page">
    <div className="hero">
      <p className="eyebrow">IL TUO ARCHIVIO</p>
      <p className="home-greeting">Ciao, <strong>{displayName || userKey || 'birraio'}</strong> 👋</p>
      <h1>Che birra<br /><em>stappiamo?</em></h1>
      <p className="hero-copy">Tutto quello che hai bevuto, in un unico posto.</p>
      <button className="search-hero" onClick={onLibrary}>⌕ <span>Cerca una birra, un birrificio…</span></button>
    </div>

    <div className="quick-row">
      <button onClick={() => onLibrary()}>★ <b>5 stelle</b></button>
      <button onClick={onTry}>✦ <b>Da provare</b></button>
      <button onClick={onLibrary}>☰ <b>Tutte</b></button>
    </div>

    <div className="stats-grid">
      <Stat value={stats.total} label="Birre" />
      <Stat value={stats.average} label="Media" />
      <Stat value={stats.breweries} label="Birrifici" />
      <Stat value={stats.places} label="Luoghi" />
    </div>

    <div className="section-head"><div><p className="eyebrow">ARCHIVIO</p><h2>Le mie birre</h2></div><button className="text-button" onClick={onLibrary}>Vedi tutte →</button></div>
    <div className="beer-stack">{recent.map(b => <BeerRow key={b.id} beer={b} onClick={() => onOpen(b)} />)}</div>
    <button className="primary-button full" onClick={onAdd}>＋ Aggiungi una birra</button>
  </section>
}

function Stat({ value, label }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div> }

function Library({ beers, query, setQuery, filters, setFilters, showFilters, setShowFilters, onOpen, onAdd }) {
  const styles = [...new Set(beers.map(b => b.style).filter(Boolean))]
  const breweries = [...new Set(beers.map(b => b.brewery).filter(Boolean))]
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">ARCHIVIO</p><h1>Le mie birre</h1></div><button className="round-button" onClick={onAdd}>＋</button></div>
    <div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca birra, birrificio, stile…" /></div>
    <button className={'filter-toggle ' + (showFilters ? 'active' : '')} onClick={() => setShowFilters(!showFilters)}>⚙ Filtri {Object.values(filters).filter(Boolean).length ? '•' : ''}</button>
    {showFilters && <div className="filter-panel">
      <label>Valutazione<select value={filters.rating} onChange={e => setFilters({ ...filters, rating: e.target.value })}><option value="">Tutte</option>{[5,4,3,2,1].map(x => <option key={x} value={x}>{x} stelle</option>)}</select></label>
      <label>Birrificio<select value={filters.brewery} onChange={e => setFilters({ ...filters, brewery: e.target.value })}><option value="">Tutti</option>{breweries.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Stile<select value={filters.style} onChange={e => setFilters({ ...filters, style: e.target.value })}><option value="">Tutti</option>{styles.map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={filters.toTry} onChange={e => setFilters({ ...filters, toTry: e.target.checked })} /> Solo da provare</label>
    </div>}
    <p className="result-count">{beers.length} {beers.length === 1 ? 'birra' : 'birre'}</p>
    <div className="beer-stack">{beers.map(b => <BeerRow key={b.id} beer={b} onClick={() => onOpen(b)} />)}</div>
    {!beers.length && <EmptyState />}
  </section>
}

function BeerRow({ beer, onClick }) {
  return <button className="beer-row" onClick={onClick}>
    <div className="beer-avatar">🍺</div>
    <div className="beer-info"><strong>{beer.name}</strong><span>{beer.brewery || 'Birrificio non indicato'}</span><small>{beer.style || 'Stile non indicato'}{beer.abv ? ' · ' + beer.abv + '%' : ''}</small></div>
    <div className="beer-rating">{'★'.repeat(Number(beer.rating || 0))}<span>{'★'.repeat(5 - Number(beer.rating || 0))}</span></div>
  </button>
}

function Detail({ beer, onBack, onEdit }) {
  return <section className="page">
    <button className="back-button" onClick={onBack}>← Le mie birre</button>
    <div className="detail-card">
      <div className="detail-art">🍺</div>
      <p className="eyebrow">{beer.style || 'BIRRA'}</p>
      <h1>{beer.name}</h1>
      <h3>{beer.brewery}</h3>
      <div className="big-rating">{'★'.repeat(Number(beer.rating || 0))}<span>{'★'.repeat(5 - Number(beer.rating || 0))}</span></div>
      <div className="tag-row"><Tag text={beer.country} /><Tag text={beer.abv ? beer.abv + '% vol.' : 'ABV —'} /><Tag text={'Carbonazione ' + (beer.carbonation || 'Media').toLowerCase()} /></div>
      {beer.description && <div className="detail-section"><p className="eyebrow">DESCRIZIONE</p><p>{beer.description}</p></div>}
      {beer.notes && <div className="note-card"><p className="eyebrow">LE MIE NOTE</p><p>{beer.notes}</p></div>}
      <div className="detail-meta"><span>Ultima degustazione</span><b>{beer.last_tasted_at || '—'}</b></div>
      {beer.to_try && <div className="try-banner">✦ Da provare</div>}
      <button className="primary-button full" onClick={onEdit}>Modifica scheda</button>
    </div>
  </section>
}

function Tag({ text }) { return text ? <span className="tag">{text}</span> : null }

function AddBeer({ form, setForm, onBack, onSave }) {
  const update = (key, value) => setForm({ ...form, [key]: value })
  return <section className="page">
    <button className="back-button" onClick={onBack}>← Indietro</button>
    <p className="eyebrow">SCHEDA BIRRA</p>
    <h1>{form.name ? 'Modifica' : 'Aggiungi'} una birra</h1>
    <form className="form" onSubmit={onSave}>
      <Field label="Nome *"><input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Es. Duvel" /></Field>
      <Field label="Birrificio"><input value={form.brewery} onChange={e => update('brewery', e.target.value)} /></Field>
      <div className="two-cols"><Field label="Paese"><input value={form.country} onChange={e => update('country', e.target.value)} /></Field><Field label="Regione / città"><input value={form.region} onChange={e => update('region', e.target.value)} /></Field></div>
      <Field label="Stile"><input value={form.style} onChange={e => update('style', e.target.value)} placeholder="Es. IPA" /></Field>
      <div className="two-cols"><Field label="ABV %"><input type="number" step="0.1" min="0" value={form.abv} onChange={e => update('abv', e.target.value)} /></Field><Field label="Ultima degustazione"><input type="date" value={form.last_tasted_at} onChange={e => update('last_tasted_at', e.target.value)} /></Field></div>
      <Field label="Carbonazione"><div className="segmented">{['Bassa','Media','Alta'].map(x => <button type="button" key={x} className={form.carbonation === x ? 'selected' : ''} onClick={() => update('carbonation', x)}>{x}</button>)}</div></Field>
      <Field label="Valutazione"><div className="star-input">{[1,2,3,4,5].map(x => <button type="button" key={x} className={x <= form.rating ? 'on' : ''} onClick={() => update('rating', x)}>★</button>)}</div></Field>
      <Field label="Descrizione"><textarea rows="3" value={form.description} onChange={e => update('description', e.target.value)} /></Field>
      <Field label="Le mie note"><textarea rows="4" value={form.notes} onChange={e => update('notes', e.target.value)} /></Field>
      <Field label="Luoghi di acquisto">
        {form.places.map((place, index) => <div className="place-row" key={index}>
          <input value={place.name} onChange={e => { const places = [...form.places]; places[index] = { ...places[index], name: e.target.value }; update('places', places) }} placeholder="Nome luogo" />
          <select value={place.type} onChange={e => { const places = [...form.places]; places[index] = { ...places[index], type: e.target.value }; update('places', places) }}>
            <option>Supermercato</option><option>Pub</option><option>Bar</option><option>Ristorante</option><option>Altro</option>
          </select>
          <input value={place.city} onChange={e => { const places = [...form.places]; places[index] = { ...places[index], city: e.target.value }; update('places', places) }} placeholder="Città" />
          {form.places.length > 1 && <button type="button" className="remove-place" onClick={() => update('places', form.places.filter((_, i) => i !== index))}>×</button>}
        </div>)}
        <button type="button" className="secondary-button" onClick={() => update('places', [...form.places, { name: '', type: 'Altro', city: '' }])}>＋ Aggiungi luogo</button>
      </Field>
      <label className="switch-line"><input type="checkbox" checked={form.to_try} onChange={e => update('to_try', e.target.checked)} /><span>Da provare</span></label>
      <button className="primary-button full" type="submit">Salva birra</button>
    </form>
  </section>
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label> }

function Settings({ userKey, displayName, saveUserKey, sync, onReload }) {
  const [value, setValue] = useState(userKey)
  const [name, setName] = useState(displayName)
  return <section className="page">
    <p className="eyebrow">CONFIGURAZIONE</p><h1>Impostazioni</h1>
    <div className="settings-card"><h3>Profilo</h3><p>Identificativo dell'archivio e nome mostrato in Home.</p><label className="field"><span>Nome utente</span><input value={name} onChange={e => setName(e.target.value)} placeholder="es. Greg" /></label><label className="field"><span>Identificativo archivio</span><input value={value} onChange={e => setValue(e.target.value)} placeholder="es. greg-beer" /></label><button className="primary-button" onClick={async () => { const clean = await saveUserKey(value, name); await onReload(clean) }}>Salva profilo</button></div>
    <div className="settings-card"><h3>Sincronizzazione</h3><SyncBadge state={sync} /><p className="muted">Il dispositivo conserva una copia locale per poter consultare l'archivio anche senza connessione.</p><button className="secondary-button" onClick={onReload}>↻ Sincronizza ora</button></div>
  </section>
}

function EmptyState() { return <div className="empty"><div>🍺</div><h3>Nessuna birra trovata</h3><p>Prova a cambiare ricerca o filtri.</p></div> }

createRoot(document.getElementById('root')).render(<App />)
