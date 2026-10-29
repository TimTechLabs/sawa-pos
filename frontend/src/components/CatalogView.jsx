
import React, { useState, useEffect } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Image as ImageIcon,
  Package,
  X,
} from 'lucide-react';
import {
  getProducts,
  updateProduct,
  deleteProduct,
} from '../utils/productService';

export default function CatalogView() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCatalog = async () => {
    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
      setErrorMsg('');
    } catch (err) {
      console.error('Error loading products:', err);
      setErrorMsg('Unable to load spare parts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();

    const handleUpdates = () => loadCatalog();

    window.addEventListener('productsUpdated', handleUpdates);
    window.addEventListener('sawa_products_updated', handleUpdates);
    window.addEventListener('storage', handleUpdates);

    return () => {
      window.removeEventListener('productsUpdated', handleUpdates);
      window.removeEventListener('sawa_products_updated', handleUpdates);
      window.removeEventListener('storage', handleUpdates);
    };
  }, []);

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    return (
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.compatibility?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (sku) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this spare part?'
    );

    if (!confirmed) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await deleteProduct(sku);

      if (Array.isArray(updated)) {
        setProducts(updated);
      } else {
        setProducts((current) =>
          current.filter((product) => product.sku !== sku)
        );
      }

      window.dispatchEvent(new Event('productsUpdated'));
      window.dispatchEvent(new Event('sawa_products_updated'));

      setSuccessMsg('Spare part deleted successfully.');
    } catch (err) {
      console.error('Failed to delete product:', err);
      setErrorMsg('Unable to delete this spare part. Please try again.');
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setEditingProduct((current) =>
          current
            ? { ...current, image: reader.result }
            : current
        );
      }
    };

    reader.onerror = () => {
      setErrorMsg('Unable to read the selected image.');
    };

    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingProduct || saving) return;

    const name = editingProduct.name?.trim();
    const price = Number(editingProduct.price);
    const stock = Number(editingProduct.stock);

    if (!name) {
      setErrorMsg('Please enter the spare part name.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setErrorMsg('Selling price must be a valid, non-negative number.');
      return;
    }

    if (
      editingProduct.stock === '' ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setErrorMsg('Stock must be a whole number of zero or more.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await updateProduct({
        ...editingProduct,
        name,
        price,
        stock,
      });

      setEditingProduct(null);

      await loadCatalog();

      window.dispatchEvent(new Event('productsUpdated'));
      window.dispatchEvent(new Event('sawa_products_updated'));

      setSuccessMsg('Spare part updated successfully.');
    } catch (err) {
      console.error('Failed to update product:', err);
      setErrorMsg('Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateEditField = (field, value) => {
    setEditingProduct((current) =>
      current ? { ...current, [field]: value } : current
    );
  };

  const closeEditModal = () => {
    if (saving) return;

    setEditingProduct(null);
    setErrorMsg('');
  };

  const formatKES = (value) =>
    `KES ${Number(value || 0).toLocaleString('en-KE')}`;

  const getStockStatus = (stock) => {
    const quantity = Number(stock) || 0;

    if (quantity <= 0) {
      return {
        label: 'Out of stock',
        className: 'border-red-200 bg-red-50 text-red-700',
      };
    }

    if (quantity <= 5) {
      return {
        label: 'Low stock',
        className: 'border-amber-200 bg-amber-50 text-amber-800',
      };
    }

    return {
      label: 'In stock',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  };

  const ProductImage = ({ product, large = false }) => (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-[#DCE3EA] bg-slate-100 ${
        large ? 'h-16 w-16' : 'h-11 w-11'
      }`}
    >
      {product.image ? (
        <img
          src={product.image}
          alt={product.name || 'Spare part'}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon
          className={large ? 'h-6 w-6 text-slate-400' : 'h-5 w-5 text-slate-400'}
          aria-hidden="true"
        />
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 p-3 pb-6 sm:space-y-5 sm:p-5 lg:p-6">
      {/* Header and search */}
      <section className="flex min-w-0 flex-col gap-4 border-b border-[#DCE3EA] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-[#17212B] sm:text-xl">
            Spare Parts Catalog
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#64748B] sm:text-sm">
            View, search, edit, and manage your motorcycle spare parts.
          </p>
        </div>

        <div className="relative w-full min-w-0 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search spare parts"
            placeholder="Search name, SKU, category or model..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-h-11 w-full min-w-0 border border-[#DCE3EA] bg-white py-2.5 pl-9 pr-3 text-sm text-[#17212B] focus:border-blue-600 focus:outline-none"
          />
        </div>
      </section>

      {/* Notifications */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
        >
          <span className="min-w-0 break-words">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            aria-label="Dismiss error"
            className="shrink-0 p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"
        >
          <span className="min-w-0 break-words">{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            aria-label="Dismiss notification"
            className="shrink-0 p-1 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Catalog count */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Package className="h-4 w-4 shrink-0" />
          <span>
            {filteredProducts.length} part
            {filteredProducts.length === 1 ? '' : 's'} found
          </span>
        </div>

        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="min-h-9 border border-[#DCE3EA] px-3 py-1.5 text-xs font-semibold text-[#17212B] hover:bg-slate-50"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Mobile catalogue cards */}
      <section
        aria-label="Spare parts catalogue"
        className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden"
      >
        {loading ? (
          <div className="border border-[#DCE3EA] bg-white p-6 text-center text-sm text-[#64748B] sm:col-span-2">
            Loading spare parts...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="border border-[#DCE3EA] bg-white p-6 text-center sm:col-span-2">
            <Package className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            <p className="text-sm font-semibold text-[#17212B]">
              No spare parts found
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Try another search term or clear your search.
            </p>
          </div>
        ) : (
          filteredProducts.map((product, index) => {
            const status = getStockStatus(product.stock);

            return (
              <article
                key={product.sku || product.id || index}
                className="min-w-0 border border-[#DCE3EA] bg-white p-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <ProductImage product={product} large />

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-bold text-[#17212B]">
                      {product.name || 'Unnamed spare part'}
                    </h3>
                    <p className="mt-1 break-all font-mono text-xs text-blue-700">
                      SKU: {product.sku || 'N/A'}
                    </p>
                    {product.category && (
                      <p className="mt-1 break-words text-xs text-[#64748B]">
                        {product.category}
                      </p>
                    )}
                    {product.compatibility && (
                      <p className="mt-1 break-words text-xs text-[#64748B]">
                        Fits: {product.compatibility}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[#DCE3EA] pt-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-[#17212B]">
                      {formatKES(product.price)}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {Number(product.stock) || 0} units
                    </p>
                  </div>

                  <span
                    className={`border px-2 py-1 text-[10px] font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setSuccessMsg('');
                      setEditingProduct({ ...product });
                    }}
                    className="flex min-h-10 min-w-0 items-center justify-center gap-2 border border-[#DCE3EA] px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4 shrink-0" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(product.sku)}
                    className="flex min-h-10 min-w-0 items-center justify-center gap-2 border border-red-200 px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Tablet and desktop table */}
      <section className="hidden min-w-0 border border-[#DCE3EA] bg-white lg:block">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-[#DCE3EA] bg-slate-50 text-[#64748B]">
              <tr>
                <th scope="col" className="p-3 font-semibold">Image</th>
                <th scope="col" className="p-3 font-semibold">Part Name</th>
                <th scope="col" className="p-3 font-semibold">SKU</th>
                <th scope="col" className="p-3 font-semibold">Price (KES)</th>
                <th scope="col" className="p-3 font-semibold">Stock</th>
                <th scope="col" className="p-3 font-semibold">Status</th>
                <th scope="col" className="p-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE3EA]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#64748B]">
                    Loading spare parts...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#64748B]">
                    No spare parts found. Try another search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => {
                  const status = getStockStatus(product.stock);

                  return (
                    <tr
                      key={product.sku || product.id || index}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="p-3">
                        <ProductImage product={product} />
                      </td>

                      <td className="max-w-[240px] p-3">
                        <p className="break-words font-semibold text-[#17212B]">
                          {product.name || 'Unnamed spare part'}
                        </p>
                        {product.compatibility && (
                          <p className="mt-1 break-words text-[10px] text-[#64748B]">
                            Fits: {product.compatibility}
                          </p>
                        )}
                      </td>

                      <td className="p-3 font-mono text-blue-700">
                        {product.sku || 'N/A'}
                      </td>

                      <td className="whitespace-nowrap p-3 font-bold text-[#17212B]">
                        {formatKES(product.price)}
                      </td>

                      <td className="whitespace-nowrap p-3 text-[#17212B]">
                        {Number(product.stock) || 0} units
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-block border px-2 py-1 text-[10px] font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setErrorMsg('');
                              setSuccessMsg('');
                              setEditingProduct({ ...product });
                            }}
                            aria-label={`Edit ${product.name}`}
                            title="Edit spare part"
                            className="flex h-9 w-9 items-center justify-center border border-[#DCE3EA] text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(product.sku)}
                            aria-label={`Delete ${product.name}`}
                            title="Delete spare part"
                            className="flex h-9 w-9 items-center justify-center border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit product modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <form
            onSubmit={handleSaveEdit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg space-y-4 overflow-y-auto border border-[#DCE3EA] bg-white p-4 sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE3EA] pb-3">
              <div className="min-w-0">
                <h3
                  id="edit-product-title"
                  className="text-base font-bold text-[#17212B]"
                >
                  Edit Spare Part
                </h3>
                <p className="mt-1 text-xs text-[#64748B]">
                  Update product details and current stock.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                aria-label="Close edit form"
                className="flex h-10 w-10 shrink-0 items-center justify-center text-[#64748B] hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-product-name"
                className="block text-xs font-semibold text-[#17212B]"
              >
                Part Name
              </label>
              <input
                id="edit-product-name"
                type="text"
                value={editingProduct.name || ''}
                onChange={(event) =>
                  updateEditField('name', event.target.value)
                }
                className="min-h-11 w-full min-w-0 border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="edit-product-price"
                  className="block text-xs font-semibold text-[#17212B]"
                >
                  Selling Price (KES)
                </label>
                <input
                  id="edit-product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingProduct.price ?? ''}
                  onChange={(event) =>
                    updateEditField(
                      'price',
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value)
                    )
                  }
                  className="min-h-11 w-full min-w-0 border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="edit-product-stock"
                  className="block text-xs font-semibold text-[#17212B]"
                >
                  Current Stock
                </label>
                <input
                  id="edit-product-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={editingProduct.stock ?? ''}
                  onChange={(event) =>
                    updateEditField(
                      'stock',
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value)
                    )
                  }
                  className="min-h-11 w-full min-w-0 border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#17212B]">
                Product Image
              </label>

              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                <ProductImage product={editingProduct} large />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="min-h-11 w-full min-w-0 border border-[#DCE3EA] bg-slate-50 p-2 text-xs text-[#64748B] file:mr-2 file:border-0 file:bg-blue-50 file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <p className="text-[10px] leading-4 text-[#64748B]">
                Choose an image from your device to replace the current image.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#DCE3EA] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="min-h-11 w-full border border-[#DCE3EA] px-4 py-2 text-xs font-semibold text-[#17212B] hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="min-h-11 w-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
