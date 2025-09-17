# Agentic DeFi — Restructured into trees/branches/childs

This repository has been reorganized into a literal three-level hierarchy:

- backend/
  - package.json
  - src/
  - scripts/
  - prisma/
  - dist/
  - node_modules/
  - tsconfig.json
  - docker-compose.yml
  - Dockerfile
  - README.md (backend docs)
  - .env (moved here, untracked)
  - .env.example
  - .gitignore
  - test-*.json / *.js utilities
  - verify-real-pyth-data.js

- frontend/
  - package.json
  - src/
  - supabase/
  - vite.config.ts
  - tailwind.config.ts
  - tsconfig.json
  - .env.local (if present, untracked)
  - other app assets


Git history was preserved for tracked items using `git mv`. Untracked artifacts (e.g., `.env`, `node_modules`, `dist`) were moved via shell `mv`.

## Running the backend

From the repo root:

```
cd backend
npm install
npm run dev    # or npm start / npm run build as per package.json
```

Environment variables:
- `.env` is now at: `backend/.env`
- Example file: `backend/.env.example`

## Running the frontend

From the repo root:

```
cd frontend
npm install
npm run dev
```


