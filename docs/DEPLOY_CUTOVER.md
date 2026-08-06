# Deploy cutover — new Render web + new Postgres

Use this after local verification of both content packs. The old Online Mystery
and Flask Render services stay up until you confirm the new stack.

## Prerequisites

- Local `main` pushed to `github.com/GrapevineEscape/mysteriesinmotion_full`
- `.env` has working `ONLINE_DATABASE_URL`, `FLASK_DATABASE_URL`, and R2 keys
- `npm run inventory:online` reviewed (Missing Millions populated; other two ONLINE titles may still be empty drafts)
- `tmp/online-content-pack.json` exported, or re-export at cutover time

## 1. Create the Blueprint

In Render: **New → Blueprint** → connect `mysteriesinmotion_full` → apply
[`render.yaml`](../render.yaml).

That creates:

- Web service `mysteriesinmotion`
- Postgres `mysteriesinmotion-db`

Fill dashboard secrets (sync: false keys): `APP_URL`, `ADMIN_EMAIL`,
`EMAIL_FROM`, `RESEND_API_KEY`, Cloudflare R2 keys, optional Stream token and
Square placeholders. `AUTH_SECRET` is generated. Keep `PUBLIC_COMING_SOON=true`
and `PUBLIC_PLAY_DOMAIN` empty until play DNS is ready.

## 2. Wait for first deploy

Free tier cannot use a pre-deploy command. Schema migrations still run because
`npm start` is `prisma migrate deploy && next start`. Confirm `/api/health` is
green.

## 3. Load show content into the new database

From your laptop (not on Render), point at the **new** External Database URL:

```bash
# Keep ONLINE_DATABASE_URL and FLASK_DATABASE_URL as the old sources.
# Temporarily set DATABASE_URL to the NEW Render Postgres external URL
# (add ?sslmode=require if Render does not include it).

npm run migrate:online -- --export --import
npm run migrate:flask -- --dry-run
npm run migrate:flask
npm run migrate:assets
node --env-file-if-exists=.env --import tsx scripts/verify-show-completeness.ts
```

Expected after cutover:

- All MIM titles present with roles (including the three ONLINE titles)
- Missing Millions: questions, clues, act video IDs, script URL
- Dog Show / Holiday Inheritance: roles + scripts; Case Room content only if
  you later build it in admin (prod source had none)

## 4. DNS and SSO

1. Point `mysteriesinmotion.com` (and `www` if used) at the new web service
2. When ready, point `play.mysteriesinmotion.com` and set
   `PUBLIC_PLAY_DOMAIN=play.mysteriesinmotion.com`
3. Set `SESSION_COOKIE_DOMAIN=.mysteriesinmotion.com`
4. Set `APP_URL` to the public apex URL

## 5. Go live when ready

Set `PUBLIC_COMING_SOON=false`. Troupe/admin/sign-in already work while it is
`true`.

## 6. Retire the old stacks

Only after you have verified catalog, troupe scripts, and Missing Millions play
config: pause or delete the old Online Mystery and Flask Render services. Keep a
database backup of each first.
