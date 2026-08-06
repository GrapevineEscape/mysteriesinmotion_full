# Handoff

Written for whoever picks this work up next, whether a person or another model.
It covers what this repository is, what state it is in, the decisions that must
not be quietly reversed, and precisely what remains.

Read `README.md` first for how to run things. This document is about intent and
sequence rather than commands.

## What this project is

Two separate applications are being consolidated into one Next.js codebase:

- **A Flask site** (`../MIM Website`, also copied as `../TEMP-MIM`) — the public
  Mysteries in Motion marketing site plus a hidden troupe portal and admin area
  where performers read scripts, request roles, and directors schedule shows.
- **A Next.js app** (`../TEMP-ONLINE`) — the paid online mystery platform where
  customers buy and watch prerecorded shows and solve the case.

This repository began as the Next.js app and absorbed the Flask one. Both source
projects are reference material now. **Do not push to either original GitHub
repository.** The only remote in use is
`github.com/GrapevineEscape/mysteriesinmotion_full`.

The end state is one deployment serving two hostnames:

| Hostname | Serves |
| --- | --- |
| `mysteriesinmotion.com` | Marketing site, troupe portal, administration |
| `play.mysteriesinmotion.com` | The online mysteries |

`inmotionmysteries.com` appears in a few older strings and is **wrong**. The
brand is Mysteries in Motion and the domain is `mysteriesinmotion.com`.

## State as of this handoff

Phases 0 through 8 of the migration plan are complete: the unified schema, unified
authentication, host routing, the ported marketing site, the ported troupe portal,
the ported business logic, the merged administration area, and the migration of
live Flask data and files.

- 84 tests pass (`npm test`). `npm run typecheck` and `npm run lint` are clean.
- **16 commits sit on local `main` and have not been pushed.** Pushing them is
  the first thing to do, and it needs the owner's say-so.
- The local database holds seed data plus the real migrated Flask data.

Only Phase 9 (deployment) and Phase 10 (Square payments, deliberately deferred)
remain.

## Decisions that must not be reversed

These were settled deliberately. Each one has a reason that is not obvious from
the code, so changing any of them needs the owner's agreement.

**One `User` table, and everyone signs in with an emailed code.** There are no
passwords anywhere. Flask's password hashes were deliberately left behind during
migration rather than carried over, and the old `MIM2025` self-registration code
is gone — performers now arrive through an admin-issued `TroupeInvite`. Do not
reintroduce password authentication for "just the admins".

**A director is not a role.** `UserRole` is only `CUSTOMER`, `PERFORMER`, and
`ADMIN`. Someone is a director of a particular performance by way of
`ShowDate.directorId`, so the same performer can direct one show and act in
another. The admin layout therefore guards with `requireTroupe` rather than
`requireAdmin`, and individual admin pages apply `requireAdmin` themselves.
Casting boards are the pages a director may reach without being an administrator.

**One catalog entry per title.** `Show` is the parent; `OnlineShowDetail` holds
the fields that only apply to prerecorded mysteries. There is no
`LiveShowDetail` — live fields sit directly on `Show`. `ShowType` is `STANDARD`,
`ESCAPE`, or `ONLINE`, and public booking surfaces list only the live types.

**Three titles are prerecorded only.** Missing Millions, Dog Show Debacle, and
Holiday Inheritance exist in Flask as live shows and here as online ones. The
owner decided they should not be bookable as live shows. So the Flask record
merges into the existing `ONLINE` entry and the type is left alone: the cast and
performance history are preserved without the title becoming bookable.

This has bitten twice. Any code that reasons about "the troupe's shows" by
filtering `type != ONLINE` will silently skip these three. Both bugs in the asset
upload script were exactly this. When the question is "does the troupe perform
this", the answer is not the delivery type.

**One deployment, two hostnames, one database.** `src/proxy.ts` (not
`middleware.ts` — Next.js 16 deprecated that name) inspects the host and rewrites
the play subdomain, injecting a surface header defined in `src/lib/surface.ts`.
Import that constant from `src/lib/surface.ts`, never from `proxy.ts`, or the
Edge runtime gets pulled into the server bundle. The session cookie is scoped to
`.mysteriesinmotion.com` so one sign-in covers all three surfaces.

**Times are resolved in the troupe's timezone, not the server's.** Use
`src/lib/app-time.ts`. Flask stored timestamps without a zone, so the migration
reads administrator-entered times as `APP_TIMEZONE` wall clock and
Postgres-generated ones as UTC. Getting this wrong moves every performance by
several hours.

## Local development, and two traps

Full instructions are in `README.md`. Two things will waste your time otherwise:

1. **`DATABASE_URL` must include `?pgbouncer=true`.** The local database is
   PGlite, which has a single Postgres backend, so prepared statement names leak
   between connections and you get `prepared statement "s0" already exists`.
2. **Start the database with `node scripts/dev-database.mjs`, not
   `npm run db:local`.** `npm run` spawns the listener as a grandchild, so
   stopping it orphans the process and the port stays held. If a port is stuck,
   find the process by pid and kill it.

## Phase 9: deployment

This is the remaining work. The order matters.

### The database decision is already made

