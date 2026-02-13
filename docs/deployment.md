# Deployment

This template deploys to three free-tier services:

| Service          | Provider         | Free tier                        |
| ---------------- | ---------------- | -------------------------------- |
| Database         | Turso            | 9 GB, 500M reads/month           |
| Backend API      | Render           | 750h/month (spins down on idle)  |
| Frontend SPA     | Cloudflare Pages | Unlimited bandwidth              |

## Database — Turso

### Initial setup

1. Install the Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
2. Sign in: `turso auth login`
3. Create a database: `turso db create <your-db-name>`
4. Get the connection URL: `turso db show <your-db-name> --url`
5. Create an auth token: `turso db tokens create <your-db-name>`

### Push schema

```bash
TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> bun run db:push
```

This pushes your current Drizzle schema directly to the remote database. No migration files needed — `db:push` compares your schema code against the live database and applies changes.

### Local development

In development, Turso's libSQL client supports local SQLite files. The default `TURSO_DATABASE_URL=file:./local.db` creates a local file — no Turso account needed to develop.

## Backend — Render

### Initial setup

1. Create a **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo
3. Set the following:
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile.api`
   - **Plan**: Free
4. Add environment variables in the Render dashboard:
   - `PORT` = `3000`
   - `JWT_SECRET` = (generate a secure random string)
   - `TURSO_DATABASE_URL` = (from `turso db show --url`)
   - `TURSO_AUTH_TOKEN` = (from `turso db tokens create`)

### Auto-deploy via GitHub Actions

The `deploy-api.yml` workflow triggers a Render deploy hook after CI passes on `main`.

To set it up:
1. In Render dashboard → your service → Settings → **Deploy Hook** → copy the URL
2. In GitHub → repo Settings → Secrets → add `RENDER_DEPLOY_HOOK_URL` with the copied URL

### render.yaml

The included `render.yaml` is a [Blueprint](https://docs.render.com/blueprint-spec) file. You can optionally use it to create the service via Render's "New > Blueprint Instance" flow instead of manual setup. Environment variables marked `sync: false` must still be set manually in the dashboard.

## Frontend — Cloudflare Pages

### Initial setup

1. Create a [Cloudflare](https://dash.cloudflare.com) account
2. Go to **Workers & Pages** → **Create** → **Pages** → **Direct Upload** (we deploy via GitHub Actions, not Cloudflare's git integration)
3. Create a project with your chosen name

### GitHub Secrets

Add these secrets to your GitHub repo:

| Secret                      | Where to find it                                |
| --------------------------- | ----------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`      | Cloudflare dashboard → API Tokens → Create Token (use "Edit Cloudflare Workers" template) |
| `CLOUDFLARE_ACCOUNT_ID`     | Cloudflare dashboard → right sidebar             |
| `CLOUDFLARE_PROJECT_NAME`   | The project name you chose in step 2             |
| `VITE_API_URL`              | Your Render API URL (e.g. `https://api.onrender.com/api`) |

### SPA routing

The `apps/frontend/public/_redirects` file contains `/* /index.html 200`, which tells Cloudflare Pages to serve `index.html` for all routes. This is required for client-side routing with `@solidjs/router`.

### Custom domain (optional)

In Cloudflare Pages → your project → Custom domains → add your domain. Cloudflare handles SSL automatically.

## CI/CD flow

```
push to main
    │
    ▼
CI workflow (ci.yml)
    ├── lint (Biome)
    ├── type-check (tsc)
    └── test (bun test)
    │
    ▼ (on success)
    ├── deploy-api.yml → triggers Render deploy hook
    └── deploy-web.yml → builds frontend, deploys to Cloudflare Pages
```

Both deploy workflows use `workflow_run` to trigger only after CI completes successfully on the `main` branch.
