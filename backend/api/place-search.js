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

  const typeTags = {
    Supermercato: 'shop:supermarket',
    Pub: 'amenity:pub',
    Bar: 'amenity:cafe',
    Ristorante: 'amenity:restaurant',
  }

  try {
    const cityResponse = await fetch('https://countries.dev/cities?q=' + encodeURIComponent(city) + '&limit=1')
    if (!cityResponse.ok) return res.status(200).json({ suggestions: [] })
    const cityData = await cityResponse.json()
    const cityMatch = Array.isArray(cityData) ? cityData[0] : null
    if (!cityMatch?.latitude || !cityMatch?.longitude) return res.status(200).json({ suggestions: [] })

    const lat = Number(cityMatch.latitude)
    const lng = Number(cityMatch.longitude)
    const delta = 0.12
    const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(',')
    const tag = typeTags[type] ? '&osm_tag=' + encodeURIComponent(typeTags[type]) : ''

    const response = await fetch(
      'https://photon.komoot.io/api/?q=' + encodeURIComponent(input) +
      '&limit=12&lang=it&bbox=' + encodeURIComponent(bbox) + tag
    )
    if (!response.ok) throw new Error('Photon HTTP ' + response.status)

    const data = await response.json()
    const suggestions = (data.features || [])
      .filter(item => item.properties?.name)
      .map(item => {
        const p = item.properties || {}
        const address = [p.street, p.housenumber].filter(Boolean).join(' ')
        return {
          id: String(p.osm_id || p.name),
          name: p.name,
          address,
        }
      })
      .filter(item => item.name)
      .slice(0, 8)

    return res.status(200).json({ suggestions })
  } catch (error) {
    return res.status(200).json({ suggestions: [], error: 'place-search-unavailable' })
  }
}