# Online Mystery

Interactive, paid whodunit platform for prerecorded mystery performances.

## Current foundation

- Next.js and TypeScript application
- Responsive public catalog, login, account, policy, and support pages
- PostgreSQL data model for users, shows, suspects, purchases, attempts, answers, and scoring
- Passwordless email authentication with customer/admin authorization
- Configurable optional introduction, required acts, and required decision/intermission stage
- Optional intermission media and a refresh-safe server countdown
- Timestamp-based Case Inventory with persistent evidence unlocks
- Persistent stages, playback positions, draft answers, results, and replay history
- One-year purchase start deadline and 48-hour replay windows
- Active-game completion protection after a replay window expires
- Separate entitlement history for repurchases and permanent dated results
- Per-show administration, launch-readiness checks, and customer support controls
- Interactive Case Room prototype at `/play/demo`
- Full-screen Act One and Act Two playback states
- Pause and 30-second rewind without forward seeking
- Locked transition from Act One into the Decision Room
- Split-screen Intermission, accusation form, evidence access, and reveal countdown
- Situation Room with one-at-a-time animated answer reviews
- Live correct-answer tally and optional question imagery
- Vault-door transition and animated detective-rank gauge
- Configurable single-choice, multiple-choice, and fill-in question framework
- Deterministic and optional AI-assisted fill-in answer matching fields
- Variable question totals and percentage-based detective rank thresholds
- Per-show Clue Manager with private R2 or HTTPS file references
- Act 1/Act 2 clue assignment and HH:MM:SS unlock timing
- Cloudflare Stream signed-playback and R2 signed-download support
- Terms, Privacy, Refund & Streaming, and Customer Support drafts
- Database migrations and a database-aware health check
- Render Blueprint for the web service and PostgreSQL database
- Environment template for Square, Resend, OpenAI, and Cloudflare

Square payment processing is the remaining major integration. Signed Stream
playback stays disabled until the Cloudflare settings and credentials are ready,
so enabling the security layer cannot unexpectedly break current shows.

Picking this up cold, or handing it to someone else? `docs/HANDOFF.md` covers the
decisions behind the code and exactly what remains.

## Local development

PostgreSQL is required for authenticated and administrative routes.

1. Copy `.env.example` to `.env`.
2. Supply a local PostgreSQL `DATABASE_URL`.
3. Install dependencies with `npm install`.
4. Apply the schema with `npm run db:migrate`.
5. Load sample content with `npm run db:seed`.
6. Start the application with `npm run dev`.

### Without installing PostgreSQL

`npm run db:local` serves PGlite over the real Postgres wire protocol, so Prisma
and `psql` talk to it unchanged and no Docker or system service is needed. It
prints the `DATABASE_URL` to use and keeps its data in `.pglite`, so content
survives a restart. Set `LOCAL_DB_MEMORY=true` for a throwaway database or
`LOCAL_DB_PORT` to avoid a port already in use.

Copy that URL exactly, including `pgbouncer=true`. Every connection shares a
single Postgres backend, so a prepared statement outlives the client that created
it and the next client collides with it. Without that parameter, queries begin
failing with `prepared statement "s0" already exists`.

Leave it running in its own terminal and start the application in another. Two
copies must never share `.pglite`: they are independent writers and will corrupt
each other, so change `LOCAL_DB_PORT` and the data directory together, or stop
the first one. Note that `npm run <script>` launches the server as a grandchild
process, so stopping the `npm` process alone leaves the port held; stop the whole
process tree, or run `node scripts/dev-database.mjs` directly.

`npm run db:counts` prints a row count per table, which is the quickest way to
tell an empty database from a seeded one.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run verify:routes` signs in as the administrator and requests every portal
and administration page against a running dev server, which catches server-only
failures that type checking cannot see.

`npm run verify:casting` and `npm run verify:migration` each bring up their own
throwaway Postgres, so they need no setup and leave nothing behind.

## Migrating Online Mystery Case Room content

The three ONLINE titles' questions, clues, and Stream video UIDs live in the
legacy Online Mystery Postgres. Export them before cutting over to a new
database:

```bash
npm run inventory:online
npm run migrate:online -- --export --import
```

`--export` writes `tmp/online-content-pack.json` (gitignored). `--import` loads
that pack into `DATABASE_URL`. Media stays in Cloudflare; only references move.
As of the last inventory, only Missing Millions had playable Case Room content
in production; the other two ONLINE titles were empty drafts.

## Migrating the Flask troupe database

The live troupe data comes from the earlier Flask application. `npm run
migrate:flask` reads it directly and writes the unified schema.

```bash
FLASK_DATABASE_URL=postgres://... npm run migrate:flask -- --dry-run
```

Always dry run first. A dry run performs the whole transfer inside a transaction
and rolls it back, so its report is what the real run would do rather than a
prediction, and it will surface a constraint violation before any data moves.
Read the report's closing section: it lists duplicate addresses, unfamiliar show
types, records pointing at rows that no longer exist, and shows whose delivery
type differs between the two systems.

The catalog holds one entry per title. Several titles exist in Flask as live
scripts and here as prerecorded mysteries; those are the same offering, so the
Flask record merges into the existing entry and its delivery type is left alone.
A prerecorded mystery therefore keeps its cast and performance history without
becoming bookable as a live show, since every public and booking surface lists
only the live types.

Two details are worth knowing:

- Flask stored times without a zone. Times an administrator typed are read as
  wall clock in `APP_TIMEZONE`, while timestamps Postgres generated are read as
  UTC. Getting this wrong moves every performance by several hours, so the
  report prints a few conversions for you to eyeball.
- Everyone arrives as a passwordless account. Flask password hashes are
  deliberately left behind, and performers sign in with an email code.

The run is idempotent. Rows are matched on natural keys, so an interrupted run
can simply be repeated. Scripts and headshots are reported but not uploaded;
they move separately, since the database only holds a reference to them.

### Moving the files

Flask kept scripts and uploads on disk. `npm run migrate:assets` copies them to
R2 and points the migrated records at them; run it after `migrate:flask`, since
it matches files to rows that must already exist. It is also idempotent, because
a record that already carries a reference is left alone.

Confirm the credentials first:

```bash
npm run verify:r2
```

That writes and reads back a probe file, then deletes it. It exists because
Cloudflare answers most configuration mistakes with the same bare 403, so each
capability is checked separately and reported as the thing to change. The usual
mistake is putting the API token's name in `R2_ASSET_BUCKET` instead of the
bucket's name; the two are easy to conflate on the token screen, and the symptom
is a 403 on a bucket that plainly exists.

Scripts and headshots are private, served only through short-lived signed URLs,
so the bucket holding them must not have public access or a custom domain
enabled.

## Render deployment

Create a new Render Blueprint from this repository. `render.yaml` defines:

- `online-mystery` Node web service
- `online-mystery-db` PostgreSQL database
- Internal `DATABASE_URL` connection
- Database migration pre-deploy step
- `/api/health` health check
- Required secret placeholders

Do not commit production secrets to this repository.

Review [`docs/PRE_PAYMENT_CHECKLIST.md`](docs/PRE_PAYMENT_CHECKLIST.md) before
enabling Square production payments.
