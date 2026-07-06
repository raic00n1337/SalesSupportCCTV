// Admin: Konfigurator-Produkte verwalten
// Zweck: JEDE Konfigurator-Komponente (Kameras, Switches, Medienkonverter, NVR, VMS-Hardware,
// Netzwerkschränke, Zubehör, Dienstleistungen, ...) einem Tier + einer Kategorie zuweisen,
// Defaults markieren, BHE-Zeit setzen und - für kapazitäts-gestaffelte Kategorien - die
// jeweilige Kapazität (Ports/Kanäle/Kameras) hinterlegen.

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllRows } from '../../lib/supabasePagination'
import AdminLayout from '../../components/AdminLayout'
import { CONFIGURATOR_CATEGORY_CATALOG } from '../../lib/configuratorCatalog'
import { getManufacturerLink, isSearchFallbackUrl } from '../../lib/manufacturerLinks'
import type { ConfiguratorProduct } from '../api/configurator/products'

interface Product {
  id: string
  name: string
  sku: string
  eso_number: string
  manufacturer_id: string
  manufacturer_url?: string | null
  manufacturers: {
    name: string
    slug: string
  }
}

// Hinweis: Diese Seite fragt configurator_products direkt per Supabase-Query ab
// (nicht über die API-Route), daher entspricht `manufacturer_slug` hier der
// rohen DB-Spalte = expliziter Hersteller-Geltungsbereich dieser Zuordnung.
// Die Marke des verknüpften Produkts selbst liegt (wie name/sku) verschachtelt
// unter `products.manufacturers.slug`.
interface ConfiguratorProductFull extends ConfiguratorProduct {
  products: Product
}

const categories = CONFIGURATOR_CATEGORY_CATALOG

