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

  const escapedInput = input.replace(/[\\.*+?^${}()|[\]]/g, '\\$&')
  const escapedCity = city.replace(/"/g, '\\"')
  const filters = { Supermercato: '["shop"="supermarket"]', Pub: '["amenity"="pub"]', Bar: '["amenity"="cafe"]', Ristorante: '["amenity"="restaurant"]' }
  const category = filters[type] || ''
  const query = '[out:json][timeout:12];\narea["name"="' + escapedCity + '"]["boundary"="administrative"]->.searchArea;\nnwr["name"~"' + escapedInput + '","i"]' + category + '(area.searchArea);\nout tags center 15;'

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: query })
    if (!response.ok) throw new Error('Overpass HTTP ' + response.status)
    const data = await response.json()
    const suggestions = (data.elements || []).filter(item => item.tags?.name).map(item => ({
      id: String(item.id), name: item.tags.name,
      address: item.tags['addr:street'] ? item.tags['addr:street'] + (item.tags['addr:housenumber'] ? ' ' + item.tags['addr:housenumber'] : '') : ''
    })).slice(0, 8)
    return res.status(200).json({ suggestions })
  } catch (error) {
    return res.status(200).json({ suggestions: [], error: 'place-search-unavailable' })
  }
}