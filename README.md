# Agentic DeFi — Restructured into trees/branches/childs

This repository has been reorganized into a literal three-level hierarchy:

- trees/
  - branches/
    - backend/
      - childs/
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
      - childs/
        - agentic-defi-vista-90/
          - package.json
          - src/
          - supabase/
          - vite.config.ts
          - tailwind.config.ts
          - tsconfig.json
          - .env.local (if present, untracked)
          - other app assets

The repository root now contains only:
- .git (git metadata)
- .gitignore (copied from backend so common root ignore rules still apply)
- trees/ (the new hierarchy root)

Git history was preserved for tracked items using `git mv`. Untracked artifacts (e.g., `.env`, `node_modules`, `dist`) were moved via shell `mv`.

## Running the backend

From the repo root:

```
cd trees/branches/backend/childs
npm install
npm run dev    # or npm start / npm run build as per package.json
```

Environment variables:
- `.env` is now at: `backend/.env`
- Example file: `backend/.env.example`

## Running the frontend

From the repo root:

```
cd trees/branches/frontend/childs/agentic-defi-vista-90
npm install
npm run dev
```


