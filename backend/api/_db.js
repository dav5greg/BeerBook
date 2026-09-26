import { neon } from '@neondatabase/serverless'

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  return neon(process.env.DATABASE_URL)
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-key')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
}

export function userKey(req) {
  return String(req.headers['x-user-key'] || '').trim()
}

export function json(res, status, body) {
  res.status(status).json(body)
}
