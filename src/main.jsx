import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const emptyForm = {
  name: '', brewery: '', country: '', region: '', style: '', abv: '', rating: 0,
  description: '', notes: '', last_tasted_at: '', carbonation: '', to_try: false,
  places: [{ name: '', type: '', city: '' }]
}

function App() {
  const [screen, setScreen] = useState(localStorage.getItem('beerbook-user-key') ? 'home' : 'onboarding')
  const [beers, setBeers] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ rating: '', brewery: '', country: '', style: '', city: '', place: '', type: '', toTry: false })
  const [sortBy, setSortBy] = useState('recent')
  const [sortDirection, setSortDirection] = useState('desc')
  const [userKey, setUserKey] = useState(localStorage.getItem('beerbook-user-key') || '')
  const [displayName, setDisplayName] = useState(localStorage.getItem('beerbook-display-name') || '')
  const [form, setForm] = useState(emptyForm)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [screenHistory, setScreenHistory] = useState([])

  function navigate(nextScreen) {
    setScreenHistory(history => [...history, screen])
    setScreen(nextScreen)
  }

  function goBack() {
    setScreenHistory(history => {
      if (!history.length) return history
      const next = history[history.length - 1]
      setScreen(next)
      return history.slice(0, -1)
    })
  }

  useEffect(() => {
    if (userKey) {
      loadBeers()
      loadUserProfile()
    } else {
      setBeers([])
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/BeerBook/sw.js').catch(() => {})
  }, [])

  async function loadBeers(key = userKey) {
    if (!API_BASE || !key) {
      setBeers([])
      return
    }
    const res = await fetch(API_BASE + '/api/beers', { headers: { 'x-user-key': key } })
    if (!res.ok) throw new Error()
    const data = await res.json()
    setBeers(data.beers || [])
  }

  async function loadUserProfile(key = userKey) {
    if (!API_BASE || !key) return
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
    if (!API_BASE) return { ok: false, error: 'Servizio non disponibile.' }
    try {
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
      setScreenHistory([])
      setScreenHistory([])
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
    if (!API_BASE) return { ok: false, error: 'Servizio non disponibile.' }
    try {
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
      setScreen('home')
      await loadBeers(clean)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Impossibile creare il profilo. Controlla la connessione e riprova.' }
    }
  }

  function exitProfile() {
    localStorage.removeItem('beerbook-user-key')
    localStorage.removeItem('beerbook-display-name')
    setUserKey('')
    setDisplayName('')
    setBeers([])
    setSelected(null)
    setScreenHistory([])
    setScreen('onboarding')
  }

  async function saveUserKey(value, nameValue = displayName) {
    const clean = value.trim().toLowerCase()
    const name = nameValue.trim()
    if (!clean) return { ok: false, error: 'Inserisci un identificativo valido.' }
    if (!/^[a-z0-9_-]{3,30}$/.test(clean)) return { ok: false, error: 'L’identificativo deve essere lungo tra 3 e 30 caratteri.' }
    if (!API_BASE || !userKey) return { ok: false, error: 'Servizio non disponibile.' }
    try {
      const res = await fetch(API_BASE + '/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-key': userKey },
        body: JSON.stringify({ identifier: clean, display_name: name })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || 'Impossibile salvare il profilo.' }
      const saved = data.user?.identifier || clean
      const savedName = data.user?.display_name || ''
      setUserKey(saved)
      setDisplayName(savedName)
      localStorage.setItem('beerbook-user-key', saved)
      if (savedName) localStorage.setItem('beerbook-display-name', savedName)
      else localStorage.removeItem('beerbook-display-name')
      return { ok: true }
    } catch {
      return { ok: false, error: 'Impossibile salvare il profilo. Controlla la connessione e riprova.' }
    }
  }

  const filtered = useMemo(() => {
    const result = beers.filter(b => {
      const text = [b.name, b.brewery, b.country, b.region, b.style, ...(b.place_names || [])].join(' ').toLowerCase()
      if (query && !text.includes(query.toLowerCase())) return false
      if (filters.rating && Number(b.rating) !== Number(filters.rating)) return false
      if (filters.brewery && b.brewery !== filters.brewery) return false
      if (filters.country && b.country !== filters.country) return false
      if (filters.style && b.style !== filters.style) return false
      if (filters.place && !(b.place_names || []).includes(filters.place)) return false
      if (filters.city && !(b.places || []).some(p => p.city === filters.city)) return false
      if (filters.type && !(b.places || []).some(p => p.type === filters.type)) return false
      if (filters.toTry && !b.to_try) return false
      return true
    })
    return result.sort((a,b) => {
      let comparison = 0
      if (sortBy === 'rating') comparison = Number(a.rating || 0) - Number(b.rating || 0)
      else if (sortBy === 'name') comparison = String(a.name || '').localeCompare(String(b.name || ''), 'it')
      else if (sortBy === 'style') comparison = String(a.style || '').localeCompare(String(b.style || ''), 'it')
      else if (sortBy === 'country') comparison = String(a.country || '').localeCompare(String(b.country || ''), 'it')
      else comparison = String(a.last_tasted_at || '').localeCompare(String(b.last_tasted_at || ''))
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [beers, query, filters, sortBy, sortDirection])

  const stats = {
    total: beers.length,
    rated: beers.filter(b => b.rating > 0),
    breweries: new Set(beers.map(b => b.brewery).filter(Boolean)).size,
    places: new Set(beers.flatMap(b => b.place_names || [])).size
  }
  stats.average = stats.rated.length ? (stats.rated.reduce((s, b) => s + Number(b.rating), 0) / stats.rated.length).toFixed(1) : '—'

  function openBeer(beer) {
    setSelected(beer)
    navigate('detail')
  }

  function startAdd() {
    setSelected(null)
    setForm({ ...emptyForm, places: [{ name: '', type: '', city: '' }] })
    navigate('add')
  }

  function startEdit(beer) {
    setSelected(beer)
    const tastingDate = beer.last_tasted_at ? String(beer.last_tasted_at).slice(0, 10) : emptyForm.last_tasted_at
    setForm({
      ...emptyForm,
      ...beer,
      last_tasted_at: tastingDate,
      places: beer.places?.length ? beer.places : (beer.place_names || []).map(name => ({ name, type: '', city: '' }))
    })
    navigate('add')
  }

  async function deleteBeer(beer) {
    setDeleteTarget(beer)
  }

  async function confirmDeleteBeer() {
    const beer = deleteTarget
    if (!beer) return
    setDeleteTarget(null)
    if (!API_BASE || !userKey) return
    try {
      const res = await fetch(API_BASE + '/api/beers/' + beer.id, { method: 'DELETE', headers: { 'x-user-key': userKey } })
      if (!res.ok) throw new Error()
      await loadBeers()
    } catch {
      setBeers(beers)
    }
  }

  async function saveBeer(e) {
    e.preventDefault()
    const payload = {
      ...form,
      abv: form.abv === '' ? null : Number(form.abv),
      rating: Number(form.rating) || 0,
      places: form.places.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), type: p.type || 'Altro', city: p.city.trim() || null }))
    }
    if (!API_BASE || !userKey) return
    try {
      const method = selected ? 'PUT' : 'POST'
      const url = selected ? API_BASE + '/api/beers/' + selected.id : API_BASE + '/api/beers'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-user-key': userKey }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      await loadBeers()
      navigate('library')
    } catch {
      // Keep the form open when the online request fails.
    }
  }

  const title = screen === 'home' ? 'Il tuo archivio' : screen === 'library' ? 'Le mie birre' : screen === 'places' ? 'Luoghi di acquisto' : screen === 'detail' ? selected?.name : screen === 'add' ? (selected ? 'Modifica birra' : 'Aggiungi birra') : 'Impostazioni'

  const onboarding = !userKey

  return <div className={"app-shell " + (onboarding ? "onboarding-active" : "")}>
    <header className="topbar">
      {!onboarding && <div className="topbar-user-name">{displayName || userKey}</div>}
      {!onboarding && <button className="brand home-back-button" onClick={() => {
        if (screen === 'home') return
        if (screen === 'detail' || screen === 'add') return goBack()
        if (screen === 'home') return
        return navigate('home')
      }} aria-label={screen === 'home' ? 'Home' : 'Torna indietro'} title={screen === 'home' ? 'Home' : 'Torna indietro'}>
        <Icon name={screen === 'home' || screen === 'library' || screen === 'places' || screen === 'settings' ? 'home' : 'back'} />
      </button>}
      {!onboarding && <div className="topbar-actions">
        <button className="topbar-action exit-button" onClick={() => setShowExitConfirm(true)} aria-label="Esci dal profilo" title="Esci dal profilo"><Icon name="exit" /></button>
      </div>}
    </header>

    <main>
      {screen === 'onboarding' && <Onboarding onRegister={registerUser} onEnter={enterUser} />}
      {screen === 'home' && <Home displayName={displayName} stats={stats} beers={beers} onOpen={openBeer} onDelete={deleteBeer} onLibrary={() => navigate('library')} onAdd={startAdd} onTry={() => { setFilters({ ...filters, toTry: true }); navigate('library') }} />}
      {screen === 'library' && <Library beers={filtered} query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} sortDirection={sortDirection} setSortDirection={setSortDirection} showFilters={showFilters} setShowFilters={setShowFilters} onOpen={openBeer} onAdd={startAdd} onDelete={deleteBeer} />}
      {screen === 'places' && <Places beers={beers} onSelectPlace={(placeName) => { setFilters({ ...filters, place: placeName }); setQuery(''); setShowFilters(false); navigate('library') }} />}
      {screen === 'detail' && selected && <Detail beer={selected} onBack={goBack} onEdit={() => startEdit(selected)} />}
      {screen === 'add' && <AddBeer form={form} setForm={setForm} onBack={goBack} onSave={saveBeer} />}
      {screen === 'settings' && <Settings userKey={userKey} displayName={displayName} saveUserKey={saveUserKey} />}
    </main>

    {deleteTarget && <DeleteDialog beer={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDeleteBeer} />}
    {showExitConfirm && <ExitDialog onCancel={() => setShowExitConfirm(false)} onConfirm={() => { setShowExitConfirm(false); exitProfile() }} />}

    {!onboarding && <nav className="bottom-nav">
      <NavItem active={screen === 'home'} icon="home" label="Home" onClick={() => navigate('home')} />
      <NavItem active={screen === 'library' || screen === 'detail'} icon="beer" label="Birre" onClick={() => navigate('library')} />
      <button className="add-fab" onClick={startAdd} aria-label="Aggiungi birra">＋</button>
      <NavItem active={screen === 'places'} icon="places" label="Luoghi" onClick={() => navigate('places')} />
      <NavItem active={screen === 'settings'} icon="settings" label="Settings" onClick={() => navigate('settings')} />
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
      <p>Verrai riportato alla schermata iniziale. I dati resteranno nel tuo archivio.</p>
      <div className="dialog-actions">
        <button className="secondary-button" onClick={onCancel}>No, resta qui</button>
        <button className="primary-button" onClick={onConfirm}>Sì, esci</button>
      </div>
    </div>
  </div>
}

