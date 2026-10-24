// Default initial spare parts for Sawa POS (Kitale Branch)
const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Spark Plug (Bosch / NGK)', sku: 'SPK-001', category: 'Electrical', cost_price: 220, price: 350, stock: 18, model_compatibility: 'Boxer BM 100/150, TVS Star HLX' },
  { id: 2, name: 'Brake Shoes (Front/Rear)', sku: 'BRK-002', category: 'Braking', cost_price: 450, price: 650, stock: 12, model_compatibility: 'Boxer BM 100/150' },
  { id: 3, name: 'Drive Chain & Sprocket Kit', sku: 'DRV-003', category: 'Transmission', cost_price: 1800, price: 2400, stock: 3, model_compatibility: 'Bajaj Discover 125, TVS Star' },
  { id: 4, name: 'Clutch Plate Set', sku: 'CLT-004', category: 'Transmission', cost_price: 850, price: 1200, stock: 15, model_compatibility: 'Honda Ace 110, Boxer BM 100' },
  { id: 5, name: 'Engine Oil (Total 4T 1L)', sku: 'OIL-005', category: 'Fluids', cost_price: 550, price: 850, stock: 24, model_compatibility: 'Universal / All Bikes' },
  { id: 6, name: 'Heavy Duty Inner Tube (2.75-17)', sku: 'TUB-006', category: 'Tyres', cost_price: 300, price: 450, stock: 25, model_compatibility: 'Bajaj Discover' },
];

export function getProducts() {
  try {
    const stored = localStorage.getItem('sawa_master_products');
    if (!stored) {
      localStorage.setItem('sawa_master_products', JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(stored);
  } catch (err) {
    return DEFAULT_PRODUCTS;
  }
}

export function saveProduct(newProductData) {
  try {
    const current = getProducts();
    const newProduct = {
      id: Date.now(),
      name: String(newProductData.name || '').trim(),
      sku: String(newProductData.sku || '').trim().toUpperCase(),
      category: String(newProductData.category || 'Electrical'),
      cost_price: Number(newProductData.cost_price) || 0,
      price: Number(newProductData.price) || 0,
      stock: Number(newProductData.stock) || 0,
      model_compatibility: String(newProductData.model_compatibility || 'General')
    };
    const updated = [newProduct, ...current];
    localStorage.setItem('sawa_master_products', JSON.stringify(updated));
    window.dispatchEvent(new Event('sawa_products_updated'));
    return { success: true, product: newProduct, products: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function updateProduct(id, updatedData) {
  try {
    const current = getProducts();
    const updated = current.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name: String(updatedData.name || item.name).trim(),
          sku: String(updatedData.sku || item.sku).trim().toUpperCase(),
          category: String(updatedData.category || item.category),
          cost_price: Number(updatedData.cost_price) || item.cost_price,
          price: Number(updatedData.price) || item.price,
          stock: Number(updatedData.stock) || item.stock,
          model_compatibility: String(updatedData.model_compatibility || item.model_compatibility)
        };
      }
      return item;
    });
    localStorage.setItem('sawa_master_products', JSON.stringify(updated));
    window.dispatchEvent(new Event('sawa_products_updated'));
    return { success: true, products: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function updateProductStock(sku, quantitySold) {
  try {
    const current = getProducts();
    const updated = current.map(item => {
      if (item.sku === sku) {
        const newStock = Math.max(0, item.stock - Number(quantitySold || 0));
        return { ...item, stock: newStock };
      }
      return item;
    });
    localStorage.setItem('sawa_master_products', JSON.stringify(updated));
    window.dispatchEvent(new Event('sawa_products_updated'));
    return { success: true, products: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function deleteProduct(id) {
  try {
    const current = getProducts();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem('sawa_master_products', JSON.stringify(updated));
    window.dispatchEvent(new Event('sawa_products_updated'));
    return { success: true, products: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// NOTE: The fake "initiateStkPush" and "createSale" mock functions that used to
// live here (setTimeout + fabricated success message, no network call) have been
// REMOVED. All M-Pesa communication now goes through the real Django backend
// endpoints in POSView.jsx.