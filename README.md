# Agro-IntelliSense: Next.js migration

Your project in Next.js (App Router) with **Firebase login/signup**, a separate admin login, `.env` for every API,
a complete order system (stock, card payment, emails, order pages) and a hardened backend.

```
web/                  Next.js 15 app (user site + /admin panel)   http://localhost:3000
backend/              Express + MongoDB API                        http://localhost:4000
plant_disease_api/    Flask + TensorFlow disease detection         http://127.0.0.1:5000
```

---

## 1. Set up (once)

### Copy from your OLD project
| Copy this | Into |
|---|---|
| `backend/uploads/*` (product, team, slider images) | `backend/uploads/` |
| everything in `public/` (`fyplogo.png`, `fodlog.png`, `mnsau*.png` ...) | `web/public/` |
| your 3 `.keras` model files | `plant_disease_api/model/` |

### Turn on Firebase login (2 minutes)
1. Open the [Firebase console](https://console.firebase.google.com) → your project → **Authentication** → **Get started**.
2. **Sign-in method** → **Email/Password** → **Enable** → Save.
3. That's it for local use (`localhost` is already an authorized domain). When you deploy, add your domain under
   Authentication → Settings → **Authorized domains**.

### Fill in `backend/.env` (copy `.env.example` first)
| Key | What to put |
|---|---|
| `MONGO_URI` | your MongoDB connection string. **The database name must be the one your old products live in** (see Troubleshooting) |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FIREBASE_PROJECT_ID` | same value as `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in `web/.env.local` |
| `ADMIN_EMAILS` | your admin email(s), comma separated (see "Admin accounts") |
| `EMAIL_USER`, `EMAIL_PASS` | Gmail + App Password. Now only used for order and contact emails |
| `STRIPE_*` | optional, see "Online payment" |

### Fill in `web/.env.local`
Put the **same** `JWT_SECRET` as the backend. The Firebase values are already filled in.

## 2. Run

```bash
cd backend && npm install && npm run dev        # terminal 1
cd web && npm install && npm run dev            # terminal 2  -> http://localhost:3000   (run npm install again: new design packages)
cd plant_disease_api && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python app.py   # terminal 3 (optional)
```
The backend prints `MongoDB connected successfully (database: "...")` and `Products in this database: N`.

---

## How login works now
- **Sign up** (`/signup`): Firebase creates the account and emails a verification link. You must verify before logging in.
- **Log in** (`/login`): Firebase checks the password, the backend verifies Firebase's signed token and starts a shop session
  (an `httpOnly` cookie, 7 days). Roles, orders and admin protection work exactly as before.
- **Forgot password**: Firebase emails a reset link. **Verification and reset emails come from Firebase**, so Gmail is not needed for them
  (change the wording in Firebase console → Authentication → Templates).
- Passwords are stored by Firebase, never by your server.

### Admin accounts (separate from user signup)
- The public signup page has **no admin option**. Admins log in at **`/admin/login`**.
- To make the first admin: put your email in `ADMIN_EMAILS`, **sign up normally at `/signup` with that email**, verify it, then log in at `/admin/login`.
  Anyone whose verified email is in `ADMIN_EMAILS` becomes admin automatically.
- More admins: **Admin → Users** → change someone's role. (If you demote someone whose email is still in `ADMIN_EMAILS`, remove it from there too, or they are promoted again at next login.)

### Your existing users
Old accounts cannot be copied into Firebase (passwords are not portable). Each person **signs up again with the same email**. The backend
links the new login to the old shop account, so **their orders and role (including old admins) are kept**.

---

## Features

**Orders** `/cart` → checkout → `/orders` → `/orders/<id>` (progress bar, items, payment, Print invoice, cancel / pay now).
Admin: `/admin/orders`, `/admin/orders/<id>` (change status, mark cash received, refund). Prices are always read from the database, never from the browser.

**Stock**: each product has a stock number (Admin → Website Content). Ordering takes stock atomically, so the last item cannot be sold twice;
cancelling returns it once. Products created before this feature get a starting stock once (`INITIAL_STOCK_FOR_EXISTING_PRODUCTS`, default 50).

**Emails** (Gmail): customer gets order confirmation + status updates; you get "new order". A failing email never blocks an order.

**Online payment (Stripe Checkout)**: the card option appears only when `STRIPE_SECRET_KEY` is set.
1. Put the test key (`sk_test_...`) in `backend/.env`, restart. Test card: `4242 4242 4242 4242`, any future date, any CVC.
2. `STRIPE_CURRENCY=pkr` (use `usd` if Stripe rejects it for your account).
3. Webhook (recommended for a real site): `stripe listen --forward-to localhost:4000/order/stripe-webhook`, put the `whsec_...` in `STRIPE_WEBHOOK_SECRET`.
   Without it, payment is confirmed when the customer returns to your site.
4. Customers cannot cancel paid orders; an admin cancelling one marks it *Refund due* and the order page shows **Refund via Stripe**.

> As far as I know Stripe does not accept businesses based in Pakistan. If you cannot get keys, leave `STRIPE_SECRET_KEY` empty and the shop runs on cash on delivery.
> The Stripe code is isolated in `backend/utils/stripe.js` and `backend/controllers/orderController.js` if you need another gateway.

**Admin → Users** (`/admin/users`): search, filter, orders count and total spent, change roles, delete users (orders are kept; also delete them in Firebase console → Authentication → Users to remove their login).
You cannot change/delete yourself and the last admin cannot be removed.

### Design and animation
The whole site uses one look, called **reservoir**: cool "mist" neutrals, deep nutrient-tank ink, leaf green, and a thin
**pH colour ribbon** (the universal-indicator colours) under the navbar and footer. Headlines use *Bricolage Grotesque*, text uses *Figtree*.

- **Change the colours in one place:** `web/src/app/globals.css`. The `green` and `gray` scales in `@theme` re-colour every page; the light/dark
  surface colours are the variables in `:root` and `.dark`. Shared button/input/card styles (`.btn`, `.field`, `.surface`) are in the same file.
- **Animation is Framer Motion.** Reusable pieces are in `web/src/components`: `motion.tsx` (`Stagger`, `CountUp`), `Toast.tsx`, `Bubbles.tsx`,
  `SensorTank.tsx`, `AuthShell.tsx`. People who turned on "reduce motion" in their system get no movement (`MotionProvider.tsx`).
- **What moves, and why:**
  - Home hero: the headline rises line by line and the **tank fills to your real soil-moisture reading** from Firebase, with bubbles and a wave.
  - Things that answer a click: cart toasts instead of pop-ups, "Added" button state, quantity steppers, items sliding out of the cart, the checkout dialog,
    the animated tab underlines and navbar/sidebar highlight, the order progress bar, order filters, theme toggle.
  - Quiet extras: a fast fade between pages, numbers that count up, the About page line that draws as you scroll through the four steps.
- **Fonts** come from npm (`@fontsource-variable/...`), so they work offline after `npm install`. If those two packages ever fail to install,
  delete the two `@fontsource-variable` lines in `web/src/app/layout.tsx` and the site falls back to system fonts.
- The old pages with large forms (admin content forms, farm-monitoring dashboard) get the new colours and fonts automatically; their layouts are unchanged.

### URL map
| URL | Who |
|---|---|
| `/` `/products` `/about-hydroponics` `/contact` `/login` `/signup` `/verify-email` `/forgot-password` | everyone |
| `/cart` `/orders` `/orders/<id>` | logged-in users |
| `/admin/login` | admin login |
| `/admin` (website content) `/admin/monitoring` (sensors + disease AI) `/admin/orders` `/admin/orders/<id>` `/admin/users` | admins only |

Admin pages are protected three times: Next.js middleware (server-side redirect), an `httpOnly` cookie, and an admin check on every API call.

### What was fixed in the old backend
Admin routes had no login check; `/admin/getuser` leaked password hashes; anyone could choose the admin role; the JWT secret was hardcoded;
orders trusted browser prices; checkout never worked (`localStorage "id"` vs `"userId"`); editing a product without a new image crashed.

---

## Tests
`cd backend && npm test` runs 27 checks with in-memory fakes (no database, Firebase or Stripe needed): stock rollback, double-cancel,
payment idempotency, late payments, refunds, Firebase token checks, role-injection attempts, old-account linking, admin promotion.

## Troubleshooting
- **No products on the shop page.** Open `http://localhost:4000/admin/get-products` in the browser.
  - `[]` → the backend is connected to a database with no products. Look at `database: "..."` in the backend console. Your old products live in the database named in your OLD connection string (the part after `.net/` and before `?`; if it had none, the name is `test`). Put that name in `MONGO_URI`, or add products in Admin → Website Content.
  - A list of products → the page cannot reach the backend: check `CLIENT_URL=http://localhost:3000` in `backend/.env` and that you open the site at `localhost`, not `127.0.0.1`.
- **"Email/password sign-in is switched off"** → do "Turn on Firebase login" above.
- **Login OK but admin pages bounce to `/admin/login`** → your email is not in `ADMIN_EMAILS`, or `JWT_SECRET` differs between `backend/.env` and `web/.env.local`. Restart both servers after editing.
- **"The server is not configured for login"** → `FIREBASE_PROJECT_ID` is missing in `backend/.env`.
- **Verification email not arriving** → check spam; use "Resend email" (Firebase limits how often).

## Honest limitations
- Syntax-checked, and the order/stock/payment/login logic is tested against fakes. It has **not been run end to end** with real MongoDB, Firebase, Gmail or Stripe where I built it, so send me any error you see.
- The shop session lasts 7 days. Changing your password in Firebase does not end sessions that are already open on other devices.
- Refunds are whole-order only. The cart lives in the browser (`localStorage`).
- For production with the API on another domain, set `COOKIE_DOMAIN` and `NODE_ENV=production` (needs HTTPS).