function NavItem({ active, icon, label, onClick }) {
  return <button className={'nav-item ' + (active ? 'active' : '')} onClick={onClick}><span className="nav-icon"><Icon name={icon} /></span><small>{label}</small></button>
}

function Icon({ name }) {
  const emoji = {
    beer: '1f37a',
    star: '2b50',
    brewery: '1f3ed',
    cart: '1f6d2',
    home: '1f3e0',
    bottle: '1f37e',
    places: '1f4cd'
  }

  if (name === 'sync') {
    return <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.8-3.9L3.5 9"/><path d="M3.5 5.5V9h3.5"/>
      <path d="M4 13a8 8 0 0 0 14.8 3.9L20.5 15"/><path d="M20.5 18.5V15H17"/>
    </svg>
  }

  if (name === 'exit') {
    return <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 5H5.5v14H10"/><path d="M13 8l4 4-4 4"/><path d="M17 12H8"/>
    </svg>
  }

  if (name === 'back') {
    return <svg className="back-icon-svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15.5 5.5-6.5 6.5 6.5 6.5"/><path d="M9.5 12h10"/>
    </svg>
  }

  if (name === 'home') {
    return <svg className="simple-home-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9.8v10.2h13V9.8"/><path d="M9.5 20v-6h5v6"/>
    </svg>
  }
  if (name === 'places') {
    return <svg className="simple-places-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/>
      <circle cx="12" cy="9.5" r="2.3"/>
    </svg>
  }
  if (name === 'bar') {
    return <svg className="simple-place-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4h10l-2.5 7.5A3 3 0 0 1 12 14a3 3 0 0 1-2.5-2.5L7 4Z"/><path d="M12 14v5M8 20h8M5 4h14"/>
    </svg>
  }
  if (name === 'restaurant') {
    return <svg className="simple-place-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3v8M4.5 3v5.5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 3v18M17 3c-2 2-3 4-3 6h3"/>
    </svg>
  }
  if (name === 'settings') {
    return <svg className="simple-settings-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10.35 2.45h3.3l.55 2.15c.42.14.82.31 1.2.5l1.95-1.05 2.34 2.34-1.05 1.95c.19.38.36.78.5 1.2l2.15.55v3.3l-2.15.55c-.14.42-.31.82-.5 1.2l1.05 1.95-2.34 2.34-1.95-1.05c-.38.19-.78.36-1.2.5l-.55 2.15h-3.3l-.55-2.15c-.42-.14-.82-.31-1.2-.5l-1.95 1.05-2.34-2.34 1.05-1.95a8.7 8.7 0 0 1-.5-1.2L2.7 13.4v-3.3l2.15-.55c.14-.42.31-.82.5-1.2L4.31 6.4l2.34-2.34L8.6 5.1c.38-.19.78-.36 1.2-.5l.55-2.15Zm1.65 6.05a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" clipRule="evenodd"/>
    </svg>
  }
  const code = emoji[name]
  if (!code) return null
  return <img
    className={'real-icon real-icon-' + name}
    src={'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/' + code + '.png'}
    alt=""
    aria-hidden="true"
  />
}

