import { useEffect, useState, useRef } from 'react';
import RouteGuard from '../../components/RouteGuard';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  manufacturer_id: string;
  category: string;
  sku: string;
  eso_number: string;
  name: string;
  description: string | null;
  uvp_cents: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
  manufacturers?: {
    name: string;
    slug: string;
  };
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalForm, setModalForm] = useState({
    id: '',
    manufacturerId: '',
    category: '',
    sku: '',
    esoNumber: '',
    name: '',
    description: '',
    uvpCents: '',
    tags: '',
    isActive: true,
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // CSV Import
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Load products with manufacturer data
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`
          *,
          manufacturers (
            name,
            slug
          )
        `)
        .order('name', { ascending: true });

      if (prodError) throw prodError;
      setProducts(prodData || []);
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
      manufacturerId: '',
      category: '',
      sku: '',
      esoNumber: '',
      name: '',
      description: '',
      uvpCents: '',
      tags: '',
      isActive: true,
    });
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setModalMode('edit');
    setModalForm({
      id: product.id,
      manufacturerId: product.manufacturer_id,
      category: product.category,
      sku: product.sku,
      esoNumber: product.eso_number,
      name: product.name,
      description: product.description || '',
      uvpCents: (product.uvp_cents / 100).toFixed(2), // Convert cents to euros
      tags: product.tags.join(', '),
      isActive: product.is_active,
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
      if (!modalForm.manufacturerId || !modalForm.category || !modalForm.sku || !modalForm.esoNumber || !modalForm.name || !modalForm.uvpCents) {
        throw new Error('Alle Pflichtfelder müssen ausgefüllt sein');
      }

      // Convert euros to cents (multiply by 100 and round)
      const uvpEuro = parseFloat(modalForm.uvpCents.replace(',', '.'));
      if (isNaN(uvpEuro) || uvpEuro < 0) {
        throw new Error('UVP muss eine positive Zahl sein');
      }
      const uvpCents = Math.round(uvpEuro * 100);

      // Parse tags
      const tags = modalForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const productData = {
        manufacturer_id: modalForm.manufacturerId,
        category: modalForm.category,
        sku: modalForm.sku,
        eso_number: modalForm.esoNumber,
        name: modalForm.name,
        description: modalForm.description || null,
        uvp_cents: uvpCents,
        tags,
        is_active: modalForm.isActive,
      };

      if (modalMode === 'create') {
        const { error: insertError } = await (supabase
          .from('products') as any)
          .insert(productData);

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await (supabase
          .from('products') as any)
          .update(productData)
          .eq('id', modalForm.id);

        if (updateError) throw updateError;
      }

      // Reload and close
      await loadData();
      setShowModal(false);
      setModalForm({
        id: '',
        manufacturerId: '',
        category: '',
        sku: '',
        esoNumber: '',
        name: '',
        description: '',
        uvpCents: '',
        tags: '',
        isActive: true,
      });
    } catch (err: any) {
      console.error('Error saving product:', err);
      setModalError(err.message || 'Fehler beim Speichern');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);

    try {
      const { error: deleteError } = await (supabase
        .from('products') as any)
        .delete()
        .eq('id', deleteId);

      if (deleteError) throw deleteError;

      await loadData();
      setShowDeleteConfirm(false);
      setDeleteId('');
      setDeleteName('');
    } catch (err: any) {
      console.error('Error deleting product:', err);
      alert(`Fehler: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from('products') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Error toggling status:', err);
      alert(`Fehler: ${err.message}`);
    }
  };

  const handleDownloadSampleCsv = () => {
    // Generate sample CSV with real manufacturer slugs
    const manufacturerSlugs = manufacturers.map(m => m.slug).join(', ') || 'axis, hikvision, dahua';
    const firstSlug = manufacturers.length > 0 ? manufacturers[0].slug : 'axis';
    
    const sampleCsv = `manufacturer_slug;category;sku;eso_number;name;description;uvp_cents;tags;is_active
${firstSlug};camera;SAMPLE-CAM-001;ESO999001;Beispiel Dome Kamera 4K;8MP Outdoor Dome mit IR;45900;dome,outdoor,4k;true
${firstSlug};nvr;SAMPLE-NVR-001;ESO999002;Beispiel NVR 8 Kanal;8 Channel Network Video Recorder;78900;nvr,8ch,poe;true
${firstSlug};switch;SAMPLE-SW-001;ESO999003;Beispiel PoE Switch;8 Port PoE+ Switch 120W;34900;switch,8port,poe+;true`;

    // Create blob and download
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'produkte-muster.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      setCsvError('Bitte wählen Sie eine CSV-Datei aus');
      return;
    }

    setCsvLoading(true);
    setCsvError('');
    setCsvSuccess('');

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV-Datei ist leer oder hat keine Datenzeilen');
      }

      // Parse header
      const header = lines[0].split(';').map(h => h.trim());
      const requiredFields = ['manufacturer_slug', 'category', 'sku', 'eso_number', 'name', 'uvp_cents'];
      const missingFields = requiredFields.filter(f => !header.includes(f));
      if (missingFields.length > 0) {
        throw new Error(`Fehlende Spalten: ${missingFields.join(', ')}`);
      }

      // Parse data rows
      const productsToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim());
        if (values.length !== header.length) continue;

        const row: any = {};
        header.forEach((key, idx) => {
          row[key] = values[idx];
        });

        // Find manufacturer by slug
        const mfg = manufacturers.find(m => m.slug === row.manufacturer_slug);
        if (!mfg) {
          console.warn(`Zeile ${i + 1}: Hersteller "${row.manufacturer_slug}" nicht gefunden, überspringe`);
          continue;
        }

        // Parse tags
        const tags = row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [];

        productsToImport.push({
          manufacturer_id: mfg.id,
          category: row.category,
          sku: row.sku,
          eso_number: row.eso_number,
          name: row.name,
          description: row.description || null,
          uvp_cents: parseInt(row.uvp_cents, 10),
          tags,
          is_active: row.is_active === 'false' ? false : true,
        });
      }

      if (productsToImport.length === 0) {
        throw new Error('Keine gültigen Produkte zum Importieren gefunden');
      }

      // Insert in batches
      const { error: insertError } = await (supabase
        .from('products') as any)
        .insert(productsToImport);

      if (insertError) throw insertError;

      setCsvSuccess(`${productsToImport.length} Produkte erfolgreich importiert!`);
      await loadData();

      // Reset form after 2 seconds
      setTimeout(() => {
        setShowCsvModal(false);
        setCsvFile(null);
        setCsvSuccess('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
    } catch (err: any) {
      console.error('Error importing CSV:', err);
      setCsvError(err.message || 'Fehler beim CSV-Import');
    } finally {
      setCsvLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (filterManufacturer && p.manufacturer_id !== filterManufacturer) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.eso_number.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Produkte
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Verwalten Sie den Produkt-Katalog
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCsvModal(true)}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                📤 CSV Import
              </button>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                ➕ Neues Produkt
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
                Hersteller filtern
              </label>
              <select
                value={filterManufacturer}
                onChange={(e) => setFilterManufacturer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle Hersteller</option>
                {manufacturers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suche
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, SKU, ESO..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Lade Produkte...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {products.length === 0 ? 'Noch keine Produkte angelegt.' : 'Keine Produkte gefunden.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Hersteller
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Kategorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        SKU / ESO
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        UVP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {product.description.substring(0, 60)}
                              {product.description.length > 60 && '...'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {product.manufacturers?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs">
                            <code className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded">
                              {product.sku}
                            </code>
                            <br />
                            <code className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded">
                              {product.eso_number}
                            </code>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {(product.uvp_cents / 100).toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.is_active ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              ✓ Aktiv
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              ✗ Inaktiv
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(product)}
                              className="px-3 py-1 rounded-lg font-semibold transition-colors bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleToggleActive(product.id, product.is_active)}
                              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                                product.is_active
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                                  : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                              }`}
                            >
                              {product.is_active ? '❌' : '✅'}
                            </button>
                            <button
                              onClick={() => {
                                setDeleteId(product.id);
                                setDeleteName(product.name);
                                setShowDeleteConfirm(true);
                              }}
                              className="px-3 py-1 rounded-lg font-semibold transition-colors bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                            >
                              🗑️
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
          {!loading && products.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {filteredProducts.length} von {products.length} Produkten • {products.filter(p => p.is_active).length} aktiv
            </div>
          )}

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {modalMode === 'create' ? 'Neues Produkt' : 'Produkt bearbeiten'}
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
                        Hersteller *
                      </label>
                      <select
                        required
                        value={modalForm.manufacturerId}
                        onChange={(e) => setModalForm({ ...modalForm, manufacturerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">-- Auswählen --</option>
                        {manufacturers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kategorie *
                      </label>
                      <input
                        type="text"
                        required
                        value={modalForm.category}
                        onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        placeholder="z.B. camera"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={modalForm.name}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. M4318-PLVA Dome Camera"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Beschreibung
                    </label>
                    <textarea
                      value={modalForm.description}
                      onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SKU *
                      </label>
                      <input
                        type="text"
                        required
                        value={modalForm.sku}
                        onChange={(e) => setModalForm({ ...modalForm, sku: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono"
                        placeholder="z.B. AXIS-M4318-PLVA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ESO-Nummer *
                      </label>
                      <input
                        type="text"
                        required
                        value={modalForm.esoNumber}
                        onChange={(e) => setModalForm({ ...modalForm, esoNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono"
                        placeholder="z.B. ESO123456"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      UVP (in €) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={modalForm.uvpCents}
                      onChange={(e) => setModalForm({ ...modalForm, uvpCents: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. 459.00 oder 459,99"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (komma-getrennt)
                    </label>
                    <input
                      type="text"
                      value={modalForm.tags}
                      onChange={(e) => setModalForm({ ...modalForm, tags: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. dome, outdoor, 4k"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={modalForm.isActive}
                      onChange={(e) => setModalForm({ ...modalForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Aktiv
                    </label>
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

          {/* CSV Import Modal */}
          {showCsvModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    CSV Import
                  </h2>
                  <button
                    onClick={() => {
                      setShowCsvModal(false);
                      setCsvFile(null);
                      setCsvError('');
                      setCsvSuccess('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                {csvError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{csvError}</p>
                  </div>
                )}

                {csvSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">{csvSuccess}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Format:</h3>
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsv}
                        className="px-3 py-1 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                      >
                        📥 Muster-CSV herunterladen
                      </button>
                    </div>
                    <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                      <pre>manufacturer_slug;category;sku;eso_number;name;description;uvp_cents;tags;is_active</pre>
                      <pre className="text-gray-600 dark:text-gray-400 mt-1">axis;camera;AXIS-M4318;ESO123;AXIS M4318-PLVA;Dome Cam;45900;dome,outdoor;true</pre>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      • Trennzeichen: <code>;</code> (Semikolon)<br />
                      • <strong>manufacturer_slug</strong> muss einem existierenden Hersteller entsprechen<br />
                      • <strong>uvp_cents</strong> ist der Preis in Cent (45900 = 459,00 €)<br />
                      • <strong>tags</strong> sind komma-getrennt (ohne Leerzeichen nach Komma!)<br />
                      • <strong>is_active</strong>: true oder false<br />
                      <span className="text-yellow-600 dark:text-yellow-400">⚠️ Im Formular: Preis in €, im CSV: Preis in Cent!</span>
                    </p>
                    {manufacturers.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          <strong>Verfügbare Hersteller-Slugs:</strong> {manufacturers.map(m => m.slug).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CSV-Datei auswählen
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        setCsvFile(e.target.files?.[0] || null);
                        setCsvError('');
                        setCsvSuccess('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCsvModal(false);
                        setCsvFile(null);
                        setCsvError('');
                        setCsvSuccess('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleCsvImport}
                      disabled={!csvFile || csvLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {csvLoading ? 'Importiert...' : 'Importieren'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Produkt löschen?
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
