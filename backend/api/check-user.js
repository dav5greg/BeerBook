import { db, cors, json } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const key = String(req.query?.key || '').trim()
  if (!key) return json(res, 400, { error: 'key is required' })

  try {
    const sql = db()
    const users = await sql`SELECT id, identifier, created_at FROM users WHERE identifier = ${key} LIMIT 1`
    if (!users.length) return json(res, 200, { found: false, identifier: key, beers: [] })

    const beers = await sql`
      SELECT b.id, b.name, b.brewery, b.rating, b.updated_at,
             COALESCE(array_agg(DISTINCT pp.name) FILTER (WHERE pp.name IS NOT NULL), '{}') AS place_names
      FROM beers b
      LEFT JOIN beer_purchase_places bpp ON bpp.beer_id = b.id
      LEFT JOIN purchase_places pp ON pp.id = bpp.purchase_place_id
      WHERE b.user_id = ${users[0].id}
      GROUP BY b.id
      ORDER BY b.updated_at DESC
    `
    return json(res, 200, { found: true, identifier: key, beer_count: beers.length, beers })
  } catch (error) {
    return json(res, 500, { error: error.message })
  }
}
