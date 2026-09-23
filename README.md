# Ledger — Business Billing & Receipt System

A production-oriented billing/POS web app for small and medium businesses:
add products, build a bill at a fast POS-style screen, apply GST correctly
(CGST+SGST or IGST, inclusive or exclusive pricing), record payment, and
print a clean receipt — with full invoice history and a business dashboard.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL +
Prisma + Zod + React Hook Form**.

---

## 1. A note on how this was built

This project was generated end-to-end in a sandboxed environment that could
run Node, PostgreSQL, and the test suite, but had **no network access to
Prisma's engine CDN** (`binaries.prisma.sh`). That CDN is required by
`npx prisma generate` / `migrate` to download their query-engine binaries.
Practically, this means:

- The **billing calculation engine** (`lib/billing/calculate.ts`) — the most
  important logic in the app — was fully built, unit-tested, and verified in
  that sandbox (`npm test`, 22 passing tests covering every scenario in the
  spec: GST-exclusive, GST-inclusive, CGST/SGST, IGST, discounts, rounding,
  partial payments, etc). This has no external dependencies and runs anywhere.
- The full **Next.js app** (every page, server action, and component) was
  verified with `tsc --noEmit`, `eslint`, and a real `next build` against a
  hand-written type-and-runtime stub standing in for the generated Prisma
  client, to catch broken imports, type errors and routing issues. The stub
  was deleted before this project was packaged - it is **not** part of what
  you're looking at.
- What could **not** be verified in that sandbox: an actual `npx prisma
  generate` / `npx prisma migrate dev` run, and a live end-to-end request
  against PostgreSQL through the generated client. On a normal machine with
  internet access (your laptop, CI, Vercel, etc.) this is completely routine
  Prisma usage and should work out of the box — but you are the first
  environment where the full stack runs together, so budget a few minutes
  for `npm run db:generate` / `npm run db:migrate` and a smoke test after
  setup, per the steps below.

Nothing about the app's design depends on that limitation — it's a normal
Prisma + PostgreSQL project.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 (custom "ledger" design tokens, no default theme) |
| Database | PostgreSQL |
| ORM | Prisma (Rust-free client + `@prisma/adapter-pg` driver adapter) |
| Validation | Zod, shared between client forms and server actions |
| Forms | React Hook Form |
| Auth | Hand-rolled: bcrypt password hashing + signed JWT session cookie (`jose`), verified in edge middleware |
| Testing | Vitest |
| Charts | Recharts |
| Icons | lucide-react |

No authentication-as-a-service or ORM-as-a-service dependency — everything
runs against your own Postgres instance.

---

## 3. Getting started

### Prerequisites
- Node.js 20+
- A PostgreSQL 14+ database (local install, Docker, or a hosted instance
  like Neon/Supabase/RDS)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then edit .env:
#   DATABASE_URL   - your Postgres connection string
#   AUTH_SECRET    - a long random string, e.g. `openssl rand -base64 32`

# 3. Generate the Prisma client
npm run db:generate

# 4. Create the database schema
npm run db:migrate
# (this also runs the seed script automatically the first time, via the
#  "prisma.seed" entry in package.json)

# 5. (Optional) re-seed demo data at any time
npm run db:seed

