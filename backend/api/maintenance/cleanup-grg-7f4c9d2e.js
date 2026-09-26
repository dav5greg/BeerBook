import { sql } from '../_db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const user = await sql`SELECT id, identifier FROM users WHERE identifier = 'grg'`
  if (!user.length) return res.status(200).json({ ok: true, deleted: false, reason: 'grg not found' })
  await sql`DELETE FROM users WHERE identifier = 'grg'`
  return res.status(200).json({ ok: true, deleted: true, identifier: 'grg' })
}
