# TypeScript API and MySQL

The static browser DAW remains deployable to GitHub Pages. This TypeScript API is a separate Node.js service; GitHub Pages cannot run Node.js or MySQL.

## Stack
- Node.js 20+, TypeScript, Express
- MySQL 8+ / InnoDB; JSON project payloads
- bcrypt password hashing, JWT bearer tokens, Zod validation
- Helmet security headers, CORS allow-list, rate limiting, parameterized SQL

## Local setup
1. Install Node.js 20+ and MySQL 8+.
2. Run `mysql -u root -p < db/schema.sql`.
3. Copy `.env.example` to `.env`; set database credentials and a random JWT secret of at least 32 characters.
4. Run `npm install`.
5. Run `npm run dev:api`.
6. Check `http://localhost:8787/api/health`.

Never commit `.env`, database passwords, JWT secrets, or production credentials.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | API and DB health |
| POST | `/api/auth/register` | No | Create account (12-character minimum password) |
| POST | `/api/auth/login` | No | Issue JWT bearer token |
| GET | `/api/projects` | Bearer | List the current user's projects |
| POST | `/api/projects` | Bearer | Save a project |
| GET | `/api/projects/:id` | Bearer | Read an owned project |
| PUT | `/api/projects/:id` | Bearer | Update an owned project |
| DELETE | `/api/projects/:id` | Bearer | Delete an owned project |

Example request body:
```json
{ "name": "My first session", "bpm": 120, "projectData": { "version": 1, "tracks": [], "timeSignature": [4, 4] } }
```

Send tokens as `Authorization: Bearer <token>`. Project queries are always scoped to the authenticated user.

## Production notes
- Host API and MySQL on a server/container platform; never expose MySQL directly to the public internet.
- Set `CLIENT_ORIGIN` to the exact browser-app origin(s), comma-separated.
- Use HTTPS, a secret manager, backups, migrations, monitoring, and a production session/token strategy.
- The current browser UI still uses local save/open. Cloud login and cloud-save controls need to be wired into the UI in a later integration step; this API scaffold does not mean the browser app already uses MySQL.
