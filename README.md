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
- `.env` is now at: `trees/branches/backend/childs/.env`
- Example file: `trees/branches/backend/childs/.env.example`

## Running the frontend

From the repo root:

```
cd trees/branches/frontend/childs/agentic-defi-vista-90
npm install
npm run dev
```

Frontend environment variables (if any) are in:
- `trees/branches/frontend/childs/agentic-defi-vista-90/.env.local`

## Notes and implications

- Path changes: Any external scripts, CI workflows, or deployment configs that referenced old paths must be updated to the new locations under `trees/branches/.../childs`.
- Git status: The tracked moves are already staged as renames. A single commit can finalize the restructure.
- Root tooling: There is no root-level `package.json` anymore. Run commands inside the respective `childs` subfolders.
- Supabase and other integrations live inside the frontend app folder under `trees/branches/frontend/childs/agentic-defi-vista-90`.

## Commit the restructure (optional)

If you want to finalize the changes:

```
git add .
git commit -m "Restructure repo into trees/branches/childs for backend and frontend"