**Adopt the existing Online Mystery Postgres on Render.** Do not provision a new
one. It already holds real online shows and customer purchases, and the unified
schema was written with `@@map` so it lines up with those existing tables. A new
database would mean migrating that data too, for no benefit.

`render.yaml` already names it `online-mystery-db`, which is why the service and
database names still say "online mystery" rather than the new brand. Renaming a
service in a Render blueprint can replace it, so leave those names alone unless
the owner wants to take that risk.

### Steps

1. **Push the 16 local commits** to `github.com/GrapevineEscape/mysteriesinmotion_full`.
2. **Fix `render.yaml`.** It is stale in specific ways:
   - `PUBLIC_PLAY_DOMAIN` still says `play.inmotionmysteries.com`. It should be
     `play.mysteriesinmotion.com`, and should stay empty until that DNS resolves,
     which keeps the catalog reachable on the apex meanwhile.
   - These variables exist in `.env.example` but are missing from `render.yaml`
     entirely, and the app needs them: `PUBLIC_SITE_DOMAIN`,
     `PUBLIC_COMING_SOON`, `SESSION_COOKIE_DOMAIN`, `APP_TIMEZONE`, and
     `BOOKING_NOTIFICATION_EMAIL`.
   - Add `R2_ENDPOINT` only if the bucket turns out to be in a jurisdiction.
   - Do not put `FLASK_DATABASE_URL` in `render.yaml`; it is a one-time local
     migration setting.
3. **Correct the remaining `inmotionmysteries.com` references** in the legal
   pages and anywhere else they appear.
4. **Run the migrations against production**: `prisma migrate deploy`, which the
   blueprint already does as `preDeployCommand`.
5. **Migrate the Flask data into production.** Everything so far ran against the
   local database. Point `DATABASE_URL` at production and run `migrate:flask`
   (dry run first, always) and then `migrate:assets`. Both are idempotent, so a
   partial run can simply be repeated. The R2 objects are already uploaded, so
   the asset run will mostly just record references.
6. **Configure DNS** for the apex and the `play` subdomain, and set
   `SESSION_COOKIE_DOMAIN` to `.mysteriesinmotion.com` so single sign-on works
   across them.
7. **Set `PUBLIC_COMING_SOON=false`** when the owner is ready to be seen. While
   it is `true`, only the marketing pages are held back; the troupe portal,
   administration, and sign-in stay reachable, which is what makes it safe to
   deploy before launch.

### Verifying it

`npm run verify:routes` drives every admin route through a real sign-in by
reading the emailed code out of the dev server log. It has caught things static
analysis cannot, such as bad Prisma includes and `"use server"` violations. Run
it after any change to the admin area.

## Open items

**Confirm the R2 bucket is private.** Scripts and headshots were uploaded to
`online-mystery-images`, a bucket originally created for online show images. The
application only ever serves them through short-lived signed URLs, but if that
bucket has a public `r2.dev` or custom domain enabled, the scripts are readable
by anyone who guesses a path like `scripts/missing-millions.pdf`. Check
R2 → Settings. If it is public, move the private assets to a dedicated private
bucket and re-run `migrate:assets`.

Note the naming trap that already cost time: `mysteriesinmotion-assets` is the
**API token** name and `online-mystery-images` is the **bucket** name. Putting
the token name in `R2_ASSET_BUCKET` produces a 403 on a bucket that plainly
exists. `npm run verify:r2` diagnoses this and every other R2 misconfiguration,
because Cloudflare reports nearly all of them as the same bare 403.

**Two cover images are missing.** Only `Missing Millions_image.png` existed on
disk in the Flask project, so the other shows have no cover art. The seed shows
"Murder at the Manor" and "Last Train from Halloway" also warn about missing
scripts during asset migration; they are local seed fixtures, not real shows, and
the warning will not appear against production.

**Phase 10 is deliberately deferred.** Square checkout and its webhook, with
idempotency, per `docs/PRE_PAYMENT_CHECKLIST.md`. Cloudflare Stream signed
playback is also still off (`CLOUDFLARE_STREAM_SIGNED_URLS=false`) so that
enabling the security layer cannot unexpectedly break working shows.

## Command reference

| Command | Purpose |
| --- | --- |
| `node scripts/dev-database.mjs` | Start the local PGlite database |
| `npm run dev` | Dev server |
| `npm test` | Unit tests (84) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:counts` | Row counts, to see whether a database is empty, seeded, or migrated |
| `npm run db:seed` | Seed demo data |
| `npm run verify:r2` | Prove the R2 credentials can write and read |
| `npm run verify:migration` | Integration-test the Flask migration against ephemeral databases |
| `npm run verify:routes` | Smoke-test every admin route through a real sign-in |
| `npm run verify:casting` | Exercise the casting logic |
| `npm run migrate:flask -- --dry-run` | Report what a Flask migration would do, changing nothing |
| `npm run migrate:assets -- --dry-run` | Report which files would move to R2 |

Both migration scripts take `--dry-run`. Use it first, every time. The data
migration's dry run performs the entire transfer inside a transaction and rolls
it back, so its report is what would actually happen rather than a prediction.
