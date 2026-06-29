# Hostinger deployment

## 1. Create the MySQL database

Create a MySQL database and user in hPanel. Open phpMyAdmin, select the new
database, and import `mysql/schema.sql`.

## 2. Configure the application

Connect the GitHub repository as a Node.js application.

- Node.js: 22.x
- Framework: Other or Express
- Build command: `npm run build`
- Start command: `npm start`
- Entry file (when requested): `server/index.js`

Set these runtime environment variables in hPanel:

```text
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=<full Hostinger MySQL username>
DB_PASSWORD=<database password>
DB_NAME=<full Hostinger MySQL database name>
SESSION_DAYS=30
```

Do not expose database credentials through variables beginning with `VITE_`.

## 3. Migrate the Supabase data

Before the final migration, stop writing production data to Supabase. Allow the
machine running the migration under hPanel's Remote MySQL settings, then run:

```bash
set -a
source .env.migration
set +a
npm run db:migrate
```

Example `.env.migration`:

```text
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DB_HOST=<Hostinger remote MySQL host>
DB_PORT=3306
DB_USER=<full database username>
DB_PASSWORD=<database password>
DB_NAME=<full database name>
MIGRATION_USERS_JSON={"account@example.com":"a-temporary-password"}
```

`SUPABASE_SERVICE_ROLE_KEY` is migration-only. Never add it to Hostinger's
runtime environment or commit it to Git.

Supabase password hashes are not copied. Each migrated account receives the
temporary password supplied in `MIGRATION_USERS_JSON`; change it after login.