# 6. Start the dev server
npm run dev
```

Open http://localhost:3000. The seed script creates a demo account:

```
email:    owner@example.com
password: password123
```

Business: "ABC General Store" with sample categories, products (some with
stock tracking, one deliberately low on stock), a customer, and a few
example invoices — including one cross-state invoice so you can see IGST
in the receipt as well as CGST+SGST.

If you'd rather start from a completely empty account, register a new one
from `/register` — you'll land in the business setup wizard immediately.

### Running tests

```bash
npm test
```

Runs the full billing calculation engine test suite (`lib/billing/calculate.test.ts`).

### Linting

```bash
npm run lint
```

---

## 4. The billing calculation engine

Every invoice total in this app — on the live billing screen and when an
invoice is actually saved — is computed by **one function**:
`calculateInvoiceTotals()` in `lib/billing/calculate.ts`. No component and
no server action re-derives GST or discount math independently.

Design decisions baked into it:

- **Integer minor units, never floats.** All money is stored and computed
  as an integer number of paise (`unitPriceMinor`, `grandTotalMinor`, etc).
  Quantities are stored as integers scaled by 1000 (`quantityMilli`) so
  fractional quantities like `1.5 kg` are exact. GST rates are stored as
  "basis points of a percent" (`1800` = 18.00%) so fractional GST rates are
  exact too. This eliminates an entire category of floating-point rounding
  bugs that plague naive billing code.
- **Calculation order** matches the spec exactly: line subtotal → item
  discount → subtotal → bill discount (allocated proportionally across
  lines using a largest-remainder method, so it always reconciles exactly
  even with mixed GST rates) → taxable amount → GST (CGST+SGST or IGST, per
  line rate) → optional rounding to the nearest currency unit → payment →
  amount due / change.
- **GST-inclusive pricing** uses the correct tax-inclusive formula
  (`taxable = inclusive / (1 + rate)`), not a naive percentage subtraction.
- **CGST/SGST vs IGST** is resolved server-side (`resolveTaxType` in
  `lib/actions/invoices.ts`) by comparing the business's state to the
  customer's state — never trusted from the client.
- The engine is a pure function with no I/O, so it's trivially unit-tested
  (`lib/billing/calculate.test.ts`) and reused identically by the live
  billing screen (for instant on-screen totals) and the server action that
  actually persists the invoice (so what you see is exactly what gets
  charged and saved).

---

## 5. Architecture

```
app/
  (auth)/login, register          - public auth pages
  (app)/                          - authenticated app shell (sidebar/topbar)
    dashboard/
    products/, products/new, products/[id]/edit
    categories/
    customers/, customers/new, customers/[id]/edit
    billing/                      - the POS screen
    invoices/, invoices/[id]      - history + receipt/print view
    settings/, business/setup/
components/
  ui/                             - hand-built shadcn-style primitives
  layout/                         - sidebar, topbar, mobile drawer, app shell
  billing/                        - POS screen and its sub-components
  products/, customers/, categories, invoices, receipt, dashboard, settings
lib/
  billing/calculate.ts            - the invoice calculation engine (+ tests)
  money.ts                        - currency formatting, unit conversions
  auth/                           - password hashing, JWT session
  actions/                        - all server actions (the only DB access point)
  db.ts                           - Prisma client singleton
schemas/                          - Zod schemas, shared by forms and server actions
prisma/
  schema.prisma                   - the database schema
  seed.ts                         - development seed data