function Places({ beers, onSelectPlace }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const places = useMemo(() => {
    const map = new Map()
    beers.forEach(beer => (beer.places || []).forEach(place => {
      const name = String(place.name || '').trim()
      if (!name) return
      const key = [name.toLowerCase(), place.city || '', place.type || ''].join('|')
      const current = map.get(key) || { name, city: place.city || '', type: place.type || '', count: 0 }
      current.count += 1
      map.set(key, current)
    }))
    return [...map.values()].sort((a,b) => a.name.localeCompare(b.name, 'it'))
  }, [beers])
  const types = ['Supermercato','Pub','Bar','Ristorante','Altro']
  const filtered = places.filter(place => {
    if (type && place.type !== type) return false
    if (query && ![place.name, place.city, place.type].join(' ').toLowerCase().includes(query.toLowerCase())) return false
    return true
  })
  const iconFor = place => {
    if (place.type === 'Supermercato') return 'cart'
    if (place.type === 'Pub') return 'beer'
    if (place.type === 'Bar') return 'bar'
    if (place.type === 'Ristorante') return 'restaurant'
    return 'places'
  }
  return <section className="page places-page">
    <div className="places-heading">
      <div>
        <h1>Luoghi di acquisto</h1>
        <p>{places.length} {places.length === 1 ? 'luogo' : 'luoghi'}</p>
      </div>
    </div>
    <div className="search-box places-search search-with-clear"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca luogo di acquisto..." />{query && <button type="button" className="clear-search-button" onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={e => { e.preventDefault(); e.stopPropagation(); setQuery('') }} aria-label="Cancella ricerca" title="Cancella ricerca">×</button>}</div>
    <div className="places-type-filters">
      <button className={!type ? 'active' : ''} onClick={() => setType('')}>Tutti</button>
      {types.map(item => <button key={item} className={type === item ? 'active' : ''} onClick={() => setType(item)}>{item}</button>)}
    </div>
    <div className="places-list">
      {filtered.map(place => <button className="place-list-row" key={[place.name,place.city,place.type].join('|')} onClick={() => onSelectPlace(place.name)} aria-label={'Filtra le birre acquistate da ' + place.name}>
        <div className="place-list-icon"><Icon name={iconFor(place)} /></div>
        <div className="place-list-info"><strong>{place.name}</strong><span>{place.type || 'Altro'}{place.city ? ' · ' + place.city : ''}</span></div>
        <strong className="place-list-count">{place.count} {place.count === 1 ? 'birra' : 'birre'} <span>›</span></strong>
      </button>)}
      {!filtered.length && <div className="empty places-empty"><div>⌖</div><h3>Nessun luogo trovato</h3><p>Prova a cambiare ricerca o tipologia.</p></div>}
    </div>
  </section>
}

