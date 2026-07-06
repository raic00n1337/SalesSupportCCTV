// ProductSelector Component
// Zweck: Produkte aus DB für Konfigurator auswählen

import { useState, useEffect } from 'react'
import type { ConfiguratorProduct } from '../pages/api/configurator/products'

interface ProductSelectorProps {
  tier: string
  category: string
  value?: string // product_id
  onChange: (product: ConfiguratorProduct | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  tier,
  category,
  value,
  onChange,
  disabled = false,
  placeholder = 'Produkt wählen...',
  className = ''
}) => {
  const [products, setProducts] = useState<ConfiguratorProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Produkte laden wenn tier oder category sich ändert
  useEffect(() => {
    if (!tier || !category) {
      setProducts([])
      return
    }

    handleFetchProducts()
  }, [tier, category])

  const handleFetchProducts = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/configurator/products?tier=${encodeURIComponent(tier)}&category=${encodeURIComponent(category)}`
      )

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch products')
      }

      const data = await res.json()
      setProducts(data.products || [])

      // Auto-select Default-Produkt wenn nichts ausgewählt ist
      if (!value && data.products.length > 0) {
        const defaultProduct = data.products.find((p: ConfiguratorProduct) => p.is_default)
        if (defaultProduct) {
          onChange(defaultProduct)
        }
      }

    } catch (err: any) {
      console.error('Error fetching products:', err)
      setError(err.message)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value
    
    if (!productId) {
      onChange(null)
      return
    }

    const selectedProduct = products.find(p => p.product_id === productId)
    onChange(selectedProduct || null)
  }

  // Loading State
  if (loading) {
    return (
      <select disabled className={`border rounded px-3 py-2 bg-gray-100 ${className}`}>
        <option>Laden...</option>
      </select>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="text-red-600 text-sm">
        ⚠️ Fehler: {error}
      </div>
    )
  }

  // No Products
  if (products.length === 0) {
    return (
      <select disabled className={`border rounded px-3 py-2 bg-gray-100 ${className}`}>
        <option>Keine Produkte verfügbar</option>
      </select>
    )
  }

  // Normal State
  return (
    <div className="flex flex-col gap-1">
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        } ${className}`}
      >
        <option value="">{placeholder}</option>
        {products.map((product) => (
          <option key={product.product_id} value={product.product_id}>
            {product.name} ({product.manufacturer}) - {(product.uvp_cents / 100).toFixed(2)}€
            {product.is_default ? ' ⭐' : ''}
          </option>
        ))}
      </select>

      {/* Zusätzliche Info für ausgewähltes Produkt */}
      {value && products.find(p => p.product_id === value) && (
        <div className="text-xs text-gray-600 mt-1">
          SKU: {products.find(p => p.product_id === value)?.sku}
          {products.find(p => p.product_id === value)?.eso_number && 
            ` | ESO: ${products.find(p => p.product_id === value)?.eso_number}`
          }
          {products.find(p => p.product_id === value)?.bhe_time_minutes > 0 && 
            ` | Montagezeit: ${products.find(p => p.product_id === value)?.bhe_time_minutes} min`
          }
        </div>
      )}
    </div>
  )
}

export default ProductSelector
