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
