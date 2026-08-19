export function createMockStore(storageKey, seedItems) {
  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore corrupted storage, fall through to seed
    }
    save(seedItems);
    return seedItems;
  }

  function save(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function nextId() {
    return `${storageKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  return {
    async list({
      search = "",
      page = 1,
      perPage = 20,
      searchFields = ["name"],
    } = {}) {
      const all = load();
      const q = search.trim().toLowerCase();
      const filtered = q
        ? all.filter((item) =>
            searchFields.some((field) =>
              String(item[field] ?? "")
                .toLowerCase()
                .includes(q),
            ),
          )
        : all;

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const start = (page - 1) * perPage;
      const items = filtered.slice(start, start + perPage);

      return { items, total, totalPages };
    },

    async all() {
      return load();
    },

    async create(body) {
      const all = load();
      const item = { _id: nextId(), ...body };
      all.unshift(item);
      save(all);
      return item;
    },

    async update(id, body) {
      const all = load();
      const idx = all.findIndex((item) => item._id === id);
      if (idx === -1) throw new Error("Item not found");
      all[idx] = { ...all[idx], ...body };
      save(all);
      return all[idx];
    },

    async remove(id) {
      const all = load();
      save(all.filter((item) => item._id !== id));
      return null;
    },
  };
}
