# Research Profiles

API and frontend for browsing UCSB ERI research faculty profiles.

## Deployment (production)

The production API runs as a **user** systemd service (`systemctl --user`) on the
prod host. The deploy artifacts are versioned in `src/main/backend/scripts/`:

- **`research-profiles-api-prod.service`** — the systemd unit. Install it with:

  ```bash
  mkdir -p ~/.config/systemd/user
  cp src/main/backend/scripts/research-profiles-api-prod.service ~/.config/systemd/user/
  systemctl --user daemon-reload
  systemctl --user enable --now research-profiles-api-prod.service
  ```

  Config (`PORT`, `DATABASE_URL`, `OLLAMA_API_KEY`) is loaded from the deployed
  `.env` via `EnvironmentFile=` — it is **not** committed (see `.env.example`).
  Keep it locked down: `chmod 600 .env`. The unit header documents the rest.

- **`setup_prod_role.sql`** — provisions the `prod` PostgreSQL role with the
  DML privileges the API and migrations need. Run once as a superuser; see the
  comments at the top of the file.
