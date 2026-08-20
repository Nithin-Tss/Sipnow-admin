import { createMockStore } from "./mockStore";
import { apiFetch } from "./apiClient";

export const usersStore = createMockStore("sipnow_admin_users", [
  {
    _id: "user-seed-1",
    firstName: "Admin",
    lastName: "User",
    email: "admin@sipnow.com",
    role: "admin",
    active: true,
  },
  {
    _id: "user-seed-2",
    firstName: "Store",
    lastName: "Owner",
    email: "owner@sipnow.com",
    role: "store_owner",
    active: true,
  },
]);

/* =========================================================
   COUPONS
   Admin coupon CRUD uses the backend API.
   Coupons are NOT stored as frontend/mock data.
   ========================================================= */

export const couponsStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/coupons");

    const coupons = Array.isArray(response)
      ? response
      : Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.coupons)
          ? response.coupons
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? coupons.filter((coupon) =>
          String(coupon.code || "")
            .toLowerCase()
            .includes(searchValue),
        )
      : coupons;

    const total = filtered.length;

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);

    const start = (safePage - 1) * perPage;

    return {
      items: filtered.slice(start, start + perPage),
      total,
      totalPages,
    };
  },

  async create(body) {
    const response = await apiFetch("/coupons", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response.data ?? response;
  },

  async update(id, body) {
    const response = await apiFetch(`/coupons/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    return response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/coupons/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   GIFT CARDS
   ========================================================= */

export const giftCardsStore = createMockStore("sipnow_admin_gift_cards", [
  {
    _id: "gc-seed-1",
    code: "GIFT-25-AB12",
    initialValue: 25,
    balance: 25,
    active: true,
  },
  {
    _id: "gc-seed-2",
    code: "GIFT-50-CD34",
    initialValue: 50,
    balance: 32.5,
    active: true,
  },
]);

/* =========================================================
   STORES
   ========================================================= */

export const storesStore = createMockStore("sipnow_admin_stores", [
  {
    _id: "store-seed-1",
    name: "SipNow Downtown",
    address: "120 Main St",
    city: "Austin, TX",
    phone: "(512) 555-0110",
    active: true,
  },
  {
    _id: "store-seed-2",
    name: "SipNow Riverside",
    address: "48 River Rd",
    city: "Austin, TX",
    phone: "(512) 555-0182",
    active: true,
  },
]);

/* =========================================================
   SUPPLIERS
   ========================================================= */

export const suppliersStore = createMockStore("sipnow_admin_suppliers", [
  {
    _id: "supplier-seed-1",
    name: "Lone Star Distributors",
    contactEmail: "orders@lonestardist.com",
    phone: "(512) 555-0100",
    region: "Texas",
  },
  {
    _id: "supplier-seed-2",
    name: "Gulf Coast Beverage Co.",
    contactEmail: "sales@gulfcoastbev.com",
    phone: "(713) 555-0142",
    region: "Gulf Coast",
  },
]);

/* =========================================================
   CATEGORIES
   ========================================================= */

export const categoriesStore = createMockStore("sipnow_admin_categories", [
  {
    _id: "cat-seed-1",
    name: "Red Wine",
    group: "wine",
    description: "Full and light-bodied red wines.",
  },
  {
    _id: "cat-seed-2",
    name: "Vodka",
    group: "spirits",
    description: "Plain and flavored vodkas.",
  },
  {
    _id: "cat-seed-3",
    name: "Craft Beer",
    group: "beer",
    description: "Local and imported craft beers.",
  },
]);

/* =========================================================
   PROMOTIONS
   ========================================================= */

export const promotionsStore = createMockStore("sipnow_admin_promotions", [
  {
    _id: "promo-seed-1",
    title: "Summer Wine Sale",
    discountPercent: 15,
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    active: true,
  },
  {
    _id: "promo-seed-2",
    title: "Holiday Spirits Special",
    discountPercent: 20,
    startDate: "2026-12-01",
    endDate: "2026-12-31",
    active: false,
  },
]);

/* =========================================================
   OFFERS
   ========================================================= */

export const offersStore = createMockStore("sipnow_admin_offers", [
  {
    _id: "offer-seed-1",
    title: "Buy 2 Get 1 Free — Craft Beer",
    badgeText: "BOGO",
    description: "Limited-time bundle offer on selected craft beers.",
    active: true,
  },
  {
    _id: "offer-seed-2",
    title: "Free Shipping Over $75",
    badgeText: "FREE SHIP",
    description: "Applies automatically at checkout.",
    active: true,
  },
]);

/* =========================================================
   ORDERS
   ========================================================= */

export const ordersStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/orders");

    const orders = (response.orders || []).map((order) => ({
      ...order,

      customerName: order.user?.name || order.user?.email || "Customer",

      total: order.totalAmount,

      placedAt: order.createdAt,

      fulfilment: order.fulfilment || "delivery",
    }));

    const term = search.trim().toLowerCase();

    const filtered = term
      ? orders.filter((order) =>
          `${order.customerName} ${order.status} ${order.couponCode || ""}`
            .toLowerCase()
            .includes(term),
        )
      : orders;

    const start = (page - 1) * perPage;

    return {
      items: filtered.slice(start, start + perPage),

      total: filtered.length,

      totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
    };
  },

  async update(id, body) {
    const response = await apiFetch(`/orders/${id}/status`, {
      method: "PATCH",

      body: JSON.stringify({
        status: body.status,
      }),
    });

    return response.order;
  },

  async remove(id) {
    return apiFetch(`/orders/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   REVIEWS
   ========================================================= */

export const reviewsStore = createMockStore("sipnow_admin_reviews", [
  {
    _id: "review-seed-1",
    productName: "Château Margaux 2015",
    customerName: "Jane Cooper",
    rating: 5,
    comment: "Absolutely wonderful, smooth and rich.",
    status: "approved",
  },
  {
    _id: "review-seed-2",
    productName: "Grey Goose Vodka",
    customerName: "Wade Warren",
    rating: 4,
    comment: "Great quality, fast delivery.",
    status: "pending",
  },
]);

/* =========================================================
   MESSAGES
   ========================================================= */

export const messagesStore = createMockStore("sipnow_admin_messages", [
  {
    _id: "msg-seed-1",
    fromName: "Jane Cooper",
    fromEmail: "jane@example.com",
    subject: "Question about delivery times",
    body: "Hi, when can I expect my order to arrive?",
    status: "unread",
  },
  {
    _id: "msg-seed-2",
    fromName: "Wade Warren",
    fromEmail: "wade@example.com",
    subject: "Damaged bottle in order",
    body: "One of the bottles arrived cracked, can I get a replacement?",
    status: "read",
  },
]);