function Home({ displayName, userKey, stats, beers, onOpen, onDelete, onLibrary, onAdd, onTry }) {
  const recent = beers.slice(0, 3)
  return <section className="page home-page">
    <div className="home-hero">
      <div className="home-hero-copy">
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

    {beers.filter(b => b.to_try).slice(0, 3).length > 0 && <>
      <div className="section-head compact-head latest-head try-home-head">
        <div><h2>Da provare</h2></div>
      </div>
      <div className="recent-grid try-home-grid">
        {beers.filter(b => b.to_try).slice(0, 3).map(b => <BeerCard key={b.id} beer={b} compact onClick={() => onOpen(b)} onDelete={() => onDelete(b)} />)}
      </div>
    </>}
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

function BeerCard({ beer, onClick, onDelete, compact = false }) {
  return <article className={'beer-card ' + (compact ? 'compact-beer-card' : '')}>
    <button className="beer-card-main" onClick={onClick}>
      <div className="beer-card-art"><span>🍺</span></div>
      <div className="beer-card-body">
        <div className="card-info-row">
          <div className="card-title-info">
            <strong>{beer.name}</strong>
            <div className="card-subrow">
              <span>{beer.style || 'Stile non indicato'}</span>
              <small className="card-abv">{beer.abv !== null && beer.abv !== undefined && beer.abv !== '' ? beer.abv + '%' : '—'}</small>
            </div>
          </div>
        </div>
        {!compact && <div className="card-rating"><b>{'★'.repeat(Number(beer.rating || 0))}</b><small>{beer.last_tasted_at ? String(beer.last_tasted_at).slice(0,10).split('-').reverse().join('/') : '—'}</small></div>}
      </div>
    </button>
    <button className="card-delete" onClick={onDelete} aria-label={'Elimina ' + beer.name}>×</button>
  </article>
}

function Library({ beers, query, setQuery, filters, setFilters, sortBy, setSortBy, sortDirection, setSortDirection, showFilters, setShowFilters, onOpen, onAdd, onDelete }) {
  const styles = [...new Set(beers.map(b => b.style).filter(Boolean))]
  const breweries = [...new Set(beers.map(b => b.brewery).filter(Boolean))]
  return <section className="page library-page">
    <div className="page-heading library-heading">
      <div><h1>Le mie birre</h1><p>{beers.length} {beers.length === 1 ? 'birra' : 'birre'}</p></div>
      
    </div>
    <div className="library-search-row">
      <div className="search-box search-with-clear"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca birra, birrificio, stile, paese..." />{query && <button type="button" className="clear-search-button" onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={e => { e.preventDefault(); e.stopPropagation(); setQuery('') }} aria-label="Cancella ricerca" title="Cancella ricerca">×</button>}</div>
      <button className="filter-icon-button" onClick={() => setShowFilters(!showFilters)} aria-label="Apri filtri" title="Filtri">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        {Object.values(filters).filter(Boolean).length > 0 && <b>{Object.values(filters).filter(Boolean).length}</b>}
      </button>
    </div>
    <div className="library-active-filters">
      {filters.toTry && <button onClick={() => setFilters({ ...filters, toTry:false })}>🔖 Da provare ×</button>}
      {filters.rating && <button onClick={() => setFilters({ ...filters, rating:'' })}>★ {filters.rating} stelle ×</button>}
      {filters.brewery && <button onClick={() => setFilters({ ...filters, brewery:'' })}>Birrificio: {filters.brewery} ×</button>}
      {filters.country && <button onClick={() => setFilters({ ...filters, country:'' })}>Paese: {filters.country} ×</button>}
      {filters.style && <button onClick={() => setFilters({ ...filters, style:'' })}>Stile: {filters.style} ×</button>}
      {filters.place && <button onClick={() => setFilters({ ...filters, place:'' })}>Luogo: {filters.place} ×</button>}
      {filters.city && <button onClick={() => setFilters({ ...filters, city:'' })}>Città: {filters.city} ×</button>}
      {filters.type && <button onClick={() => setFilters({ ...filters, type:'' })}>Tipologia: {filters.type} ×</button>}
    </div>
    <div className="library-options">
      <label className="try-option"><input type="checkbox" checked={filters.toTry} onChange={e => setFilters({ ...filters, toTry:e.target.checked })} /><span className="try-filter-icon">🔖</span><strong>Solo da provare</strong></label>
      <div className="sort-label"><span>Ordina per</span>
        <select value={sortBy} onChange={e => {
          const value=e.target.value
          setSortBy(value)
          setSortDirection(value === 'name' ? 'asc' : 'desc')
        }}>
          <option value="recent">Più recenti</option>
          <option value="rating">Valutazione</option>
          <option value="name">Nome A–Z</option>
          <option value="style">Stile</option>
          <option value="country">Paese</option>
        </select>
        <button type="button" className="sort-direction" onClick={e => { e.preventDefault(); e.stopPropagation(); setSortDirection(d => d === 'asc' ? 'desc' : 'asc') }} aria-label={sortDirection === 'asc' ? 'Ordinamento crescente' : 'Ordinamento decrescente'} title={sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}>{sortDirection === 'asc' ? '↑' : '↓'}</button>
      </div>
    </div>
    {showFilters && <div className="filter-panel">
      <label>Valutazione<select value={filters.rating} onChange={e => setFilters({ ...filters, rating: e.target.value })}><option value="">Tutte</option>{[5,4,3,2,1].map(x => <option key={x} value={x}>{x} stelle</option>)}</select></label>
      <label>Stile<select value={filters.style} onChange={e => setFilters({ ...filters, style: e.target.value })}><option value="">Tutti</option>{styles.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Birrificio<select value={filters.brewery} onChange={e => setFilters({ ...filters, brewery: e.target.value })}><option value="">Tutti</option>{breweries.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Paese<select value={filters.country} onChange={e => setFilters({ ...filters, country: e.target.value })}><option value="">Tutti</option>{[...new Set(beers.map(b => b.country).filter(Boolean))].sort().map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Città<select value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })}><option value="">Tutte</option>{[...new Set(beers.flatMap(b => (b.places || []).map(p => p.city).filter(Boolean)))].sort().map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Tipologia<select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}><option value="">Tutte</option>{['Supermercato','Pub','Bar','Ristorante','Altro'].map(x => <option key={x}>{x}</option>)}</select></label>
    </div>}
    <div className="library-list">{beers.map(b => <BeerRow key={b.id} beer={b} onClick={() => onOpen(b)} onDelete={() => onDelete(b)} />)}</div>
    {!beers.length && <EmptyState />}
  </section>
}

function BeerRow({ beer, onClick, onDelete }) {
  return <div className="beer-row">
    <button className="beer-row-main" onClick={onClick}>
      <div className="beer-list-art"><span>🍺</span></div>
      <div className="beer-info"><strong>{beer.name}</strong><span>{beer.brewery || 'Birrificio non indicato'}</span><time>{beer.last_tasted_at ? String(beer.last_tasted_at).slice(0,10).split('-').reverse().join('/') : '—'}</time></div>
      <div className="beer-row-meta">
        <small>{beer.style || 'Stile non indicato'}</small>
        <small>{beer.country || 'Paese non indicato'}{beer.abv ? ' · ' + beer.abv + '%' : ''}</small>
        <div className="list-rating"><b>{'★'.repeat(Number(beer.rating || 0))}</b> <strong>{Number(beer.rating || 0) ? Number(beer.rating).toFixed(1) : '—'}</strong></div>
      </div>
    </button>
    <button className="delete-beer" onClick={onDelete} aria-label={'Elimina ' + beer.name} title="Elimina birra">×</button>
  </div>
}

function Detail({ beer, onBack, onEdit }) {
  const [openSections, setOpenSections] = useState({ beer: true, tasting: true, places: true })
  const toggleSection = key => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  return <section className="page detail-page">
    <div className="detail-top"><button className="back-icon" onClick={onBack}>‹</button><button className="detail-more">•••</button></div>
    <div className="detail-sheet detail-sheet-compact">
      <div className="detail-hero-card">
        <div className="detail-mug large" aria-hidden="true"><Icon name="beer" /></div>
        <div className="detail-title-copy">
          <p className="eyebrow">{beer.brewery || 'BIRRA'}</p>
          <h1>{beer.name}</h1>
          <h3>{beer.style || 'Stile non indicato'}</h3>
          <div className="detail-country"><span>{beer.country || 'Paese non indicato'}</span></div>
        </div>
      </div>

      <section className={'detail-form-section ' + (openSections.beer ? 'open' : 'collapsed')}>
        <div className="detail-section-head">
          <button type="button" className="detail-section-toggle" onClick={() => toggleSection('beer')}><span>Informazioni birra</span></button>
          <label className="detail-try-toggle"><span>Da provare</span><input type="checkbox" checked={!!beer.to_try} readOnly /></label>
          <button type="button" className="section-chevron" onClick={() => toggleSection('beer')} aria-label={openSections.beer ? 'Chiudi sezione' : 'Apri sezione'}>{openSections.beer ? '⌃' : '⌄'}</button>
        </div>
        {openSections.beer && <div className="detail-section-body">
          <div className="detail-fact-grid">
            <div><span className="detail-fact-icon">🍺</span><strong>{beer.abv ? beer.abv + '%' : '—'}</strong><small>Gradazione</small></div>
            <div><span className="detail-fact-icon">🌿</span><strong>{beer.style || '—'}</strong><small>Stile</small></div>
            <div><span className="detail-fact-icon">🌍</span><strong>{beer.country || '—'}</strong><small>Paese</small></div>
          </div>
        </div>}
      </section>

      <section className={'detail-form-section ' + (openSections.tasting ? 'open' : 'collapsed')}>
        <div className="detail-section-head">
          <button type="button" className="detail-section-toggle" onClick={() => toggleSection('tasting')}><span>Ultima degustazione</span></button>
          <button type="button" className="section-chevron" onClick={() => toggleSection('tasting')} aria-label={openSections.tasting ? 'Chiudi sezione' : 'Apri sezione'}>{openSections.tasting ? '⌃' : '⌄'}</button>
        </div>
        {openSections.tasting && <div className="detail-section-body">
          <div className="detail-tasting-top three">
            <div><span className="detail-big-icon">📅</span><strong>{beer.last_tasted_at ? String(beer.last_tasted_at).slice(0,10).split('-').reverse().join('/') : '—'}</strong><small>Data degustazione</small></div>
            <div><span className="detail-big-icon">★</span><strong className="detail-rating-number">{Number(beer.rating || 0) ? Number(beer.rating).toFixed(0) : '—'} / 5</strong><small>Valutazione</small></div>
            <div><span className="detail-big-icon carbonation-bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong>{beer.carbonation || '—'}</strong><small>Carbonazione</small></div>
          </div>
          <div className="detail-notes"><p>{beer.notes || 'Nessuna nota inserita.'}</p></div>
        </div>}
      </section>

      <section className={'detail-form-section ' + (openSections.places ? 'open' : 'collapsed')}>
        <div className="detail-section-head">
          <button type="button" className="detail-section-toggle" onClick={() => toggleSection('places')}><span>Luoghi di acquisto</span></button>
          <button type="button" className="section-chevron" onClick={() => toggleSection('places')} aria-label={openSections.places ? 'Chiudi sezione' : 'Apri sezione'}>{openSections.places ? '⌃' : '⌄'}</button>
        </div>
        {openSections.places && <div className="detail-section-body">
          {(beer.places || []).length ? [...beer.places].sort((a,b) => {
            const da = a.created_at ? new Date(a.created_at).getTime() : Number.MAX_SAFE_INTEGER
            const db = b.created_at ? new Date(b.created_at).getTime() : Number.MAX_SAFE_INTEGER
            return da - db
          }).map((p,i)=><div className="purchase-row large-purchase-row" key={i}><span className="purchase-icon">🛒</span><div><b>{p.name}</b><small>{p.type} · {p.city || 'Città non indicata'}</small></div></div>) : <p className="muted">Nessun luogo di acquisto.</p>}
        </div>}
      </section>

      <button className="primary-button full save-beer-button detail-edit-button" onClick={onEdit}>Modifica scheda</button>
    </div>
  </section>
}
function Tag({ text }) { return text ? <span className="tag">{text}</span> : null }

function AddBeer({ form, setForm, onBack, onSave }) {
  const update = (key, value) => setForm({ ...form, [key]: value })
  const [openSections, setOpenSections] = useState({ beer: true, tasting: true, places: true })

  const toggleSection = key => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  return <section className="page add-page">
    <div className="add-page-title"><h1>{form.name ? 'Modifica birra' : 'Nuova birra'}</h1></div>
    <form className="form" onSubmit={onSave}>
      <section className={'form-section ' + (openSections.beer ? 'open' : 'collapsed')}>
        <div className="form-section-head">
          <button type="button" className="form-section-toggle" onClick={() => toggleSection('beer')}>
            <span>{form.name ? 'Modifica birra' : 'Nuova birra'}</span>
          </button>
          <label className="section-try-toggle">
            <input type="checkbox" checked={form.to_try} onChange={e => update('to_try', e.target.checked)} />
            <span>Da provare</span>
          </label>
          <button type="button" className="section-chevron" onClick={() => toggleSection('beer')} aria-label={openSections.beer ? 'Chiudi sezione' : 'Apri sezione'}>
            {openSections.beer ? '⌃' : '⌄'}
          </button>
        </div>
        {openSections.beer && <div className="form-section-body">
          <Field label="Nome birra *"><input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Centenario" /></Field>
          <Field label="Birrificio"><input value={form.brewery} onChange={e => update('brewery', e.target.value)} placeholder="Birrificio Pedavena" /></Field>
          <div className="two-cols"><Field label="Paese"><PlaceAutocomplete mode="country" value={form.country} placeholder="Country" onSelect={place => update('country', place.country || place.name)} /></Field><Field label="Stile"><select className="style-select" value={form.style} onChange={e => update('style', e.target.value)}><option value="" disabled hidden>Seleziona stile</option><option>Lager</option><option>Pils</option><option>Ale</option><option>Blanche</option><option>Belga</option><option>Rossa</option><option>Sour</option><option>Stout</option><option>Altro</option></select></Field></div>
          <Field label="Gradazione alcolica"><div className="abv-input-wrap"><input type="number" step="0.1" min="0" value={form.abv} onChange={e => update('abv', e.target.value)} placeholder="5" /><span>%</span></div></Field>
        </div>}
      </section>

      <section className={'form-section ' + (openSections.tasting ? 'open' : 'collapsed')}>
        <div className="form-section-head">
          <button type="button" className="form-section-toggle" onClick={() => toggleSection('tasting')}>
            <span>Ultima degustazione</span>
          </button>
          <button type="button" className="section-chevron" onClick={() => toggleSection('tasting')} aria-label={openSections.tasting ? 'Chiudi sezione' : 'Apri sezione'}>
            {openSections.tasting ? '⌃' : '⌄'}
          </button>
        </div>
        {openSections.tasting && <div className="form-section-body">
          <Field label="Data degustazione"><div className="date-input-wrap"><input type="date" value={form.last_tasted_at} onChange={e => update('last_tasted_at', e.target.value)} />{form.last_tasted_at && <button type="button" className="clear-date-button" onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={e => { e.preventDefault(); e.stopPropagation(); update('last_tasted_at', '') }} aria-label="Cancella data" title="Cancella data">×</button>}</div></Field>
          <Field label="Carbonazione"><div className="segmented">{['Bassa','Media','Alta'].map(x => <button type="button" key={x} className={form.carbonation === x ? 'selected' : ''} onClick={() => update('carbonation', x)}>{x}</button>)}</div></Field>
          <Field label="Valutazione"><div className="star-input">{[1,2,3,4,5].map(x => <button type="button" key={x} className={x <= form.rating ? 'on' : ''} onClick={() => update('rating', x)}>★</button>)}</div></Field>
          <Field label="Note personali"><textarea rows="4" value={form.notes} onChange={e => update('notes', e.target.value)} /></Field>
        </div>}
      </section>

      <section className={'form-section ' + (openSections.places ? 'open' : 'collapsed')}>
        <div className="form-section-head">
          <button type="button" className="form-section-toggle" onClick={() => toggleSection('places')}>
            <span>Luoghi di acquisto</span>
          </button>
          <button type="button" className="section-chevron" onClick={() => toggleSection('places')} aria-label={openSections.places ? 'Chiudi sezione' : 'Apri sezione'}>
            {openSections.places ? '⌃' : '⌄'}
          </button>
        </div>
        {openSections.places && <div className="form-section-body">
          <Field label="Luoghi di acquisto">{form.places.map((place,index)=><div className="place-row" key={index}>
          <input value={place.name} onChange={e=>{const places=[...form.places];places[index]={...places[index],name:e.target.value};update('places',places)}} placeholder="Nome luogo"/>
          <select required value={place.type} onChange={e=>{const places=[...form.places];places[index]={...places[index],type:e.target.value};update('places',places)}}><option value="" disabled>Tipologia</option><option>Supermercato</option><option>Pub</option><option>Bar</option><option>Ristorante</option><option>Altro</option></select>
          <input value={place.city} onChange={e=>{const places=[...form.places];places[index]={...places[index],city:e.target.value};update('places',places)}} placeholder="Città"/>
          <button type="button" className="remove-place" onClick={()=>update('places',form.places.length>1?form.places.filter((_,i)=>i!==index):[{name:'',type:'',city:''}])} aria-label="Rimuovi luogo" title="Rimuovi luogo"><span aria-hidden="true">×</span></button>
        </div>)}<button type="button" className="secondary-button" onClick={()=>update('places',[...form.places,{name:'',type:'',city:''}])}>＋ Aggiungi luogo</button></Field>
        </div>}
      </section>

      <button className="primary-button full save-beer-button" type="submit">Salva birra</button>
    </form>
  </section>
}

function PlaceAutocomplete({ mode, value, placeholder, onSelect, city = '', placeType = '', disabled = false }) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [selectedQuery, setSelectedQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (String(value || '') !== query && String(value || '') !== selectedQuery) {
      setQuery(value || '')
      setSelectedQuery(value || '')
    }
  }, [value])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2 || text === selectedQuery.trim()) {
      setSuggestions([])
      return
    }
    if (mode === 'place' && city.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        let endpoint
        if (mode === 'country') {
          endpoint = 'https://countries.dev/name/' + encodeURIComponent(text) + '?fields=name,alpha2Code,flag&limit=7'
        } else if (mode === 'city') {
          endpoint = 'https://countries.dev/cities?q=' + encodeURIComponent(text) + '&limit=7'
        } else {
          endpoint = API_BASE + '/api/place-search?input=' + encodeURIComponent(text) + '&city=' + encodeURIComponent(city) + '&type=' + encodeURIComponent(placeType)
        }
        const res = await fetch(endpoint)
        const data = await res.json().catch(() => ({}))
        const items = Array.isArray(data) ? data : (data.suggestions || [])
        setSuggestions(mode === 'country'
          ? items.map(item => ({ key: item.alpha2Code, name: item.name, flag: item.flag || '🌐' }))
          : mode === 'city'
            ? items.map(item => ({ key: String(item.id || item.name + item.countryCode), name: item.name, secondary: item.adminRegion || item.countryCode || '' }))
            : items.map(item => ({ key: item.id, name: item.name, secondary: item.address || '' }))
        )
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, mode, value, city, placeType])

  function choose(item) {
    setOpen(false)
    setSuggestions([])
    const label = mode === 'country' ? item.flag + ' ' + item.name : item.name
    setQuery(label)
    setSelectedQuery(label)
    onSelect({ name: item.name, country: item.name, label })
  }

  return <div className="place-autocomplete">
    <input
      value={query}
      onChange={e => {
        setQuery(e.target.value)
        setSelectedQuery('')
        onSelect({ name: e.target.value, country: e.target.value, label: e.target.value })
      }}
      onFocus={() => suggestions.length && setOpen(true)}
      onBlur={() => setTimeout(() => setOpen(false), 180)}
      placeholder={placeholder}
      autoComplete="off"
    />
    {loading && <span className="autocomplete-spinner" aria-hidden="true">⌕</span>}
    {open && suggestions.length > 0 && <div className="autocomplete-menu">
      {suggestions.map(item => <button type="button" key={item.key} onMouseDown={e => e.preventDefault()} onClick={() => choose(item)}>
        {mode === 'country' && <span className="suggestion-flag">{item.flag}</span>}
        <span><strong>{item.name}</strong>{item.secondary && <small>{item.secondary}</small>}</span>
      </button>)}
    </div>}
  </div>
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
  const [message, setMessage] = useState('')

  useEffect(() => {
    setValue(userKey)
    setName(displayName)
  }, [userKey, displayName])

  async function save() {
    setMessage('')
    const result = await saveUserKey(value, name)
    setMessage(result?.ok ? 'Profilo salvato.' : (result?.error || 'Impossibile salvare il profilo.'))
  }

  return <section className="page library-page settings-page">
    <div className="page-heading library-heading">
      <div><h1>Impostazioni</h1></div>
    </div>
    <div className="settings-card">
      <h3>Profilo</h3>
      <p>Nome mostrato in Home e identificativo dell'archivio.</p>
      <label className="field"><span>Nome utente</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Inserisci il tuo nome" /></label>
      <label className="field"><span>Identificativo archivio</span><input value={value} onChange={e => setValue(e.target.value)} placeholder="Scegli un identificativo" /></label>
      <button className="primary-button" onClick={save}>Salva profilo</button>
      {message && <p className="settings-save-message">{message}</p>}
    </div>
  </section>
}

function EmptyState() { return <div className="empty"><div>🍺</div><h3>Nessuna birra trovata</h3><p>Prova a cambiare ricerca o filtri.</p></div> }

createRoot(document.getElementById('root')).render(<App />)
