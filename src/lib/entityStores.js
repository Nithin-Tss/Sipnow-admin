import { apiFetch } from "./apiClient";

function paginate(
  items,
  { search = "", page = 1, perPage = 20, searchFields = ["name"] } = {},
) {
  const q = search.trim().toLowerCase();

  const filtered = q
    ? items.filter((item) =>
        searchFields.some((field) =>
          String(item[field] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      )
    : items;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (safePage - 1) * perPage;

  return {
    items: filtered.slice(start, start + perPage),
    total,
    totalPages,
  };
}

function unwrap(response, key) {
  if (Array.isArray(response)) return response;
  return response?.[key] ?? [];
}

/* =========================================================
   USERS
   Admin can view every registered user, invite new ones,
   change their role, and remove accounts.
   ========================================================= */

export const usersStore = {
  async all() {
    const response = await apiFetch("/users");
    return unwrap(response, "users");
  },

  async list({
    search = "",
    page = 1,
    perPage = 20,
    searchFields = ["name", "email"],
  } = {}) {
    const items = await this.all();
    return paginate(items, { search, page, perPage, searchFields });
  },

  async create(body) {
    return apiFetch("/users", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password,
        phone: body.phone,
        role: body.role,
      }),
    });
  },

  async update(id, body) {
    return apiFetch(`/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role: body.role }),
    });
  },

  async remove(id) {
    return apiFetch(`/users/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   COUPONS
   ========================================================= */

export const couponsStore = {
  async all() {
    const response = await apiFetch("/coupons");
    return unwrap(response, "coupons");
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const coupons = await this.all();
    return paginate(coupons, { search, page, perPage, searchFields: ["code"] });
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

export const giftCardsStore = {
  async all() {
    const response = await apiFetch("/giftcards");
    return unwrap(response, "giftCards");
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const giftCards = await this.all();
    return paginate(giftCards, {
      search,
      page,
      perPage,
      searchFields: ["code", "recipientName", "recipientEmail"],
    });
  },

  async create(body) {
    return apiFetch("/giftcards", {
      method: "POST",
      body: JSON.stringify({
        amount: body.amount,
        recipientName: body.recipientName,
        recipientEmail: body.recipientEmail,
        message: body.message,
        expiryDate: body.expiryDate || null,
      }),
    });
  },

  async update(id, body) {
    return apiFetch(`/giftcards/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        recipientName: body.recipientName,
        recipientEmail: body.recipientEmail,
        message: body.message,
        expiryDate: body.expiryDate || null,
        isActive: body.isActive,
      }),
    });
  },

  async remove(id) {
    return apiFetch(`/giftcards/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   STORES
   ========================================================= */

function flattenStore(store) {
  return {
    ...store,
    addressLine1: store.address?.addressLine1 ?? "",
    addressLine2: store.address?.addressLine2 ?? "",
    city: store.address?.city ?? "",
    state: store.address?.state ?? "",
    postalCode: store.address?.postalCode ?? "",
    country: store.address?.country ?? "India",
  };
}

function storeBody(body) {
  return {
    name: body.name,
    address: {
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country || "India",
    },
    phone: body.phone,
    email: body.email,
    deliveryRadiusKm: body.deliveryRadiusKm,
    isActive: body.isActive,
  };
}

export const storesStore = {
  async all() {
    const response = await apiFetch("/stores?all=true");
    return unwrap(response, "stores").map(flattenStore);
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const stores = await this.all();
    return paginate(stores, {
      search,
      page,
      perPage,
      searchFields: ["name", "city"],
    });
  },

  async create(body) {
    return apiFetch("/stores", {
      method: "POST",
      body: JSON.stringify(storeBody(body)),
    });
  },

  async update(id, body) {
    return apiFetch(`/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(storeBody(body)),
    });
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

export const suppliersStore = {
  async all() {
    const response = await apiFetch("/suppliers");
    return unwrap(response, "suppliers");
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const suppliers = await this.all();
    return paginate(suppliers, {
      search,
      page,
      perPage,
      searchFields: ["name", "region"],
    });
  },

  async create(body) {
    return apiFetch("/suppliers", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id, body) {
    return apiFetch(`/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async remove(id) {
    return apiFetch(`/suppliers/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   CATEGORIES
   ========================================================= */

export const categoriesStore = {
  async all() {
    const response = await apiFetch("/categories?all=true");
    return unwrap(response, "categories");
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const categories = await this.all();
    return paginate(categories, {
      search,
      page,
      perPage,
      searchFields: ["name"],
    });
  },

  async create(body) {
    return apiFetch("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        description: body.description,
        image: body.image,
        isActive: body.isActive,
      }),
    });
  },

  async update(id, body) {
    return apiFetch(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: body.name,
        description: body.description,
        image: body.image,
        isActive: body.isActive,
      }),
    });
  },

  async remove(id) {
    return apiFetch(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   PROMOTIONS
   ========================================================= */

export const promotionsStore = {
  async all() {
    const response = await apiFetch("/promotions");
    return unwrap(response, "promotions");
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const promotions = await this.all();
    return paginate(promotions, {
      search,
      page,
      perPage,
      searchFields: ["title"],
    });
  },

  async create(body) {
    return apiFetch("/promotions", {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        isActive: body.isActive,
      }),
    });
  },

  async update(id, body) {
    return apiFetch(`/promotions/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        isActive: body.isActive,
      }),
    });
  },

  async remove(id) {
    return apiFetch(`/promotions/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   OFFERS
   ========================================================= */

export const offersStore = {
  async all() {
    const response = await apiFetch("/offers");
    return unwrap(response, "offers");
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const offers = await this.all();
    return paginate(offers, {
      search,
      page,
      perPage,
      searchFields: ["title", "code"],
    });
  },

  async create(body) {
    return apiFetch("/offers", {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        code: body.code,
        discountType: body.discountType,
        discountValue: body.discountValue,
        minimumPurchase: body.minimumPurchase,
        maximumDiscount: body.maximumDiscount,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        isActive: body.isActive,
      }),
    });
  },

  async update(id, body) {
    return apiFetch(`/offers/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        code: body.code,
        discountType: body.discountType,
        discountValue: body.discountValue,
        minimumPurchase: body.minimumPurchase,
        maximumDiscount: body.maximumDiscount,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        isActive: body.isActive,
      }),
    });
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

function mapOrder(order) {
  return {
    ...order,
    customerName: order.user?.name || order.user?.email || "Customer",
    total: order.totalAmount,
    placedAt: order.createdAt,
    fulfilment: order.fulfilment || "delivery",
  };
}

export const ordersStore = {
  async all() {
    const response = await apiFetch("/orders");
    return (response.orders || []).map(mapOrder);
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const orders = await this.all();

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
      body: JSON.stringify({ status: body.status }),
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
   Admin can see reviews in every moderation status and
   approve/hide them. Reviews are authored by customers,
   so admins cannot fabricate new ones from this panel.
   ========================================================= */

const REVIEW_STATUSES = ["pending", "approved", "hidden"];

export const reviewsStore = {
  async all() {
    const results = await Promise.all(
      REVIEW_STATUSES.map((status) =>
        apiFetch(`/reviews?status=${status}`).then((response) =>
          unwrap(response, "reviews"),
        ),
      ),
    );

    return results
      .flat()
      .map((review) => ({
        ...review,
        productName: review.product?.name || "Unknown product",
        customerName: review.user?.name || "Anonymous",
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const reviews = await this.all();
    return paginate(reviews, {
      search,
      page,
      perPage,
      searchFields: ["productName", "customerName"],
    });
  },

  async update(id, body) {
    return apiFetch(`/reviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: body.status }),
    });
  },

  async remove(id) {
    return apiFetch(`/reviews/${id}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================
   MESSAGES
   Contact messages are submitted by customers via the
   storefront; admins can only triage (status + delete).
   ========================================================= */

export const messagesStore = {
  async all() {
    const response = await apiFetch("/contact");
    return unwrap(response, "messages").map((message) => ({
      ...message,
      fromName: message.name,
      fromEmail: message.email,
      body: message.message,
    }));
  },

  async list({ search = "", page = 1, perPage = 20 } = {}) {
    const messages = await this.all();
    return paginate(messages, {
      search,
      page,
      perPage,
      searchFields: ["fromName", "subject"],
    });
  },

  async update(id, body) {
    return apiFetch(`/contact/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: body.status }),
    });
  },

  async remove(id) {
    return apiFetch(`/contact/${id}`, {
      method: "DELETE",
    });
  },
};
