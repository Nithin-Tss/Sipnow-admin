import { createMockStore } from "./mockStore";
import { apiFetch } from "./apiClient";

/* =========================================================
   USERS
   Real backend: GET /api/users returns a bare array of User
   docs (_id, name, email, phone, role, createdAt). There is
   no create/generic-update admin endpoint — only role update
   (PUT /api/users/:id/role) and delete.
   ========================================================= */

export const usersStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/users");

    const users = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.users)
          ? response.users
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? users.filter((u) =>
          `${u.name || ""} ${u.email || ""}`
            .toLowerCase()
            .includes(searchValue),
        )
      : users;

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

  async all() {
    const response = await apiFetch("/users");
    return Array.isArray(response) ? response : (response?.data ?? []);
  },

  async updateRole(id, role) {
    const response = await apiFetch(`/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    return response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/users/${id}`, {
      method: "DELETE",
    });
  },
};

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
   Real backend: GET /api/giftcards -> { giftCards: [...] }.
   Fields: code, amount, balance, recipientName, recipientEmail,
   message, expiryDate, isActive, isRedeemed.
   ========================================================= */

export const giftCardsStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/giftcards");

    const giftCards = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.giftCards)
          ? response.giftCards
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? giftCards.filter((g) =>
          String(g.code || "")
            .toLowerCase()
            .includes(searchValue),
        )
      : giftCards;

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
    const response = await apiFetch("/giftcards", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.giftCard ?? response.data ?? response;
  },

  async update(id, body) {
    const response = await apiFetch(`/giftcards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return response.giftCard ?? response.data ?? response;
  },

  async updateStatus(id, isActive) {
    const response = await apiFetch(`/giftcards/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    return response.giftCard ?? response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/giftcards/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   STORES
   Real backend: GET /api/stores?all=true -> { stores: [...] }.
   Address is a nested object: { addressLine1, addressLine2,
   city, state, postalCode, country }.
   ========================================================= */

export const storesStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/stores?all=true");

    const stores = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.stores)
          ? response.stores
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? stores.filter((s) =>
          `${s.name || ""} ${s.address?.city || ""}`
            .toLowerCase()
            .includes(searchValue),
        )
      : stores;

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
    const response = await apiFetch("/stores", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.store ?? response.data ?? response;
  },

  async update(id, body) {
    const response = await apiFetch(`/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return response.store ?? response.data ?? response;
  },

  async updateStatus(id, isActive) {
    const response = await apiFetch(`/stores/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    return response.store ?? response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/stores/${id}`, {
      method: "DELETE",
    });
  },
};

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
   Real backend: GET /api/categories?all=true -> { categories: [...] }.
   Fields: name, slug (auto), description, image, isActive.
   The mock's "group" (wine/spirits/beer) concept does not
   exist on the backend Category model — dropped.
   ========================================================= */

export const categoriesStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/categories?all=true");

    const categories = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.categories)
          ? response.categories
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? categories.filter((c) =>
          String(c.name || "")
            .toLowerCase()
            .includes(searchValue),
        )
      : categories;

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
    const response = await apiFetch("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.category ?? response.data ?? response;
  },

  async update(id, body) {
    const response = await apiFetch(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return response.category ?? response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   PROMOTIONS
   Real backend: GET /api/promotions -> { promotions: [...] }.
   Fields: title, description, type, discountType, discountValue,
   startDate, endDate, priority, isActive (not discountPercent/active).
   ========================================================= */

export const promotionsStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/promotions");

    const promotions = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.promotions)
          ? response.promotions
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? promotions.filter((p) =>
          String(p.title || "")
            .toLowerCase()
            .includes(searchValue),
        )
      : promotions;

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
    const response = await apiFetch("/promotions", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.promotion ?? response.data ?? response;
  },

  async update(id, body) {
    const response = await apiFetch(`/promotions/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return response.promotion ?? response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/promotions/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   OFFERS
   Real backend: GET /api/offers -> { offers: [...] }.
   Fields: title, description, code, discountType, discountValue,
   minimumPurchase, maximumDiscount, startDate, endDate, isActive
   (not badgeText/active).
   ========================================================= */

export const offersStore = {
  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const response = await apiFetch("/offers");

    const offers = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.offers)
          ? response.offers
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? offers.filter((o) =>
          `${o.title || ""} ${o.code || ""}`
            .toLowerCase()
            .includes(searchValue),
        )
      : offers;

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
    const response = await apiFetch("/offers", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.offer ?? response.data ?? response;
  },

  async update(id, body) {
    const response = await apiFetch(`/offers/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return response.offer ?? response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/offers/${id}`, {
      method: "DELETE",
    });
  },
};

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
   Real backend: GET /api/reviews?status=pending|approved|hidden
   -> { reviews: [...] }, each populated with `product` (name,
   image) and `user` (name). No flat productName/customerName —
   moderation is status + delete only (no admin create/edit).
   ========================================================= */

export const reviewsStore = {
  async list({ search = "", status = "", page = 1, perPage = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);

    const response = await apiFetch(
      `/reviews${params.toString() ? `?${params.toString()}` : ""}`,
    );

    const reviews = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.reviews)
          ? response.reviews
          : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? reviews.filter((r) =>
          `${r.product?.name || ""} ${r.user?.name || ""}`
            .toLowerCase()
            .includes(searchValue),
        )
      : reviews;

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

  async updateStatus(id, status) {
    const response = await apiFetch(`/reviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response.review ?? response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/reviews/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   MESSAGES (contact)
   Real backend: GET /api/contact -> bare array of ContactMessage
   docs { _id, user, name, email, phone, subject, message, status,
   createdAt }. status enum is pending/in-progress/resolved (not
   unread/read). No admin create — status update + delete only.
   ========================================================= */

export const messagesStore = {
  async list({ search = "", status = "", page = 1, perPage = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);

    const response = await apiFetch(
      `/contact${params.toString() ? `?${params.toString()}` : ""}`,
    );

    const messages = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : [];

    const searchValue = search.trim().toLowerCase();

    const filtered = searchValue
      ? messages.filter((m) =>
          `${m.name || ""} ${m.subject || ""}`
            .toLowerCase()
            .includes(searchValue),
        )
      : messages;

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

  async updateStatus(id, status) {
    const response = await apiFetch(`/contact/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response.data ?? response;
  },

  async remove(id) {
    return apiFetch(`/contact/${id}`, {
      method: "DELETE",
    });
  },
};
