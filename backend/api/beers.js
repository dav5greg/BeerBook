import { db, cors, json, userKey } from './_db.js'

async function getUser(sql, key) {
  if (!key) throw new Error('Missing x-user-key')
  const rows = await sql`INSERT INTO users (identifier) VALUES (${key}) ON CONFLICT (identifier) DO UPDATE SET identifier = EXCLUDED.identifier RETURNING id`
  return rows[0].id
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    const sql = db()
    const key = userKey(req)
    const uid = await getUser(sql, key)

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT b.*,
          COALESCE(array_agg(DISTINCT pp.name) FILTER (WHERE pp.name IS NOT NULL), '{}') AS place_names,
          COALESCE(
            jsonb_agg(DISTINCT jsonb_build_object('name', pp.name, 'type', pp.type, 'city', pp.city, 'created_at', bpp.created_at))
            FILTER (WHERE pp.id IS NOT NULL), '[]'::jsonb
          ) AS places
        FROM beers b
        LEFT JOIN beer_purchase_places bpp ON bpp.beer_id = b.id
        LEFT JOIN purchase_places pp ON pp.id = bpp.purchase_place_id
        WHERE b.user_id = ${uid}
        GROUP BY b.id
        ORDER BY b.updated_at DESC
      `
      return json(res, 200, { beers: rows })
    }

    const body = req.body || {}
    if (!body.name) return json(res, 400, { error: 'name is required' })

    if (req.method === 'POST') {
      const rows = await sql`
        INSERT INTO beers (user_id,name,brewery,country,region,style,abv,description,rating,notes,last_tasted_at,carbonation,to_try)
        VALUES (${uid},${body.name},${body.brewery || null},${body.country || null},${body.region || null},${body.style || null},${body.abv ?? null},${body.description || null},${body.rating || 0},${body.notes || null},${body.last_tasted_at || null},${body.carbonation || 'Media'},${!!body.to_try})
        RETURNING id
      `
      await syncPlaces(sql, uid, rows[0].id, body.places || (body.place_names || []).map(name => ({ name })))
      return json(res, 201, { id: rows[0].id })
    }

    return json(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    return json(res, 500, { error: error.message })
  }
}

export async function syncPlaces(sql, uid, beerId, places) {
  const wanted = []
  for (const place of places) {
    const name = String(place?.name || '').trim()
    if (!name) continue
    const type = String(place?.type || 'Altro').trim() || 'Altro'
    const city = String(place?.city || '').trim() || null
    const rows = await sql`
      INSERT INTO purchase_places (user_id,name,type,city)
      VALUES (${uid},${name},${type},${city})
      ON CONFLICT (user_id,name)
      DO UPDATE SET type=EXCLUDED.type, city=EXCLUDED.city, updated_at=NOW()
      RETURNING id
    `
    wanted.push(rows[0].id)
    await sql`INSERT INTO beer_purchase_places (beer_id,purchase_place_id) VALUES (${beerId},${rows[0].id}) ON CONFLICT DO NOTHING`
  }
  if (wanted.length) {
    await sql`DELETE FROM beer_purchase_places WHERE beer_id = ${beerId} AND NOT (purchase_place_id = ANY(${wanted}::uuid[]))`
  } else {
    await sql`DELETE FROM beer_purchase_places WHERE beer_id = ${beerId}`
  }
}
