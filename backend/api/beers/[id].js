import { db, cors, json, userKey } from '../_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    const sql = db()
    const key = userKey(req)
    if (!key) return json(res, 400, { error: 'Missing x-user-key' })
    const users = await sql`SELECT id FROM users WHERE identifier = ${key}`
    if (!users.length) return json(res, 404, { error: 'User not found' })
    const uid = users[0].id
    const id = req.query.id

    if (req.method === 'DELETE') {
      await sql`DELETE FROM beers WHERE id=${id} AND user_id=${uid}`
      return json(res, 200, { ok: true })
    }

    if (req.method === 'PUT') {
      const b = req.body || {}
      await sql`
        UPDATE beers SET name=${b.name}, brewery=${b.brewery || null}, country=${b.country || null}, region=${b.region || null},
        style=${b.style || null}, abv=${b.abv ?? null}, description=${b.description || null}, rating=${b.rating || 0},
        notes=${b.notes || null}, last_tasted_at=${b.last_tasted_at || null}, carbonation=${b.carbonation || 'Media'},
        to_try=${!!b.to_try}, updated_at=NOW()
        WHERE id=${id} AND user_id=${uid}
      `
      return json(res, 200, { ok: true })
    }

    return json(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    return json(res, 500, { error: error.message })
  }
}
