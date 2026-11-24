# Stripe payments — design

Status: **Draft, awaiting review**. Implements [requirements.md](requirements.md).

## Flow

```
Browser                SvelteKit server                     Stripe
  │ POST /order (form)       │                                  │
  │─────────────────────────▶│ validate + price (cents)         │
  │                          │ checkout.sessions.create ───────▶│
  │                          │◀──────────────── session.url ────│
  │◀── 303 → session.url ────│                                  │
  │──────────────────── hosted Checkout page ──────────────────▶│
  │◀── redirect /order/success?session_id=cs_… ─────────────────│
  │ GET /order/success       │ sessions.retrieve(id) ──────────▶│
  │◀── receipt view ─────────│                                  │
  │                          │◀── POST /api/stripe/webhook ─────│ (signed, async)
  │                          │ verify sig → log PAID            │
```

## File changes

| File | Change |
|---|---|
| `package.json` | Add `stripe` to `dependencies`. Add `vitest` to `devDependencies` and a `test` script. |
| `src/lib/flavors.js` | Add `priceCents` to each flavor (e.g. `250`). Keep `price` for display, or derive it from `priceCents`. |
| `src/lib/order.js` (new) | Pure functions: `validateOrder(formData)` → `{ values, errors, order }` and `priceOrder({ flavor, pack, quantity })` → `{ unitAmount, totalCents }`. Moved out of the action so they can be unit-tested. |
| `src/lib/order.test.js` (new) | Vitest tests for validation and pricing. |
| `src/lib/server/stripe.js` (new) | Lazily builds one Stripe client from `$env/dynamic/private`. Throws a typed config error if the key is missing or not a test key. `$lib/server` keeps it out of client bundles. |
| `src/routes/order/+page.server.js` | Action: validate → price → create Checkout Session → `redirect(303, session.url)`. Add a `load` that reads `?canceled=1` and prefill params. |
| `src/routes/order/+page.svelte` | Custom `use:enhance` callback for the external redirect. Cancel notice. Checkout-error message. New button text. Remove the old in-page success view. |
| `src/routes/order/success/+page.server.js` (new) | `load`: retrieve session by `session_id`, return display data. |
| `src/routes/order/success/+page.svelte` (new) | Paid / processing views. |
| `src/routes/api/stripe/webhook/+server.js` (new) | `POST` handler: verify, dispatch, log. |
| `.env.tpl` (new) | `op://` references for the two keys. |
| `compose.yaml` | Pass `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` through from the host environment. |
| `Dockerfile` | Copy the pruned `node_modules` into the runtime stage (see below). |
| `README.md` | Setup, test cards, Stripe CLI webhook forwarding. |

## Key decisions

### Pricing in cents

`flavors.js` prices are floats today (`2.25`). Floats are fine for display but not for charging. Each flavor gets `priceCents`. One line item per order:

- `unit_amount = priceCents × pack` (price of one pack)
- `quantity = quantity`
- total = `unit_amount × quantity`

Stripe shows the same total the form showed.

### Checkout Session parameters