export default function ConfiguratorProductsPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [products, setProducts] = useState<ConfiguratorProductFull[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all')
  const [productSearch, setProductSearch] = useState('')
  
  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ConfiguratorProductFull | null>(null)
  const [formData, setFormData] = useState({
    product_id: '',
    tier: 'eco' as 'eco' | 'premium' | 'high-risk',
    category: 'camera_dome_fixed',
    priority: 0,
    is_default: false,
    bhe_time_minutes: 45,
    required_accessories: [] as string[],
    capacity_value: '' as number | '',
    capacity_unit: '',
    // Expliziter Hersteller-Geltungsbereich ('' = gilt für alle Hersteller/Universal-Fallback)
    manufacturer_slug: ''
  })

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    handleLoadProducts()
    handleLoadAllProducts()
  }, [user])

  const handleLoadProducts = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('configurator_products')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            eso_number,
            manufacturer_id,
            manufacturer_url,
            manufacturers (
              name,
              slug
            )
          )
        `)
        .order('tier', { ascending: true })
        .order('category', { ascending: true })
        .order('capacity_value', { ascending: true })
        .order('priority', { ascending: false })

      if (fetchError) throw fetchError

      setProducts(data as ConfiguratorProductFull[])
    } catch (err: any) {
      console.error('Error loading products:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadAllProducts = async () => {
    try {
      // Paged - see fetchAllRows, catalog has 2000+ products
      const data = await fetchAllRows<Product>((from, to) =>
        supabase
          .from('products')
          .select(`
            id,
            name,
            sku,
            eso_number,
            manufacturer_id,
            manufacturers (
              name,
              slug
            )
          `)
          .eq('is_active', true)
          .order('name', { ascending: true })
          .range(from, to)
      )

      setAllProducts(data)
    } catch (err: any) {
      console.error('Error loading all products:', err)
    }
  }

  const manufacturerOptions = useMemo(() => {
    const set = new Map<string, string>()
    allProducts.forEach((p) => {
      if (p.manufacturers) set.set(p.manufacturers.slug, p.manufacturers.name)
    })
    return Array.from(set.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [allProducts])

  const selectedCategoryDef = categories.find((c) => c.value === formData.category)

  const productOptionsForModal = useMemo(() => {
    const search = productSearch.trim().toLowerCase()
    const filtered = !search
      ? allProducts
      : allProducts.filter((p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.manufacturers?.name.toLowerCase().includes(search)
        )
    // Aktuell zugeordnetes Produkt immer sichtbar halten, auch außerhalb der
    // Suche/500er-Anzeigegrenze (relevant beim Bearbeiten bestehender Zuordnungen).
    if (formData.product_id && !filtered.some((p) => p.id === formData.product_id)) {
      const current = allProducts.find((p) => p.id === formData.product_id)
      if (current) return [current, ...filtered]
    }
    return filtered
  }, [allProducts, productSearch, formData.product_id])

  const handleOpenModal = (product?: ConfiguratorProductFull) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        product_id: product.product_id,
        tier: product.tier as any,
        category: product.category,
        priority: product.priority,
        is_default: product.is_default,
        bhe_time_minutes: product.bhe_time_minutes,
        required_accessories: product.required_accessories || [],
        capacity_value: product.capacity_value ?? '',
        capacity_unit: product.capacity_unit || '',
        manufacturer_slug: product.manufacturer_slug || ''
      })
    } else {
      setEditingProduct(null)
      setFormData({
        product_id: '',
        tier: 'eco',
        category: 'camera_dome_fixed',
        priority: 0,
        is_default: false,
        bhe_time_minutes: 45,
        required_accessories: [],
        capacity_value: '',
        capacity_unit: '',
        manufacturer_slug: ''
      })
    }
    setProductSearch('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProduct(null)
  }

  const handleSave = async () => {
    try {
      if (!formData.product_id) {
        alert('Bitte wählen Sie ein Produkt aus.')
        return
      }

      const payload: any = {
        product_id: formData.product_id,
        tier: formData.tier,
        category: formData.category,
        priority: formData.priority,
        is_default: formData.is_default,
        bhe_time_minutes: formData.bhe_time_minutes,
        required_accessories: formData.required_accessories,
        capacity_value: formData.capacity_value === '' ? null : Number(formData.capacity_value),
        capacity_unit: formData.capacity_value === '' ? null : (formData.capacity_unit || selectedCategoryDef?.capacityUnitHint || null),
        manufacturer_slug: formData.manufacturer_slug || null
      }

      if (editingProduct) {
        const { error: updateError } = await (supabase
          .from('configurator_products') as any)
          .update(payload)
          .eq('id', editingProduct.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await (supabase
          .from('configurator_products') as any)
          .insert(payload)

        if (insertError) throw insertError
      }

      handleCloseModal()
      handleLoadProducts()
    } catch (err: any) {
      console.error('Error saving:', err)
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return

    try {
      const { error: deleteError } = await supabase
        .from('configurator_products')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      handleLoadProducts()
    } catch (err: any) {
      console.error('Error deleting:', err)
      alert(`Fehler: ${err.message}`)
    }
  }

  const filteredProducts = products.filter(p => {
    if (filterTier !== 'all' && p.tier !== filterTier) return false
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    if (
      filterManufacturer !== 'all' &&
      p.products?.manufacturers?.slug !== filterManufacturer &&
      p.manufacturer_slug !== filterManufacturer
    ) return false
    return true
  })

  const categoriesByGroup = useMemo(() => {
    const groups: Record<string, typeof categories> = {}
    categories.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = []
      groups[c.group].push(c)
    })
    return groups
  }, [])

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Konfigurator-Komponenten
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Jede Komponente aus dem Konfigurator (Kameras, Switches, Medienkonverter, NVR/VMS,
            Netzwerkschränke, Zubehör, Dienstleistungen) einem Tier + Kategorie zuweisen.
            Kategorien mit &quot;nach Kapazität&quot; können mehrfach mit unterschiedlichen
            Kapazitäts-Stufen (z.B. 8/16/24 Ports) angelegt werden - der Konfigurator wählt
            automatisch die kleinste ausreichende Stufe.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
        >
          + Neue Zuordnung
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tier
            </label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Alle</option>
              <option value="eco">Eco</option>
              <option value="premium">Premium</option>
              <option value="high-risk">High-Risk</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kategorie
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Alle</option>
              {Object.entries(categoriesByGroup).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hersteller (Produktmarke oder Geltungsbereich)
            </label>
            <select
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Alle</option>
              {manufacturerOptions.map(([slug, name]) => (
                <option key={slug} value={slug}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Laden...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Fehler: {error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Keine Zuordnungen gefunden.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Produkt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Geltungsbereich
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kapazität
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  BHE (Min)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priorität
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Default
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      product.tier === 'eco' ? 'bg-green-100 text-green-800' :
                      product.tier === 'premium' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {product.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {categories.find(c => c.value === product.category)?.label || product.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>{product.products?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      SKU: {product.products?.sku} | {product.products?.manufacturers?.name}
                      {(() => {
                        const p = product.products
                        if (!p) return null
                        const isAxis = p.manufacturers?.slug === 'axis'
                        const link = p.manufacturer_url && !isSearchFallbackUrl(p.manufacturer_url) && !isAxis
                          ? { url: p.manufacturer_url, exact: true }
                          : getManufacturerLink(p.manufacturers?.slug || '', p.sku, p.name)
                        if (!link) return null
                        return (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.exact ? 'Zur Produktseite beim Hersteller' : 'Suche auf der Herstellerseite (kein exakter Link)'}
                            className="ml-1 text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {link.exact ? '🔗' : '🔍'}
                          </a>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {product.manufacturer_slug ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {manufacturerOptions.find(([slug]) => slug === product.manufacturer_slug)?.[1] || product.manufacturer_slug}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Alle Hersteller</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.capacity_value != null ? `${product.capacity_value} ${product.capacity_unit || ''}`.trim() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.bhe_time_minutes} min
                    {categories.find(c => c.value === product.category)?.bheTimeHandledByFormula && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1" title="Wird im Angebot über eine eigene Formel berechnet, nicht aus diesem Feld">
                        (Formel)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.priority}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {product.is_default && <span className="text-yellow-500">⭐</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {editingProduct ? 'Zuordnung bearbeiten' : 'Neue Zuordnung hinzufügen'}
              </h2>

              <div className="space-y-4">
                {/* Category (immer wählbar, auch beim Bearbeiten, da Kapazitäts-Hinweise davon abhängen) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kategorie *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(categoriesByGroup).map(([group, items]) => (
                      <optgroup key={group} label={group}>
                        {items.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {selectedCategoryDef?.banded && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚡ Kapazitäts-gestaffelte Kategorie: Für unterschiedliche Ausbaustufen (z.B. 8/16/24)
                      mehrere Zuordnungen mit jeweils passender Kapazität anlegen.
                    </p>
                  )}
                </div>

                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Produkt *
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Produkt suchen (Name, SKU, Hersteller)..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                  />
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    size={8}
                  >
                    <option value="">Bitte wählen...</option>
                    {productOptionsForModal.slice(0, 500).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - {p.manufacturers?.name}
                      </option>
                    ))}
                  </select>
                  {productOptionsForModal.length > 500 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {productOptionsForModal.length} Treffer, zeige die ersten 500 - Suche eingrenzen für mehr Präzision.
                    </p>
                  )}
                </div>

                {/* Tier (Risikostufe) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tier (Risikostufe) *
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="eco">Eco</option>
                    <option value="premium">Premium</option>
                    <option value="high-risk">High-Risk</option>
                  </select>
                </div>

                {/* Hersteller-Geltungsbereich */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Geltungsbereich (Hersteller)
                  </label>
                  <select
                    value={formData.manufacturer_slug}
                    onChange={(e) => setFormData({ ...formData, manufacturer_slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Alle Hersteller (Universal-Fallback)</option>
                    {manufacturerOptions.map(([slug, name]) => (
                      <option key={slug} value={slug}>{name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Optional einschränken, für welchen Hersteller diese Zuordnung gilt - unabhängig
                    von der Marke des gewählten Produkts. Legst du für dieselbe Kategorie/denselben
                    Tier mehrere Zuordnungen mit unterschiedlichem Geltungsbereich an (z.B. AXIS und
                    Hanwha), wählt der Konfigurator automatisch die zum Projekt-Hersteller passende
                    aus - z.B. für unterschiedliche VMS-Lizenzen je Hersteller. &quot;Alle Hersteller&quot;
                    dient als Fallback, falls für den Projekt-Hersteller keine eigene Zuordnung existiert.
                  </p>
                </div>

                {/* Capacity (nur relevant für gestaffelte Kategorien, aber immer editierbar) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kapazität {selectedCategoryDef?.banded ? '*' : '(optional)'}
                    </label>
                    <input
                      type="number"
                      value={formData.capacity_value}
                      onChange={(e) => setFormData({ ...formData, capacity_value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      placeholder={selectedCategoryDef?.capacityUnitHint === 'ports' ? 'z.B. 8, 16, 24' : selectedCategoryDef?.capacityUnitHint === 'channels' ? 'z.B. 8, 16, 32' : 'z.B. 16'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Einheit
                    </label>
                    <input
                      type="text"
                      value={formData.capacity_unit}
                      onChange={(e) => setFormData({ ...formData, capacity_unit: e.target.value })}
                      placeholder={selectedCategoryDef?.capacityUnitHint || 'z.B. ports, channels, cameras'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priorität (höher = weiter oben)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* BHE Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Montagezeit (Minuten)
                  </label>
                  <input
                    type="number"
                    value={formData.bhe_time_minutes}
                    onChange={(e) => setFormData({ ...formData, bhe_time_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {selectedCategoryDef?.bheTimeHandledByFormula ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ℹ️ Nur Referenz: Bei dieser Kategorie wird die Montagezeit im Angebot über eine eigene,
                      kamera-/kanalabhängige Formel berechnet (siehe BHE-Zeitmodell), nicht über dieses Feld.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Fließt direkt (× Menge) in die Gesamt-Montagezeit im Angebot ein.
                    </p>
                  )}
                </div>

                {/* Is Default */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Als Default markieren ⭐ (wird ohne passende Regel automatisch vorausgewählt)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
