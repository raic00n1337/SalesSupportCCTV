import { useEffect, useState } from 'react';
import RouteGuard from '../../components/RouteGuard';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows } from '../../lib/supabasePagination';

type TierType = 'eco' | 'premium' | 'high-risk';

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  manufacturer_id: string;
  manufacturers?: {
    name: string;
    slug: string;
  };
}

interface TierDefault {
  id: string;
  tier: TierType;
  manufacturer_slug: string;
  category: string;
  product_sku: string;
  priority: number;
  created_at: string;
}

interface TierDefaultWithProduct extends TierDefault {
  product?: {
    name: string;
    sku: string;
    manufacturers?: {
      name: string;
    };
  };
}

export default function AdminTierDefaults() {
  const [tierDefaults, setTierDefaults] = useState<TierDefaultWithProduct[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterTier, setFilterTier] = useState<TierType | ''>('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalForm, setModalForm] = useState({
    id: '',
    tier: '' as TierType | '',
    manufacturerSlug: '',
    category: '',
    productSku: '',
    priority: '100',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load manufacturers
      const { data: mfgData, error: mfgError } = await supabase
        .from('manufacturers')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (mfgError) throw mfgError;
      setManufacturers(mfgData || []);

      // Load products (paged - see fetchAllRows, catalog has 2000+ products)
      const prodData = await fetchAllRows<Product>((from, to) =>
        supabase
          .from('products')
          .select(`
            id,
            sku,
            name,
            category,
            manufacturer_id,
            manufacturers (
              name,
              slug
            )
          `)
          .eq('is_active', true)
          .order('name', { ascending: true })
          .range(from, to)
      );
      setProducts(prodData);

      // Load tier defaults
      const { data: tierData, error: tierError } = await supabase
        .from('tier_defaults')
        .select('*')
        .order('tier', { ascending: true })
        .order('manufacturer_slug', { ascending: true })
        .order('category', { ascending: true })
        .order('priority', { ascending: true });

      if (tierError) throw tierError;

      // Enrich with product data
      const enrichedData = (tierData || []).map((td: TierDefault) => {
        const product = (prodData as any)?.find((p: any) => p.sku === td.product_sku);
        return {
          ...td,
          product: product ? {
            name: product.name,
            sku: product.sku,
            manufacturers: product.manufacturers,
          } : undefined,
        };
      });

      setTierDefaults(enrichedData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setModalForm({
      id: '',
      tier: '',
      manufacturerSlug: '',
      category: '',
      productSku: '',
      priority: '100',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (tierDefault: TierDefaultWithProduct) => {
    setModalMode('edit');
    setModalForm({
      id: tierDefault.id,
      tier: tierDefault.tier,
      manufacturerSlug: tierDefault.manufacturer_slug,
      category: tierDefault.category,
      productSku: tierDefault.product_sku,
      priority: String(tierDefault.priority),
    });
    setModalError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      // Validate
      if (!modalForm.tier || !modalForm.manufacturerSlug || !modalForm.category || !modalForm.productSku || !modalForm.priority) {
        throw new Error('Alle Felder müssen ausgefüllt sein');
      }

      const priority = parseInt(modalForm.priority, 10);
      if (isNaN(priority) || priority < 0) {
        throw new Error('Priority muss eine positive Zahl sein');
      }

      // Verify product exists and matches manufacturer + category
      const product = products.find(p => p.sku === modalForm.productSku);
      if (!product) {
        throw new Error('Produkt nicht gefunden');
      }

      if (product.manufacturers?.slug !== modalForm.manufacturerSlug) {
        throw new Error('Produkt gehört nicht zum ausgewählten Hersteller');
      }

      if (product.category !== modalForm.category) {
        throw new Error('Produkt gehört nicht zur ausgewählten Kategorie');
      }

      const tierDefaultData = {
        tier: modalForm.tier,
        manufacturer_slug: modalForm.manufacturerSlug,
        category: modalForm.category,
        product_sku: modalForm.productSku,
        priority,
      };

      if (modalMode === 'create') {
        const { error: insertError } = await (supabase
          .from('tier_defaults') as any)
          .insert(tierDefaultData);

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await (supabase
          .from('tier_defaults') as any)
          .update(tierDefaultData)
          .eq('id', modalForm.id);

        if (updateError) throw updateError;
      }

      // Reload and close
      await loadData();
      setShowModal(false);
      setModalForm({
        id: '',
        tier: '',
        manufacturerSlug: '',
        category: '',
        productSku: '',
        priority: '100',
      });
    } catch (err: any) {
      console.error('Error saving tier default:', err);
      setModalError(err.message || 'Fehler beim Speichern');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);

    try {
      const { error: deleteError } = await (supabase
        .from('tier_defaults') as any)
        .delete()
        .eq('id', deleteId);

      if (deleteError) throw deleteError;

      await loadData();
      setShowDeleteConfirm(false);
      setDeleteId('');
      setDeleteName('');
    } catch (err: any) {
      console.error('Error deleting tier default:', err);
      alert(`Fehler: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter tier defaults
  const filteredTierDefaults = tierDefaults.filter(td => {
    if (filterTier && td.tier !== filterTier) return false;
    if (filterManufacturer && td.manufacturer_slug !== filterManufacturer) return false;
    if (filterCategory && td.category !== filterCategory) return false;
    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  // Get filtered products for modal
  const filteredProducts = products.filter(p => {
    if (modalForm.manufacturerSlug && p.manufacturers?.slug !== modalForm.manufacturerSlug) return false;
    if (modalForm.category && p.category !== modalForm.category) return false;
    return true;
  });

  const getTierBadgeColor = (tier: TierType) => {
    switch (tier) {
      case 'eco':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'premium':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'high-risk':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    }
  };

  const getTierLabel = (tier: TierType) => {
    switch (tier) {
      case 'eco':
        return '🟢 Eco';
      case 'premium':
        return '🔵 Premium';
      case 'high-risk':
        return '🔴 High-Risk';
    }
  };

  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Tier-Defaults
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Legen Sie Standard-Produkte für jede Tier-Stufe fest
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                ➕ Neuer Tier-Default
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Lädt...' : '🔄 Aktualisieren'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tier filtern
              </label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value as TierType | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle Tiers</option>
                <option value="eco">🟢 Eco</option>
                <option value="premium">🔵 Premium</option>
                <option value="high-risk">🔴 High-Risk</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hersteller filtern
              </label>
              <select
                value={filterManufacturer}
                onChange={(e) => setFilterManufacturer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle Hersteller</option>
                {manufacturers.map(m => (
                  <option key={m.id} value={m.slug}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategorie filtern
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle Kategorien</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tier Defaults Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Lade Tier-Defaults...</p>
              </div>
            ) : filteredTierDefaults.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {tierDefaults.length === 0 ? 'Noch keine Tier-Defaults angelegt.' : 'Keine Tier-Defaults gefunden.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Hersteller
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Kategorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Produkt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredTierDefaults.map((tierDefault) => (
                      <tr key={tierDefault.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierBadgeColor(tierDefault.tier)}`}>
                            {getTierLabel(tierDefault.tier)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {tierDefault.product?.manufacturers?.name || tierDefault.manufacturer_slug}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200">
                            {tierDefault.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {tierDefault.product ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {tierDefault.product.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <code>{tierDefault.product.sku}</code>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              Produkt nicht gefunden: {tierDefault.product_sku}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {tierDefault.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(tierDefault)}
                              className="px-3 py-1 rounded-lg font-semibold transition-colors bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              ✏️ Bearbeiten
                            </button>
                            <button
                              onClick={() => {
                                setDeleteId(tierDefault.id);
                                setDeleteName(`${getTierLabel(tierDefault.tier)} - ${tierDefault.product?.name || tierDefault.product_sku}`);
                                setShowDeleteConfirm(true);
                              }}
                              className="px-3 py-1 rounded-lg font-semibold transition-colors bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                            >
                              🗑️ Löschen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats */}
          {!loading && tierDefaults.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {filteredTierDefaults.length} von {tierDefaults.length} Tier-Defaults
            </div>
          )}

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {modalMode === 'create' ? 'Neuer Tier-Default' : 'Tier-Default bearbeiten'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                {modalError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{modalError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tier *
                      </label>
                      <select
                        required
                        value={modalForm.tier}
                        onChange={(e) => setModalForm({ ...modalForm, tier: e.target.value as TierType })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">-- Auswählen --</option>
                        <option value="eco">🟢 Eco</option>
                        <option value="premium">🔵 Premium</option>
                        <option value="high-risk">🔴 High-Risk</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={modalForm.priority}
                        onChange={(e) => setModalForm({ ...modalForm, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        placeholder="100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Niedrigere Werte = höhere Priorität
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hersteller *
                    </label>
                    <select
                      required
                      value={modalForm.manufacturerSlug}
                      onChange={(e) => setModalForm({ ...modalForm, manufacturerSlug: e.target.value, productSku: '' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Auswählen --</option>
                      {manufacturers.map(m => (
                        <option key={m.id} value={m.slug}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategorie *
                    </label>
                    <select
                      required
                      value={modalForm.category}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value, productSku: '' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Auswählen --</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Produkt *
                    </label>
                    <select
                      required
                      value={modalForm.productSku}
                      onChange={(e) => setModalForm({ ...modalForm, productSku: e.target.value })}
                      disabled={!modalForm.manufacturerSlug || !modalForm.category}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      <option value="">-- Auswählen --</option>
                      {filteredProducts.map(p => (
                        <option key={p.id} value={p.sku}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                    {!modalForm.manufacturerSlug || !modalForm.category ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Bitte zuerst Hersteller und Kategorie auswählen
                      </p>
                    ) : filteredProducts.length === 0 ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Keine Produkte für diese Kombination verfügbar
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {modalLoading ? 'Speichert...' : modalMode === 'create' ? 'Erstellen' : 'Speichern'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Tier-Default löschen?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Möchten Sie <strong className="text-gray-900 dark:text-white">{deleteName}</strong> wirklich löschen?
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteId('');
                      setDeleteName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? 'Löscht...' : 'Löschen'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
