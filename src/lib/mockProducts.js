const STORAGE_KEY = "sipnow_admin_products";

const SEED_PRODUCTS = [
  {
    _id: "seed-1",
    name: "Château Margaux 2015",
    category: "Red Wine · 750mL",
    categoryGroup: "wine",
    price: 89.99,
    image: "",
    inStock: true,
    stockQuantity: 24,
    abv: "13.5%",
    volume: "750mL",
    manufacturer: "Château Margaux",
    origin: "Bordeaux, France",
    description:
      "A rich, full-bodied red wine with notes of blackcurrant and cedar.",
    verificationEmail: "supplier@chateaumargaux.com",
    verified: true,
  },
  {
    _id: "seed-2",
    name: "Grey Goose Vodka",
    category: "Vodka · 1L",
    categoryGroup: "spirits",
    price: 34.99,
    image: "",
    inStock: true,
    stockQuantity: 50,
    abv: "40%",
    volume: "1L",
    manufacturer: "Grey Goose",
    origin: "France",
    description: "Premium French vodka distilled from single-origin wheat.",
    verificationEmail: "trade@greygoose.com",
    verified: true,
  },
  {
    _id: "seed-3",
    name: "Guinness Draught",
    category: "Stout · 440mL Can",
    categoryGroup: "beer",
    price: 2.49,
    image: "",
    inStock: false,
    stockQuantity: 0,
    abv: "4.2%",
    volume: "440mL",
    manufacturer: "Guinness",
    origin: "Ireland",
    description: "The iconic Irish dry stout with a smooth, creamy head.",
    verificationEmail: "",
    verified: false,
  },
  {
    _id: "seed-4",
    name: "Buy 2 Get 1 Free — Craft Beer",
    category: "Beer Bundle · Offer",
    categoryGroup: "offers",
    price: 14.99,
    image: "",
    inStock: true,
    stockQuantity: 40,
    abv: "",
    volume: "",
    manufacturer: "Mixed",
    origin: "",
    description: "Limited-time bundle offer on selected craft beers.",
    verificationEmail: "",
    verified: false,
  },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupted storage, fall through to seed
  }
  save(SEED_PRODUCTS);
  return SEED_PRODUCTS;
}

function save(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function nextId() {
  return `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function fetchAllProducts() {
  return load();
}

export async function fetchProducts({ search = "", page = 1, perPage = 20 }) {
  const all = load();
  const q = search.trim().toLowerCase();
  const filtered = q
    ? all.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    : all;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const items = filtered.slice(start, start + perPage);

  return { items, total, totalPages };
}

export async function createProduct(body) {
  const all = load();
  const product = { _id: nextId(), ...body };
  all.unshift(product);
  save(all);
  return product;
}

export async function updateProduct(id, body) {
  const all = load();
  const idx = all.findIndex((p) => p._id === id);
  if (idx === -1) throw new Error("Product not found");
  all[idx] = { ...all[idx], ...body };
  save(all);
  return all[idx];
}

export async function deleteProduct(id) {
  const all = load();
  save(all.filter((p) => p._id !== id));
  return null;
}
