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
      const newIdentifier = String(req.body?.identifier || key).trim().toLowerCase()
      const displayName = String(req.body?.display_name || '').trim()
      if (!/^[a-z0-9_-]{3,30}$/.test(newIdentifier)) {
        return json(res, 400, { error: 'L’identificativo deve essere lungo tra 3 e 30 caratteri.' })
      }
      const current = await sql`SELECT id, identifier, display_name FROM users WHERE identifier=${key}`
      if (!current.length) return json(res, 404, { error: 'Archivio non trovato' })
      if (newIdentifier !== key) {
        const existing = await sql`SELECT id FROM users WHERE identifier=${newIdentifier}`
        if (existing.length) return json(res, 409, { error: 'Identificativo univoco già utilizzato' })
      }
      const rows = await sql`
        UPDATE users
        SET identifier=${newIdentifier}, display_name=${displayName || null}
        WHERE id=${current[0].id}
        RETURNING identifier, display_name
      `
      return json(res, 200, { user: rows[0] })
    }

    return json(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    return json(res, 500, { error: error.message })
  }
}

// Keep this endpoint deployment-triggerable when the Git integration is slow to pick up a backend-only change.
