# Beer Book

Personal beer archive, built as a mobile-first PWA.

## Architecture

- Frontend: React + Vite → GitHub Pages
- Backend: Vercel serverless API → Neon PostgreSQL
- Offline: PWA cache + local data cache
- Photos: Wave 3

## Production URLs

- Frontend: https://dav5greg.github.io/BeerBook/
- Backend: configured separately on Vercel

## Database

The initial schema is in `backend/migrations/001_initial.sql`.

The Beer Book V1 data model is intentionally small:
`users`, `beers`, `purchase_places`, `beer_purchase_places`.
