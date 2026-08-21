function loadItems(storageKey, seed) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  return seed;
}

function saveItems(storageKey, items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function genId() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMockStore(storageKey, seed) {
  return {
    async list({ search = "", page = 1, perPage = 20, searchFields = [] } = {}) {
      const items = loadItems(storageKey, seed);
      const q = search.trim().toLowerCase();
      const filtered = q
        ? items.filter((item) =>
            searchFields.some((field) =>
              String(item[field] ?? "").toLowerCase().includes(q),
            ),
          )
        : items;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const start = (page - 1) * perPage;
      return {
        items: filtered.slice(start, start + perPage),
        total,
        totalPages,
      };
    },

    async create(body) {
      const items = loadItems(storageKey, seed);
      const item = { _id: genId(), ...body };
      const next = [...items, item];
      saveItems(storageKey, next);
      return item;
    },

    async update(id, body) {
      const items = loadItems(storageKey, seed);
      let updated = null;
      const next = items.map((item) => {
        if (item._id !== id) return item;
        updated = { ...item, ...body };
        return updated;
      });
      saveItems(storageKey, next);
      return updated;
    },

    async remove(id) {
      const items = loadItems(storageKey, seed);
      saveItems(
        storageKey,
        items.filter((item) => item._id !== id),
      );
      return null;
    },
  };
}
