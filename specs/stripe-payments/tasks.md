# Stripe payments — tasks

Status: **Not started.** Work top to bottom. Each task lists the requirements it covers and ends in a checkable state.

- [ ] **T0. Prerequisites** (needs answers to the open questions in `requirements.md`)
  - Initialize git if wanted; commit the current code as the baseline.
  - Create 1Password item `stripe-test` (API Credential) in the chosen vault with concealed fields `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. The user saves the values; Claude never handles them.
  - Install the Stripe CLI (`brew install stripe/stripe-cli/stripe`) and run `stripe login`.

- [ ] **T1. Prices in cents and testable order logic** — R1.2, R1.6, NFR money/testing
  - Add `priceCents` to `flavors.js`.
  - Move validation out of the action into `src/lib/order.js` (`validateOrder`, `priceOrder`).
  - Add Vitest and `src/lib/order.test.js`.
  - Done when: `npm test` passes and the current form behaves exactly as before.

- [ ] **T2. Stripe client and config** — R4.1–R4.4
  - `npm install stripe`.
  - Add `src/lib/server/stripe.js` (lazy client, missing-key and test-key checks).
  - Add `.env.tpl`.
  - Done when: `op run … -- node -e` style smoke check (or a dev-server log line) confirms the client builds with a test key and refuses a missing key.

- [ ] **T3. Create Checkout Session from the order form** — R1.1–R1.8, R2.4
  - Rewrite the action to create the session and `redirect(303, session.url)`.
  - Add the `load` for `?canceled=1` and prefill.
  - Custom `use:enhance` callback; cancel notice; checkout-error message; new button text; remove old success view.
  - Done when: submitting the form opens Stripe Checkout with the right line item, email and total; cancel returns to a pre-filled `/order`; a bad key shows the error message.

- [ ] **T4. Success page** — R2.1–R2.3, R2.5
  - Add `src/routes/order/success/` (`+page.server.js`, `+page.svelte`).
  - Done when: paying with `4242…` lands on a page showing the order ID and amount; a made-up `session_id` returns 404.

- [ ] **T5. Webhook endpoint** — R3.1–R3.7
  - Add `src/routes/api/stripe/webhook/+server.js`.
  - Done when: with `stripe listen` forwarding, a test payment logs one `PAID` line; a resent event is not logged twice; a wrong signature gets 400.

- [ ] **T6. Docker and docs** — R4.5
  - `compose.yaml` pass-through vars; `Dockerfile` copies pruned `node_modules`.
  - README: setup, `op run` commands, test cards, `stripe listen`, registering the webhook endpoint in the Stripe Dashboard for a deployed URL.
  - Done when: `op run … -- docker compose up --build` serves the site and a `4242…` payment logs `PAID` in `docker compose logs web`.

- [ ] **T7. Full manual test pass**
  - Run every case in the Testing section of `design.md` and record results here.
