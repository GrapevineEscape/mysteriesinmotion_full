# Pre-payment launch checklist

This checklist is intentionally separate from show readiness. The Admin
readiness page validates each mystery’s content; this file covers the production
service around those mysteries.

## Required before enabling Square

- [ ] Replace the policy placeholder with one monitored support/privacy email.
- [ ] Confirm the legal business name, Texas governing law, and venue language
      in the Terms with qualified counsel.
- [ ] Review all four owner-review drafts: Terms, Privacy, Refund & Streaming,
      and Customer Support.
- [ ] Keep `APP_URL=https://online-mystery.onrender.com` until DNS is connected.
      Later change it to `https://play.inmotionmysteries.com`.
- [ ] Upgrade the production PostgreSQL database to a Render plan with backups
      and confirm a restore can be performed.
- [ ] Upgrade the web service from the free development plan for launch
      reliability.
- [ ] Confirm `/api/health` reports `database: "connected"`.
- [ ] Run every published show’s Admin → Launch Readiness checklist.
- [ ] Perform one complete customer test on desktop and mobile for every show:
      login, Act One, clues, intermission, timer, accusation, Act Two, Situation
      Room, replay, and play history.
- [ ] Perform an accessibility pass with keyboard-only navigation, visible
      focus, captions, and reduced-motion settings.

## Protected media

- [ ] In Cloudflare Stream, enable “Require signed URLs” for protected show
      videos.
- [ ] Add `CLOUDFLARE_ACCOUNT_ID` and a least-privilege
      `CLOUDFLARE_STREAM_API_TOKEN` in Render.
- [ ] Change `CLOUDFLARE_STREAM_SIGNED_URLS` to `true` only after the preceding
      test succeeds. Until then, existing public playback remains unchanged.
- [ ] Keep the R2 bucket private.
- [ ] Add least-privilege `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` values in
      Render.
- [ ] Save private clue, intermission-image, and music references as
      `r2://bucket/object-key`. The game converts them to six-hour signed URLs
      only after account and show-access checks pass.
- [ ] Never paste Cloudflare API tokens or R2 secret keys into show settings.

## Email and AI

- [ ] Verify the Resend sending domain and `EMAIL_FROM` address.
- [ ] Confirm sign-in-code delivery to Gmail, Outlook, and a business-domain
      inbox.
- [ ] Confirm the monitored admin email is listed in `ADMIN_EMAIL`.
- [ ] Add `OPENAI_API_KEY`, submit representative written answers, and inspect
      both successful and fallback grading in Admin customer history.
- [ ] Keep deterministic accepted answers for every AI-assisted question so
      grading can fall back safely.

## Payment acceptance tests

- [ ] Use Square Sandbox first; never grant access from a browser-only success
      screen.
- [ ] Verify the server webhook signature and make payment handling idempotent.
- [ ] Confirm a successful webhook grants only the purchased $10 show.
- [ ] Confirm each successful purchase creates a separate entitlement with a
      one-year start deadline.
- [ ] Confirm first successful playback starts one continuous 48-hour replay
      window and does not start merely by opening the briefing page.
- [ ] Confirm unlimited completed games can begin during the 48-hour window,
      but only one game can remain unfinished at a time.
- [ ] Confirm a game begun before expiration remains resumable through
      completion, while another game cannot begin after expiration.
- [ ] Confirm an expired show remains in My Case Files with its dated results
      and requires a new purchase for another game.
- [ ] Test duplicate webhooks, failed payments, abandoned checkout, disputes,
      and refunds.
- [ ] Confirm administrators retain complimentary access to all shows.
- [ ] Confirm a refunded or disputed entitlement cannot start a new playthrough.
- [ ] Confirm the refund-support view blocks a refund status when saved records
      prove streaming began.
- [ ] Confirm administrators can always play every show without entitlement
      deadlines.

## Go-live record

Record the date, tester, browser/device, show, Square transaction, webhook event,
entitlement result, refund result, and any issue found for the final test of
each production show.
