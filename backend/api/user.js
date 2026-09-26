import { db, cors, json, userKey } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    const sql = db()
    const key = userKey(req)
    if (!key) return json(res, 400, { error: 'Missing x-user-key' })

    if (req.method === 'GET') {
      const rows = await sql`SELECT identifier, display_name FROM users WHERE identifier=${key}`
      if (!rows.length) return json(res, 404, { error: 'User not found' })
      return json(res, 200, { user: rows[0] })
    }

    if (req.method === 'POST') {
      const displayName = String(req.body?.display_name || '').trim()
      if (!displayName) return json(res, 400, { error: 'Display name required' })
      const existing = await sql`SELECT identifier FROM users WHERE identifier=${key}`
      if (existing.length) return json(res, 409, { error: 'Identificativo univoco già utilizzato' })
      const rows = await sql`
        INSERT INTO users (identifier, display_name)
        VALUES (${key}, ${displayName})
        RETURNING identifier, display_name
      `
      return json(res, 201, { user: rows[0] })
    }

    if (req.method === 'PUT') {
      const displayName = String(req.body?.display_name || '').trim()
      const rows = await sql`
        INSERT INTO users (identifier, display_name)
        VALUES (${key}, ${displayName || null})
        ON CONFLICT (identifier)
        DO UPDATE SET display_name=EXCLUDED.display_name
        RETURNING identifier, display_name
      `
      return json(res, 200, { user: rows[0] })
    }

    return json(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    return json(res, 500, { error: error.message })
  }
}
