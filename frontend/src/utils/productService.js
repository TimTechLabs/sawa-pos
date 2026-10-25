// Initial default Kenyan motorcycle spare parts dataset
const DEFAULT_PRODUCTS = [
  { name: 'Spark Plug (Bosch / NGK)', sku: 'SPK-001', category: 'Electrical', costPrice: 220, price: 350, stock: 17 },
  { name: 'Brake Shoes (Front/Rear)', sku: 'BRK-002', category: 'Braking', costPrice: 450, price: 650, stock: 10 },
  { name: 'Drive Chain & Sprocket Kit', sku: 'CHN-003', category: 'Transmission', costPrice: 1600, price: 2400, stock: 3 },
  { name: 'Clutch Plate Set', sku: 'CLT-004', category: 'Transmission', costPrice: 850, price: 1200, stock: 8 },
  { name: 'Engine Oil (Total 4T 1L)', sku: 'OIL-005', category: 'Fluids', costPrice: 550, price: 850, stock: 24 },
  { name: 'Heavy Duty Inner Tube (2.75-17)', sku: 'TUB-006', category: 'Tyres', costPrice: 300, price: 450, stock: 12 }
];

const STORAGE_KEY = 'sawa_pos_products_v1';

export function getProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    const parsed = JSON.parse(stored);
    // Guarantee it always returns an array
    return Array.isArray(parsed) ? parsed : DEFAULT_PRODUCTS;
  } catch (err) {
    console.error("Failed to fetch products:", err);
    return DEFAULT_PRODUCTS;
  }
}

export function saveProducts(products) {
  try {
    const safeData = Array.isArray(products) ? products : DEFAULT_PRODUCTS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    window.dispatchEvent(new Event('sawa_products_updated'));
    window.dispatchEvent(new Event('productsUpdated'));
  } catch (err) {
    console.error("Failed to save products:", err);
  }
}

export const saveProduct = saveProducts;

export function addProduct(product) {
  const products = getProducts();
  const existingIndex = products.findIndex(p => p.sku === product.sku);
  
  if (existingIndex >= 0) {
    products[existingIndex] = { ...products[existingIndex], ...product };
  } else {
    products.unshift(product);
  }
  
  saveProducts(products);
  return products;
}

export function updateProduct(updatedProduct) {
  const products = getProducts();
  const index = products.findIndex(p => p.sku === updatedProduct.sku);
  if (index >= 0) {
    products[index] = { ...products[index], ...updatedProduct };
    saveProducts(products);
  }
  return products;
}

export function deleteProduct(sku) {
  let products = getProducts();
  products = products.filter(p => p.sku !== sku);
  saveProducts(products);
  return products;
}

export function deductStock(cartItems) {
  const products = getProducts();
  cartItems.forEach(cartItem => {
    const product = products.find(p => p.sku === cartItem.sku);
    if (product) {
      product.stock = Math.max(0, product.stock - (cartItem.qty || cartItem.quantity || 1));
    }
  });
  saveProducts(products);
  return products;
}

export function updateProductStock(sku, newStockOrDelta) {
  const products = getProducts();
  const product = products.find(p => p.sku === sku);
  if (product) {
    if (typeof newStockOrDelta === 'number') {
      product.stock = newStockOrDelta;
    }
    saveProducts(products);
  }
  return products;
}