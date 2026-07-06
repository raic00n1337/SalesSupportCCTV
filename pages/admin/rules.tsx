// Admin: Rules Management (Feature-based Product Assignment)
// Zweck: Regeln definieren die Vorrang vor Tier-Defaults haben

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllRows } from '../../lib/supabasePagination'
import Link from 'next/link'
import RouteGuard from '../../components/RouteGuard'
import AdminLayout from '../../components/AdminLayout'

interface Product {
  id: string
  name: string
  sku: string
  eso_number: string
  uvp_cents: number
  manufacturers: {
    name: string
    slug: string
  }
}

interface Rule {
  id: string
  name: string
  description?: string
  is_active: boolean
  priority: number
  tier?: string
  manufacturer?: string
  category?: string
  feature_conditions: Record<string, any>
  target_product_id: string
  products?: Product
}

interface Manufacturer {
  id: string
  name: string
  slug: string
}

export default function AdminRules() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [rules, setRules] = useState<Rule[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filterActive, setFilterActive] = useState<string>('all')
  
  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [priorityInput, setPriorityInput] = useState<string>('0')
  const [productSearch, setProductSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    priority: 0,
    tier: '',
    manufacturer: '',
    category: '',
    feature_conditions: {},
    target_product_id: ''
  })

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    handleLoadRules()
    handleLoadProducts()
    handleLoadManufacturers()
  }, [user])

  const handleLoadRules = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('rules')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            eso_number,
            uvp_cents,
            manufacturers (
              name,
              slug
            )
          )
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setRules(data as Rule[])
    } catch (err: any) {
      console.error('Error loading rules:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadProducts = async () => {
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
            uvp_cents,
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
      console.error('Error loading products:', err)
    }
  }

  const handleLoadManufacturers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('manufacturers')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      setManufacturers(data as Manufacturer[])
    } catch (err: any) {
      console.error('Error loading manufacturers:', err)
    }
  }

  const handleOpenModal = (rule?: Rule) => {
    if (rule) {
      setEditingRule(rule)
      setPriorityInput(rule.priority.toString())
      setFormData({
        name: rule.name,
        description: rule.description || '',
        is_active: rule.is_active,
        priority: rule.priority,
        tier: rule.tier || '',
        manufacturer: rule.manufacturer || '',
        category: rule.category || '',
        feature_conditions: rule.feature_conditions || {},
        target_product_id: rule.target_product_id
      })
    } else {
      setEditingRule(null)
      setPriorityInput('')
      setFormData({
        name: '',
        description: '',
        is_active: true,
        priority: 0,
        tier: '',
        manufacturer: '',
        category: '',
        feature_conditions: {},
        target_product_id: ''
      })
    }
    setProductSearch('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRule(null)
    setPriorityInput('0')
    setProductSearch('')
  }

  // Changing the manufacturer filter should re-filter the target product
  // list (see filteredProducts below) - if the currently selected product
  // no longer matches, clear it instead of silently keeping an invisible
  // selection the admin can't see/change in the dropdown anymore.
  const handleManufacturerChange = (manufacturerSlug: string) => {
    const selected = allProducts.find(p => p.id === formData.target_product_id)
    const stillMatches = !selected || !manufacturerSlug || selected.manufacturers?.slug === manufacturerSlug
    setFormData({
      ...formData,
      manufacturer: manufacturerSlug,
      target_product_id: stillMatches ? formData.target_product_id : ''
    })
  }

  const filteredProducts = allProducts.filter(p => {
    // Always keep the currently selected product visible/selectable, even if
    // it no longer matches the filters below (e.g. stale/inconsistent data
    // on an existing rule) - otherwise the dropdown would silently show a
    // blank selection for a rule that actually has a target product.
    if (p.id === formData.target_product_id) return true
    if (formData.manufacturer && p.manufacturers?.slug !== formData.manufacturer) return false
    const query = productSearch.trim().toLowerCase()
    if (!query) return true
    return p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
  })

  // The /api/rules endpoint requires admin authentication (server-side check).
  // Attach the current session's access token to every mutating request.
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Keine aktive Session')
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.name) {
        alert('Bitte geben Sie einen Namen ein.')
        return
      }
      if (!formData.target_product_id) {
        alert('Bitte wählen Sie ein Zielprodukt aus.')
        return
      }

      // Clean up empty strings
      const cleanData = {
        ...formData,
        tier: formData.tier || null,
        manufacturer: formData.manufacturer || null,
        category: formData.category || null
      }

      const headers = await getAuthHeaders()

      if (editingRule) {
        // Update
        const res = await fetch(`/api/rules?id=${editingRule.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(cleanData)
        })

        if (!res.ok) throw new Error('Failed to update rule')
      } else {
        // Create
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers,
          body: JSON.stringify(cleanData)
        })

        if (!res.ok) throw new Error('Failed to create rule')
      }

      handleCloseModal()
      handleLoadRules()
    } catch (err: any) {
      console.error('Error saving:', err)
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/rules?id=${id}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) throw new Error('Failed to delete rule')

      handleLoadRules()
    } catch (err: any) {
      console.error('Error deleting:', err)
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleToggleActive = async (rule: Rule) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/rules?id=${rule.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...rule, is_active: !rule.is_active })
      })

      if (!res.ok) throw new Error('Failed to update rule')

      handleLoadRules()
    } catch (err: any) {
      console.error('Error toggling active:', err)
      alert(`Fehler: ${err.message}`)
    }
  }

  const filteredRules = rules.filter(r => {
    if (filterActive === 'active' && !r.is_active) return false
    if (filterActive === 'inactive' && r.is_active) return false
    return true
  })

  const categories = [
    { value: 'camera_dome_fixed', label: 'Dome Fixed' },
    { value: 'camera_dome_vario', label: 'Dome Vario' },
    { value: 'camera_bullet_fixed', label: 'Bullet Fixed' },
    { value: 'camera_bullet_vario', label: 'Bullet Vario' },
    { value: 'camera_ptz', label: 'PTZ' },
    { value: 'camera_thermal', label: 'Thermal' },
    { value: 'speaker_ip', label: 'IP-Lautsprecher' },
    { value: 'nvr', label: 'NVR' },
    { value: 'switch', label: 'Switch' },
    { value: 'monitor', label: 'Monitor' }
  ]

  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Produkt-Regeln
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Feature-basierte Produktzuordnung mit Priorität über Tier-Defaults
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + Neue Regel
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              💡 Wie funktionieren Regeln?
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Regeln haben <strong>Vorrang</strong> vor Tier-Defaults</li>
              <li>• Höhere Priorität = wird zuerst geprüft (z.B. 100 vor 50)</li>
              <li>• Bedingungen: <strong>Tier + Hersteller + Kategorie</strong> (alle müssen erfüllt sein)</li>
              <li>• Beispiel: <strong>AXIS + Premium + Bullet Vario</strong> → Spezielle Kamera</li>
              <li>• Features sind optional für zusätzliche Filterung</li>
            </ul>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Alle</option>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rules Table */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Laden...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">Fehler: {error}</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Keine Regeln gefunden. Erstellen Sie die erste Regel!
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Bedingungen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Zielprodukt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Priorität
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {rule.name}
                        </div>
                        {rule.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {rule.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {rule.tier && <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1">Tier: {rule.tier}</span>}
                        {rule.manufacturer && <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded mr-1">Hersteller: {rule.manufacturer}</span>}
                        {rule.category && <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mr-1">Kategorie: {categories.find(c => c.value === rule.category)?.label}</span>}
                        {Object.keys(rule.feature_conditions || {}).length > 0 && (
                          <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                            Features: {JSON.stringify(rule.feature_conditions)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {rule.products ? (
                          <div>
                            <div>{rule.products.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              SKU: {rule.products.sku} | {(rule.products.uvp_cents / 100).toFixed(2)}€
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Produkt gelöscht</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {rule.priority}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            rule.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rule.is_active ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenModal(rule)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    {editingRule ? 'Regel bearbeiten' : 'Neue Regel erstellen'}
                  </h2>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="z.B. Premium Bullet Vario mit Spezial-Objektiv"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Beschreibung
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Ausführliche Beschreibung der Regel..."
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priorität (höher = zuerst geprüft)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priorityInput}
                        onChange={(e) => {
                          const input = e.target.value
                          // Allow empty or numbers only
                          if (input === '' || /^\d+$/.test(input)) {
                            setPriorityInput(input)
                            const numVal = input === '' ? 0 : parseInt(input)
                            setFormData({ ...formData, priority: numVal })
                          }
                        }}
                        placeholder="z.B. 100"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Empfehlung: 100 = hoch, 50 = mittel, 0 = niedrig
                      </p>
                    </div>

                    {/* Conditions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tier */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tier (empfohlen) *
                        </label>
                        <select
                          value={formData.tier}
                          onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Alle Tiers</option>
                          <option value="eco">Eco</option>
                          <option value="premium">Premium</option>
                          <option value="high-risk">High-Risk</option>
                        </select>
                      </div>

                      {/* Manufacturer */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Hersteller (empfohlen) *
                        </label>
                        <select
                          value={formData.manufacturer}
                          onChange={(e) => handleManufacturerChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Alle Hersteller</option>
                          {manufacturers.map(m => (
                            <option key={m.id} value={m.slug}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Kategorie (empfohlen) *
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Alle Kategorien</option>
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Target Product */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Zielprodukt *
                      </label>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Produkt suchen (Name oder SKU)..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                      />
                      <select
                        value={formData.target_product_id}
                        onChange={(e) => setFormData({ ...formData, target_product_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Bitte wählen...</option>
                        {filteredProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) - {(p.uvp_cents / 100).toFixed(2)}€
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {filteredProducts.length} von {allProducts.length} Produkten
                        {formData.manufacturer && ` (gefiltert nach Hersteller)`}
                      </p>
                    </div>

                    {/* Active */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Regel aktiv
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
        </div>
      </AdminLayout>
    </RouteGuard>
  )
}
