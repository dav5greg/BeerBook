import { cors, json } from './_db.js'

const GOOGLE_URL = 'https://places.googleapis.com/v1/places:autocomplete'
const GOOGLE_DETAILS = placeId => 'https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId)

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
}

function component(components, type) {
  return components?.find(c => (c.types || []).includes(type)) || null
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return json(res, 503, { error: 'Google Places non configurato' })

  const mode = String(req.query?.mode || 'city')
  const input = String(req.query?.input || '').trim()

  try {
    if (mode === 'details') {
      const placeId = String(req.query?.placeId || '').trim()
      if (!placeId) return json(res, 400, { error: 'Missing placeId' })

      const response = await fetch(GOOGLE_DETAILS(placeId), {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'id,displayName,addressComponents'
        }
      })
      const data = await response.json()
      if (!response.ok) return json(res, response.status, { error: data.error?.message || 'Google Places error' })

      const components = data.addressComponents || []
      const country = component(components, 'country')
      const city = component(components, 'locality') || component(components, 'postal_town')
      const province = component(components, 'administrative_area_level_2') || component(components, 'administrative_area_level_1')

      return json(res, 200, {
        place: {
          id: data.id || placeId,
          name: data.displayName?.text || '',
          country: country?.longText || '',
          countryCode: country?.shortText || '',
          city: city?.longText || '',
          province: province?.shortText || province?.longText || ''
        }
      })
    }

    if (input.length < 2) return json(res, 200, { suggestions: [] })

    const body = {
      input,
      languageCode: 'it',
      includedPrimaryTypes: mode === 'country' ? ['(regions)'] : ['(cities)']
    }

    const response = await fetch(GOOGLE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
      },
      body: JSON.stringify(body)
    })
    const data = await response.json()
    if (!response.ok) return json(res, response.status, { error: data.error?.message || 'Google Places error' })

    const suggestions = (data.suggestions || [])
      .map(item => item.placePrediction)
      .filter(Boolean)
      .map(prediction => ({
        placeId: prediction.placeId,
        text: prediction.text?.text || '',
        secondary: prediction.structuredFormat?.secondaryText?.text || '',
        flag: mode === 'country' ? countryFlag(prediction.text?.text === 'Italia' ? 'IT' : '') : ''
      }))

    return json(res, 200, { suggestions })
  } catch (error) {
    return json(res, 500, { error: error.message })
  }
}
