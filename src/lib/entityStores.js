import { createMockStore } from "./mockStore";

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

export const couponsStore = createMockStore("sipnow_admin_coupons", [
  {
    _id: "coupon-seed-1",
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    expiresAt: "2026-12-31",
    active: true,
  },
  {
    _id: "coupon-seed-2",
    code: "FLAT5",
    discountType: "fixed",
    discountValue: 5,
    expiresAt: "2026-09-30",
    active: true,
  },
]);

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

export const ordersStore = createMockStore("sipnow_admin_orders", [
  {
    _id: "order-seed-1",
    customerName: "Jane Cooper",
    total: 128.5,
    status: "processing",
    placedAt: "2026-08-10",
  },
  {
    _id: "order-seed-2",
    customerName: "Wade Warren",
    total: 64.0,
    status: "delivered",
    placedAt: "2026-08-05",
  },
  {
    _id: "order-seed-3",
    customerName: "Esther Howard",
    total: 42.99,
    status: "pending",
    placedAt: "2026-08-17",
  },
]);

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
