// Admin: Konfigurator-Produkte verwalten
// Zweck: Produkte zu Tier + Kategorie zuweisen, Defaults markieren, BHE-Zeit setzen

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import type { ConfiguratorProduct } from '../api/configurator/products'

interface Product {
  id: string
  name: string
  sku: string
  eso_number: string
  manufacturer_id: string
  manufacturers: {
    name: string
    slug: string
  }
}

interface ConfiguratorProductFull extends ConfiguratorProduct {
  products: Product
}

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
    required_accessories: [] as string[]
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
            manufacturers (
              name,
              slug
            )
          )
        `)
        .order('tier', { ascending: true })
        .order('category', { ascending: true })
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
      const { data, error: fetchError } = await supabase
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

      if (fetchError) throw fetchError

      setAllProducts(data as Product[])
    } catch (err: any) {
      console.error('Error loading all products:', err)
    }
  }

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
        required_accessories: product.required_accessories || []
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
        required_accessories: []
      })
    }
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

      if (editingProduct) {
        // Update
        const { error: updateError } = await (supabase
          .from('configurator_products') as any)
          .update({
            tier: formData.tier,
            category: formData.category,
            priority: formData.priority,
            is_default: formData.is_default,
            bhe_time_minutes: formData.bhe_time_minutes,
            required_accessories: formData.required_accessories
          })
          .eq('id', editingProduct.id)

        if (updateError) throw updateError
      } else {
        // Insert
        const { error: insertError } = await (supabase
          .from('configurator_products') as any)
          .insert({
            product_id: formData.product_id,
            tier: formData.tier,
            category: formData.category,
            priority: formData.priority,
            is_default: formData.is_default,
            bhe_time_minutes: formData.bhe_time_minutes,
            required_accessories: formData.required_accessories
          })

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Konfigurator-Produkte
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Produkte zu Tier + Kategorie zuweisen
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                ← Zurück
              </Link>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + Neues Produkt
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
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
              Keine Produkte gefunden.
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
                      <div>{product.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        SKU: {product.sku} | {product.manufacturer}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {product.bhe_time_minutes}
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
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt hinzufügen'}
              </h2>

              <div className="space-y-4">
                {/* Product Selection */}
                {!editingProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Produkt *
                    </label>
                    <select
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Bitte wählen...</option>
                      {allProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - {p.manufacturers.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tier *
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

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kategorie *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
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
                    Als Default markieren ⭐
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
  )
}
