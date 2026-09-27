export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-user-key')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const input = String(req.query?.input || '').trim()
  const city = String(req.query?.city || '').trim()
  const type = String(req.query?.type || '').trim()
  if (input.length < 2 || city.length < 2) return res.status(200).json({ suggestions: [] })

  const searchText = input + ' ' + city
  const typeFilters = {
    Supermercato: value => value === 'supermarket',
    Pub: value => value === 'pub',
    Bar: value => value === 'cafe',
    Ristorante: value => value === 'restaurant',
  }

  try {
    const response = await fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(searchText) + '&limit=12&lang=it')
    if (!response.ok) throw new Error('Photon HTTP ' + response.status)
    const data = await response.json()
    const filter = typeFilters[type]
    const suggestions = (data.features || []).filter(item => {
      if (!filter) return true
      return filter(item.properties?.osm_value)
    }).map(item => {
      const p = item.properties || {}
      const address = [p.street, p.housenumber].filter(Boolean).join(' ')
      return { id: String(p.osm_id || Math.random()), name: p.name, address }
    }).filter(item => item.name).slice(0, 8)
    return res.status(200).json({ suggestions })
  } catch (error) {
    return res.status(200).json({ suggestions: [], error: 'place-search-unavailable' })
  }
}