import { db, cors, json } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    const sql = db()
    const rows = await sql`SELECT 1 AS ok`
    return json(res, 200, { ok: rows[0]?.ok === 1 })
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message })
  }
}