proxy.ts                          - route protection (Next 16's middleware convention)
```

**Data access is centralized.** UI components never talk to Prisma
directly — everything goes through a server action in `lib/actions/`, each
of which starts with `requireSession()` and scopes every query to
`session.businessId`. This is the tenant-isolation boundary: a user from
Business A can never read or write Business B's products, customers,
invoices, or settings, because every `where` clause is anchored to their own
`businessId` and every mutation re-checks `existing.businessId ===
session.businessId` before touching a row.

**Historical invoices never change.** `InvoiceItem` stores a full snapshot
of the product name, SKU, unit, price, and GST rate *at the time of sale*.
If you edit a product's price tomorrow, every past invoice that used it
keeps showing what the customer actually paid.

**Invoice numbers are generated safely.** `BusinessSettings.nextInvoiceNumber`
is incremented inside the same database transaction that creates the
invoice; the row lock taken by that `UPDATE` serializes concurrent
checkouts, so two invoices can never be issued the same number even under
concurrent load.

---

## 6. Environment variables

See `.env.example`. Summary:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret used to sign session cookies (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app (used in a couple of absolute links) |

---

## 7. Deployment

1. Provision a PostgreSQL database (Neon, Supabase, RDS, etc).
2. Set `DATABASE_URL` and `AUTH_SECRET` in your hosting provider's
   environment variables.
3. Run `npx prisma migrate deploy` against the production database (do this
   from CI or a one-off job — it applies migrations without prompting).
4. Deploy the Next.js app as usual (e.g. `vercel deploy`, or `npm run build
   && npm start` on any Node host). The `postinstall` script runs `prisma
   generate` automatically during your platform's build step.

---

## 8. What's implemented

- Business registration/login/logout, JWT session cookie verified in
  middleware, full multi-tenant data isolation
- Business profile + invoice/GST settings (prefix, next number, currency,
  GST default, inclusive/exclusive pricing, discount toggles, receipt
  footer, terms & conditions)
- Product management: create/edit/delete, SKU/barcode, category, unit
  (piece/kg/gram/liter/meter/box/packet/dozen/hour/service), GST rate,
  optional stock tracking with low-stock threshold, search/filter/sort
- Category management (CRUD)
- Customer management (CRUD), GSTIN validation
- POS billing screen: fast product search (name/SKU/barcode), editable
  quantity with +/- steppers (fractional-unit aware), per-item discount and
  optional manual price override (settings-gated), customer picker with
  quick-add, GST on/off toggle with live CGST+SGST vs IGST resolution,
  bill-level discount, payment method + amount paid with live change/due
- Server-side re-validation on checkout: stock availability, product
  existence/active status, GST/discount recomputation — the client is never
  trusted for the final numbers
- Atomic, gap-free invoice numbering
- Receipt view: business header (logo/address/phone/GSTIN), invoice
  number/date, customer, line items, subtotal/discount/taxable/CGST/SGST/
  IGST/round-off/grand total, payment status, terms & conditions, footer
  message — print-ready (`window.print()` → "Save as PDF" works in every
  major browser) and legible on both A4 and narrow thermal-receipt widths
- Invoice history with search, date range, payment-status filters; view,
  print, and duplicate-into-a-new-bill actions
- Dashboard: today's sales/invoices, pending payments, product count,
  low-stock count, 7-day sales trend chart, top-selling products, recent
  invoices, low-stock list
- Basic inventory: stock decrements automatically on sale, manual stock
  adjustment action, low-stock alerts, full `InventoryTransaction` ledger
- Zod validation shared by every form and re-enforced in every server
  action (never trusts client-side validation alone)
- Responsive layout (mobile drawer nav, stacked billing screen on small
  screens), loading/empty/error states, toast notifications, confirm
  dialogs before destructive actions

## 9. Offline billing

The billing screen keeps working when the connection drops mid-sale:

- Products and customers are cached in the browser (IndexedDB) whenever the
  billing screen loads with a connection, so search still works offline.
- If checkout can't reach the server, the bill is saved locally instead of
  failing, a receipt renders immediately from the same calculation engine
  used online, and it's queued for sync - see `lib/offline/outbox.ts`.
- Queued bills sync automatically the moment the browser reconnects (and are
  retried periodically as a fallback), strictly in the order they were
  billed, and are idempotent: a retried sync can never create a duplicate
  invoice even if a previous attempt's response was lost mid-flight
  (`Invoice.idempotencyKey`, checked before every insert).
- A floating indicator (bottom-right) shows pending/syncing state anywhere
  in the app; Invoice History also lists anything still queued, with retry/
  discard for a bill the server genuinely rejected (e.g. stock ran out
  before it synced) - distinct from a bill still waiting for a connection.

**Real, disclosed limits**, not bugs:
- Stock and plan-usage limits (`maxCustomers`, `maxInvoicesPerMonth`) can't
  be enforced while offline - they're re-checked for real at sync time, so
  a queued sale can occasionally be rejected on sync (shown clearly, never
  silently dropped).
- Two different devices selling offline at the same time can both "sell"
  the last unit of a low-stock item - the local stock cache only prevents
  oversell on the *same* device.
- The app shell itself (this page's JS/CSS) still needs to have loaded once
  while online before it can be reached with no network at all. Making the
  page itself installable/offline-launchable (a PWA service worker) is a
  natural next step but is a separate piece of work from the sync engine
  above.

## 10. Known limitations / good next steps

- **Stock is whole-unit only.** `Product.stockQty` is an integer, so a sale
  of a fractional quantity (e.g. `1.5 kg`) is rounded to the nearest whole
  unit in the stock ledger. Tracking fractional stock precisely would mean
  switching `stockQty` to a milli-unit integer like quantities already are.
- **Single-user-per-business today.** The schema has a `UserRole` (`OWNER`
  / `STAFF`) and `User.businessId` ready for multiple staff logins per
  business; only the owner flow (create business at registration) is wired
  up in the UI. Adding an "invite a staff member" flow is additive.
- **PDF generation uses the browser's print dialog** ("Save as PDF") rather
  than a server-rendered PDF library. This keeps the dependency list small
  and produces a genuinely clean receipt in every major browser; swapping
  in a server-side renderer (e.g. Puppeteer) later is a drop-in addition
  behind the existing "Print / Save as PDF" button.
- Barcode scanner input, thermal printer integration, WhatsApp/email
  invoice delivery, UPI/Razorpay/Stripe payment capture, supplier/purchase
  management, expense tracking, multi-branch and multi-business accounts,
  and GSTR-style tax reports are all intentionally out of scope for this
  version but the schema (tenant model, `InventoryTransaction`,
  `PaymentMethod` enum, etc.) was designed so none of them require a
  rewrite of the core.