```js
stripe.checkout.sessions.create({
  mode: 'payment',
  customer_email: email,
  line_items: [{
    quantity,
    price_data: {
      currency: 'usd',
      unit_amount: priceCents * pack,
      product_data: { name: `${flavor.name} — ${pack}-pack` }
    }
  }],
  metadata: { orderId, name, flavor: flavor.id, pack: String(pack), quantity: String(quantity) },
  payment_intent_data: { metadata: { orderId } },
  success_url: `${url.origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${url.origin}/order?canceled=1&flavor=${flavor.id}&pack=${pack}&quantity=${quantity}`
}, { idempotencyKey: orderId });
```

- Inline `price_data` means no Products or Prices need to be set up in the Stripe Dashboard. `flavors.js` stays the single source of truth.
- `url.origin` comes from SvelteKit, which uses `ORIGIN` in production, so URLs are right behind Docker.
- The idempotency key stops a double submit from creating two sessions for the same order ID.
- Metadata values must be strings (Stripe limit: 50 keys, 500 chars each).

### Redirect with `use:enhance`

SvelteKit's default `enhance` handles a `redirect` result with `goto`, and `goto` refuses external URLs. The form will use a custom callback:

```js
use:enhance={() => async ({ result, update }) => {
  if (result.type === 'redirect') window.location.href = result.location;
  else await update();
}}
```

Without JavaScript the form still works: the browser follows the 303 itself.

### Success page reads from Stripe

`/order/success` calls `stripe.checkout.sessions.retrieve(session_id)` and shows data from `session.metadata`, `session.amount_total` and `session.customer_details.email`. It checks `session.status === 'complete'` and shows "processing" when `payment_status !== 'paid'`. It writes nothing. Anyone who has a session ID can view that one receipt; session IDs are long and random, which is acceptable for a demo.

### Webhook endpoint

```js
export async function POST({ request }) {
  const body = await request.text();             // raw body, needed for the signature
  const sig = request.headers.get('stripe-signature');
  let event;
  try { event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET); }
  catch { return new Response('Bad signature', { status: 400 }); }
  if (!seen.has(event.id)) { seen.add(event.id); handle(event); }
  return new Response(null, { status: 200 });
}
```

- **CSRF:** SvelteKit's origin check covers form content types only. Stripe posts `application/json`, so the endpoint is not blocked.
- **Duplicates:** `seen` is an in-memory `Set` capped at about 1,000 IDs. It resets on restart, so a duplicate after a restart is logged again. That is acceptable while "fulfillment" is a log line. When real fulfillment is added, this needs a store.
- **Events subscribed:** `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.

### Secrets

`.env.tpl`:

```
STRIPE_SECRET_KEY=op://<vault>/stripe-test/STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=op://<vault>/stripe-test/STRIPE_WEBHOOK_SECRET
```

Run commands:

- Dev: `op run --account vationventures.1password.com --env-file .env.tpl -- npm run dev`
- Docker: `op run --account vationventures.1password.com --env-file .env.tpl -- docker compose up --build`

`compose.yaml` lists the variables without values (`- STRIPE_SECRET_KEY`), so Compose passes them through from the shell that `op run` set up. Nothing is written to disk.

For local webhook testing, `stripe listen` prints a temporary `whsec_…` signing secret. That secret is for the developer's machine only and is used in place of the stored one while forwarding.

### Docker runtime dependencies

`adapter-node` bundles `devDependencies` into `build/` but leaves `dependencies` as imports. The runtime stage copies only `build/` and `package.json` today, so `stripe` would be missing at run time. The build stage already runs `npm prune --omit=dev`; the runtime stage will add:

```dockerfile
COPY --from=build /app/node_modules ./node_modules
```

### Errors

| Case | Behaviour |
|---|---|
| Missing or non-test key | Action returns `fail(500, { checkoutError, values })`; server logs `[stripe] config: …`. |
| Stripe API error on create | Same as above; logs `[stripe] create session failed: <type> <message>`. |
| Unknown `session_id` on success page | `error(404)`. |
| Session not `complete` | `redirect(303, '/order')`. |
| Bad webhook signature | 400, no log of the body. |

## Testing

- **Unit (Vitest):** `priceOrder` for each pack size and quantity limits; `validateOrder` for each error case and a valid case; cents never become floats.
- **Manual end to end** with `npm run dev` + `stripe listen --forward-to localhost:5173/api/stripe/webhook`:
  - `4242 4242 4242 4242` → success page shows paid; server logs `PAID`.
  - `4000 0000 0000 9995` (declined) → Checkout shows the error; nothing logged as paid.
  - `4000 0025 0000 3155` (3-D Secure) → complete the challenge → paid.
  - Cancel on Checkout → back on `/order` with notice and previous choices.
  - `stripe trigger checkout.session.completed` twice with the same event via `stripe events resend` → logged once.
  - Post to the webhook with a wrong signature → 400.
- **Docker:** `docker compose up --build` under `op run`, then repeat the 4242 case.
