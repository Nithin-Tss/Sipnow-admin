# sipnow_admin — Admin Panel

Internal React SPA for SipNow staff. Built with Vite. Provides full store management: products, stock, orders, users, promotions, competitor pricing, and more.

## Tech stack

- **Framework:** React 19 + Vite 8
- **Language:** JavaScript (plain JS/JSX — no TypeScript; converted from TS in 2026-08)
- **Routing:** React Router v7
- **Data fetching:** TanStack Query v5 (`@tanstack/react-query`)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Tests:** Vitest + React Testing Library + jsdom

## Commands

```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Lint + vite build
npm test             # Run all tests
npm run test:coverage
npm run lint:fix     # Auto-fix lint issues
```

## Key architecture

- Pages are in `src/pages/` — one file per page, co-located `.test.jsx` alongside
- Shared components (`Modal`, `PaginationBar`, `Sidebar`, `Layout`, etc.) are in `src/components/`
- Auth state lives in `src/context/AuthContext.jsx`
- API calls go through `src/lib/api.js` which wraps fetch with the JWT header and base URL
- CSV parsing/generation is in `src/lib/csv.js`
- `src/hooks/useProductsPage.js` centralises product list state (filters, pagination, selection)

## Auth

**This app has no sign-in and no route/role gating.** There is no `/login` page, no `RequireAuth` wrapper in `App.jsx`, and no admin-only nav filtering in `Sidebar.jsx` — every route and nav item renders unconditionally, regardless of `AuthContext`'s `user` state (which stays `null` forever since nothing ever calls `login()`).

The backend routes this app talks to (see `sipnow_be/CLAUDE.md`'s Auth & roles section) were deliberately stripped of `authenticate`/`requireAdmin`/`requireStoreOwner`/`requireRoot` middleware to match — anyone with network access to the API can call them, not just this UI. `AuthContext`/`saveToken`/`clearToken`/`getToken` and the `login`/`logout` functions are still wired up (Sidebar still has a vestigial "Sign out" button, `Account.jsx` still POSTs to `/auth/password`), but nothing in this app ever acquires a JWT, so any call that hits a route still requiring auth (`/auth/me`, `/auth/password`) will 401.

If real access control is ever needed again, treat this as a from-scratch redesign — reintroducing just a login page won't restore the backend protection, since that was removed at the route level across `sipnow_be`.

## Pages summary

| Page          | Path             | Description                                                   |
| ------------- | ---------------- | ------------------------------------------------------------- |
| Dashboard     | `/`              | Revenue, orders, user, product counts                         |
| Products      | `/products`      | Full catalogue CRUD + CSV import/export                       |
| Catalogue     | `/catalogue`     | Category tree management + drag-reorder                       |
| Stock         | `/stock`         | POS CSV sync — match rows to products, update stock/prices    |
| Provider Maps | `/provider-maps` | Supplier code ↔ product mappings                              |
| Orders        | `/orders`        | Order status management                                       |
| Users         | `/users`         | Customer account list                                         |
| Reviews       | `/reviews`       | Product & service reviews                                     |
| Promotions    | `/offers`        | Home page carousel slides, split into In-Store/General tabs   |
| Coupons       | `/coupons`       | Coupon codes + featured banner                                |
| Gift Cards    | `/gift-cards`    | Gift card creation and redemption history                     |
| Stores        | `/stores`        | Pickup store locations (name, address, hours, Rendr store ID) |
| Compare       | `/compare`       | Competitor price comparison + scraper sync                    |
| Account       | `/account`       | Change admin password                                         |

## Competitor price sync (Compare page)

The Compare page calls the **local scraper** (`sipnow_scraper`) at `VITE_SCRAPER_URL` (default `http://localhost:7777`). The scraper must be running on the admin's machine before triggering a sync. After fetching, prices are saved to the backend via `POST /api/v1/competitors/links/:linkId/price`.

## Rendr delivery panel (Orders page)

The order-detail modal on `/orders` includes a "Delivery" section (`src/components/OrderDeliveryPanel.jsx`), shown for `fulfillmentType: "delivery"` orders only, with the current Rendr delivery status, price, window, and consignment number, with Retry/Dispatch, Cancel, Refresh Status, and Download Label actions — backed by `GET/POST/PATCH /api/v1/admin/deliveries/order/:orderId[/retry|/cancel|/refresh|/label]`. Orders are auto-dispatched to Rendr by the backend on creation; the Retry button covers the case where that initial dispatch failed (shown as a `failed` status badge) or no delivery record exists yet. Rendr's webhook is confirmed live in UAT (2026-07-10), so `Order.status` updates automatically as deliveries progress; "Refresh Status" remains available as a manual fallback — see `sipnow_be/CLAUDE.md`'s Rendr section for the full picture.

**Order status is read-only for delivery orders, driven by Rendr** — the modal's "Order Status" badge reflects `Order.status`, which the backend derives automatically from the Rendr delivery status for `fulfillmentType: "delivery"` orders (see `sipnow_be/CLAUDE.md`'s Rendr section). There's no status dropdown; the manual levers are the "Cancel Order" button (hidden once an order is `delivered`/`cancelled`/`returned`, works for any fulfillment type), which calls `PATCH /api/v1/orders/:id/status` with `{status: "cancelled"}`, plus — for `fulfillmentType: "pickup"` orders only — a "Pickup Store" section replacing the Delivery panel entirely, with "Mark Ready for Pickup" and "Mark Collected" buttons (same endpoint, `{status: "ready_for_pickup"}` / `{status: "delivered"}`) since pickup orders have no Rendr delivery to derive status from at all.

**Payment info block** shows once `selected.paymentMethod` is truthy — every order now has this set directly at creation (cash or card, no more COD), so it shows immediately at checkout for every order/fulfillment type, with a red badge for `paymentStatus: "failed"`. See `sipnow_be/CLAUDE.md`'s Stripe and "Pickup fulfillment" sections for the backend side.

## Promotions page

The Offers page (sidebar labeled "Promotions", still routed at `/offers`) now splits into two tabs by `Offer.type` (`IN_STORE_PROMOTION` / `GENERAL_PROMOTION`) — the add/edit form has a matching type picker, defaulting to whichever tab is active. The Products page separately gained an "Include in General Promotions" checkbox (`Product.isGeneralPromotion`) — unrelated to the `Offer` carousel, it drives the storefront's `/general-promotions` listing and the "General Promo" badge on `ProductCard` (see `sipnow/CLAUDE.md`'s Promotions section).

## CSV import/export

CSV logic is centralised in `src/lib/csv.js`. Key behaviours:

- Leading/trailing whitespace is trimmed from all fields
- Non-HTTP image URLs are skipped silently
- Missing categories/products can be created inline during import (user is prompted)
- POS CSV matching uses brand + name + vintage + size fuzzy scoring

## Testing conventions

- Coverage target: ≥ 80% on new code
- Test helpers in `src/test/helpers.jsx` (custom render with providers)
- `src/test/setup.js` — global test setup (jest-dom matchers)
- CI quality gate via SonarQube

## Environment

Copy `.env.example` → `.env`.

| Variable           | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `VITE_API_URL`     | Backend base URL (e.g. `http://localhost:4000`)      |
| `VITE_SCRAPER_URL` | Local scraper URL (default: `http://localhost:7777`) |
