# Stripe payments — requirements

Status: **Draft, awaiting review**
Scope decided 2026-11-24: Stripe Checkout (hosted), one-time card payments, webhook confirmation, Stripe as the only store of order data.

## Background

The `/order` page lets a customer choose a flavor, pack size and quantity, enter a name and email, and submit. The server checks the input, logs the order and shows a confirmation. No payment is taken and nothing is saved.

This feature makes the customer pay through Stripe before an order counts as placed.

## Goals

- A customer can pay for the order they built on `/order` with a card (and any wallet Stripe Checkout offers, such as Apple Pay or Google Pay).
- The server, not the browser, sets the price.
- An order counts as paid only after Stripe confirms it through a signed webhook.
- The site runs in Stripe **test mode** for this demo.

## Out of scope

- Subscriptions and recurring deliveries.
- Refunds, an admin page, and order history on the site (use the Stripe Dashboard).
- A database. Order details live in the Checkout Session metadata in Stripe.
- Shipping addresses, tax calculation, discount codes, multiple flavors in one order.
- Emails sent by the site. Stripe can send receipts (Dashboard setting).
- Live-mode keys.

## User stories and acceptance criteria

Acceptance criteria use EARS form (*WHEN … THE SYSTEM SHALL …*).

### R1. Pay for an order

As a customer, I want to pay for my order by card so that it gets shipped.

1. WHEN a customer submits a valid order form THE SYSTEM SHALL create a Stripe Checkout Session in `payment` mode and send the browser to the session's hosted page.
2. THE SYSTEM SHALL compute the amount on the server from `src/lib/flavors.js` (price per can × pack size × quantity), in integer cents, and SHALL ignore any price sent by the browser.
3. THE Checkout page SHALL show one line item named like `Cherry Cola — 12-pack`, with the unit price of one pack and the chosen quantity, in USD.
4. THE SYSTEM SHALL pre-fill the customer's email on the Checkout page.
5. THE SYSTEM SHALL attach `orderId`, `name`, `flavor`, `pack` and `quantity` to the session as metadata.
6. WHEN the form is invalid THE SYSTEM SHALL show the same field errors as today and SHALL NOT contact Stripe.
7. IF Stripe returns an error while creating the session THEN THE SYSTEM SHALL keep the customer on `/order` with their entries kept and show "We couldn't start checkout. Please try again.", and SHALL log the error on the server.
8. The order form's button SHALL read `Continue to payment · $<total>`.

### R2. Return from Checkout

As a customer, I want to see clearly whether my payment went through.

1. WHEN Stripe sends the customer back after paying THE SYSTEM SHALL show `/order/success` with the order ID, flavor, pack, quantity and amount paid, read from the Checkout Session in Stripe.
2. IF the session's `payment_status` is not `paid` (for example a delayed payment method) THEN the success page SHALL say the payment is processing instead of saying the order is placed.
3. IF the `session_id` is missing, unknown, or the session is not complete THEN `/order/success` SHALL respond 404 or send the customer to `/order`.
4. WHEN the customer cancels on the Checkout page THE SYSTEM SHALL return them to `/order` with a notice "Checkout canceled — your card was not charged." and their previous choices pre-selected.
5. The success page SHALL NOT be the signal that an order is paid (see R3). Reloading or sharing it SHALL NOT create or change anything.

### R3. Confirm payment by webhook

As the business, I want orders confirmed only by Stripe so that a faked redirect cannot create a paid order.

1. THE SYSTEM SHALL expose `POST /api/stripe/webhook`.
2. THE SYSTEM SHALL verify every webhook's `Stripe-Signature` header against the raw request body with the webhook signing secret. IF verification fails THEN THE SYSTEM SHALL respond 400 and do nothing else.
3. WHEN it receives `checkout.session.completed` with `payment_status = paid`, or `checkout.session.async_payment_succeeded`, THE SYSTEM SHALL log one line: `[order] <orderId> PAID <quantity>x <pack>-pack <flavor> for <email> = $<total> (<session id>)`.
4. WHEN it receives `checkout.session.async_payment_failed` THE SYSTEM SHALL log `[order] <orderId> PAYMENT FAILED (<session id>)`.
5. WHEN it receives `checkout.session.expired` THE SYSTEM SHALL log `[order] <orderId> EXPIRED (<session id>)`.
6. THE SYSTEM SHALL respond 2xx to every verified event, including types it does not handle, so that Stripe stops retrying.
7. THE SYSTEM SHALL log a given event ID at most once per running process (Stripe can deliver an event more than once).

### R4. Configuration and secrets

1. THE SYSTEM SHALL read `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from the environment at run time. No key SHALL appear in source, the Docker image, or git.
2. IF `STRIPE_SECRET_KEY` is missing THEN the order action SHALL fail with the R1.7 message and log a clear configuration error, and the rest of the site SHALL keep working.
3. IF `STRIPE_SECRET_KEY` does not start with `sk_test_` or `rk_test_` THEN THE SYSTEM SHALL refuse to create sessions (demo is test mode only).
4. The repo SHALL contain a `.env.tpl` with 1Password `op://` references only, and the README SHALL document running with `op run`.
5. The Docker setup (`docker compose up`) SHALL keep working with the keys passed in from the environment.

## Non-functional requirements

- **Security:** the browser never receives the secret key. No publishable key is needed (Checkout is a redirect). Webhook signatures are always checked. Amounts are never taken from client input.
- **Money:** all amounts are integer cents. No floating-point sums.
- **Dependencies:** only the official `stripe` Node package is added at run time.
- **Testing:** the pricing and validation logic has unit tests. The full flow is checked by hand with Stripe test cards and the Stripe CLI (see `tasks.md`).

## Open questions

1. **1Password vault.** Which vault holds the Stripe test keys for this project? It is not in the known vault list. (Item name will be `stripe-test`.)
2. **Stripe account.** Which Stripe account (test mode) should the demo use?
3. **Git.** The project folder is not a git repository yet. Initialize one before implementation so each task can be its own commit?
