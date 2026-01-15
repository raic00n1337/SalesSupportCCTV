import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useDropzone } from 'react-dropzone'
import { SystemDesign, CameraPlacement, Project } from '../../types'
import { supabase } from '../../lib/supabaseClient'

// Dynamically import Canvas component with no SSR
const SystemDesignerCanvas = dynamic(
  () => import('../../components/SystemDesignerCanvas'),
  { ssr: false }
)

/**
 * SYSTEM DESIGNER - Hauptkomponente
 * 
 * Features:
 * - Grundriss-Upload
 * - Drag & Drop Kamera-Platzierung
 * - Detection Cone Visualisierung
 * - Maßstab-Definition
 * - Save/Load zu/von Supabase
 * - PNG/PDF Export
 */
export default function SystemDesigner() {
  const router = useRouter()
  const { projectId } = router.query

  // State
  const [project, setProject] = useState<Project | null>(null)
  const [designs, setDesigns] = useState<SystemDesign[]>([])
  const [currentDesign, setCurrentDesign] = useState<SystemDesign | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Client-side only rendering (Konva doesn't support SSR)
  useEffect(() => {
    setIsClient(true)
  }, [])
  const [saving, setSaving] = useState(false)

  // Canvas State
  const [stageSize, setStageSize] = useState({ width: 1000, height: 800 })
  const [selectedCameraType, setSelectedCameraType] = useState<string | null>(null)
  const [selectedPlacement, setSelectedPlacement] = useState<CameraPlacement | null>(null)
  
  // Product Search
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')

  // Import cameras from configurator
  const importCamerasFromConfigurator = async (project: Project, designId: string) => {
    console.log('🎬 Starting camera import...', { projectId: project.id, designId, sitesCount: project.sites?.length })
    
    if (!project.sites || project.sites.length === 0) {
      console.warn('⚠️ No sites found in project')
      return
    }
    
    try {
      const allCameras: any[] = []
      let cameraIndex = 0
      
      // Collect all cameras from all sites
      project.sites.forEach((site: any, siteIdx: number) => {
        const cameras = site.cameras_config || {}
        console.log(`📍 Site ${siteIdx + 1}:`, site.name, 'Cameras:', cameras)
        
        // Helper to add cameras
        const addCameras = (type: string, count: number, icon: string) => {
          for (let i = 0; i < count; i++) {
            const customName = cameras[type]?.customNames?.[i]
            allCameras.push({
              type,
              icon,
              name: customName || `${type.replace('_', ' ')} #${i + 1}`,
              siteIndex: siteIdx,
              siteName: site.name
            })
          }
        }
        
        // Add all camera types
        if (cameras.domeFixed?.quantity) addCameras('dome_fixed', cameras.domeFixed.quantity, '🎥')
        if (cameras.domeVario?.quantity) addCameras('dome_vario', cameras.domeVario.quantity, '🎥')
        if (cameras.bulletFixed?.quantity) addCameras('bullet_fixed', cameras.bulletFixed.quantity, '📹')
        if (cameras.bulletVario?.quantity) addCameras('bullet_vario', cameras.bulletVario.quantity, '📹')
        if (cameras.ptz?.quantity) addCameras('ptz', cameras.ptz.quantity, '🔄')
        if (cameras.thermal?.quantity) addCameras('thermal', cameras.thermal.quantity, '🌡️')
      })
      
      // Create placements in a grid layout
      const gridCols = 5
      const startX = 100
      const startY = 100
      const spacingX = 120
      const spacingY = 120
      
      console.log(`📦 Total cameras to import: ${allCameras.length}`)
      
      for (let i = 0; i < allCameras.length; i++) {
        const camera = allCameras[i]
        const row = Math.floor(i / gridCols)
        const col = i % gridCols
        
        const placement = {
          system_design_id: designId,
          camera_type: camera.type,
          camera_name: `${camera.siteName} - ${camera.name}`,
          position_x: startX + (col * spacingX),
          position_y: startY + (row * spacingY),
          rotation: 0,
          focal_length_mm: 2.8,
          field_of_view: 90,
          detection_range_m: 30,
          show_detection_cone: true,
          cone_color: '#3b82f6',
          cone_opacity: 0.3
        }
        
        console.log(`🎥 Importing camera ${i + 1}/${allCameras.length}:`, camera.name)
        
        // Create placement via API
        const res = await fetch('/api/system-designer/placements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(placement)
        })
        
        if (res.ok) {
          const data = await res.json()
          console.log(`  ✅ Placed successfully at (${placement.position_x}, ${placement.position_y})`)
          setCurrentDesign(prev => prev ? {
            ...prev,
            placements: [...(prev.placements || []), data.placement]
          } : null)
        } else {
          console.error(`  ❌ Failed to place camera:`, await res.text())
        }
      }
      
      console.log(`✅ Import complete! ${allCameras.length} cameras placed on canvas`)
    } catch (error) {
      console.error('❌ Error importing cameras:', error)
    }
  }

  // Refresh cameras from configurator
  const handleRefreshCameras = async () => {
    if (!project || !currentDesign) return
    
    if (!confirm('Alle bestehenden Kameras löschen und neu aus Konfigurator laden?')) return
    
    try {
      setSaving(true)
      console.log('🔄 Refreshing cameras from configurator...')
      
      // Delete all existing placements
      const placementIds = currentDesign.placements?.map(p => p.id) || []
      for (const id of placementIds) {
        await fetch(`/api/system-designer/placements?id=${id}`, { method: 'DELETE' })
      }
      
      // Re-import from configurator
      await importCamerasFromConfigurator(project, currentDesign.id)
      
      // Reload design
      const res = await fetch(`/api/system-designer/designs?design_id=${currentDesign.id}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentDesign(data.design)
        setDesigns(prev => prev.map(d => d.id === currentDesign.id ? data.design : d))
      }
      
      console.log('✅ Cameras refreshed successfully')
    } catch (error) {
      console.error('❌ Error refreshing cameras:', error)
      alert('Fehler beim Neu-Laden der Kameras')
    } finally {
      setSaving(false)
    }
  }

  // Load available products from database
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('configurator_products')
          .select(`
            *,
            products (
              id,
              name,
              sku,
              manufacturer
            )
          `)
          .order('category')
        
        if (!error && data) {
          setAvailableProducts(data)
          console.log(`✅ Loaded ${data.length} products from database`)
        }
      } catch (error) {
        console.error('❌ Error loading products:', error)
      }
    }
    
    loadProducts()
  }, [])

  // Add product from search to canvas
  const handleAddProductToCanvas = async (product: any) => {
    if (!currentDesign) return
    
    try {
      // Map product category to camera type
      const categoryToCameraType: Record<string, string> = {
        'camera_dome_fixed': 'dome_fixed',
        'camera_dome_vario': 'dome_vario',
        'camera_bullet_fixed': 'bullet_fixed',
        'camera_bullet_vario': 'bullet_vario',
        'camera_ptz': 'ptz',
        'camera_thermal': 'thermal',
        'ip_speaker': 'dome_fixed' // Fallback
      }
      
      const cameraType = categoryToCameraType[product.category] || 'dome_fixed'
      
      // Add to center of canvas
      const placement = {
        system_design_id: currentDesign.id,
        camera_type: cameraType,
        camera_name: product.products?.name || 'Unbekannt',
        product_id: product.product_id,
        position_x: 400,
        position_y: 300,
        rotation: 0,
        focal_length_mm: product.focal_length_min || 2.8,
        field_of_view: 90,
        detection_range_m: product.dori_detect_m || 30,
        show_detection_cone: true,
        cone_color: '#3b82f6',
        cone_opacity: 0.3
      }
      
      const res = await fetch('/api/system-designer/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placement)
      })
      
      if (res.ok) {
        const data = await res.json()
        setCurrentDesign(prev => prev ? {
          ...prev,
          placements: [...(prev.placements || []), data.placement]
        } : null)
        setProductSearchOpen(false)
        setProductSearchQuery('')
        console.log('✅ Product added to canvas:', product.products?.name)
      }
    } catch (error) {
      console.error('❌ Error adding product:', error)
    }
  }

  // Load Project & Designs
  useEffect(() => {
    if (!projectId) return
    
    const loadData = async () => {
      try {
        // Load Project directly from Supabase (fixes 404 API error)
        const { data: projData, error: projError } = await supabase
          .from('projects')
          .select(`
            *,
            sites (
              *
            )
          `)
          .eq('id', projectId)
          .single()

        if (!projError && projData) {
          setProject(projData)
        } else {
          console.error('Error loading project:', projError)
        }

        // Load Designs
        const designsRes = await fetch(`/api/system-designer/designs?project_id=${projectId}`)
        if (designsRes.ok) {
          const designsData = await designsRes.json()
          setDesigns(designsData.designs || [])
          
          // Select first design if exists
          if (designsData.designs && designsData.designs.length > 0) {
            const firstDesign = designsData.designs[0]
            setCurrentDesign(firstDesign)
            
            // Auto-import cameras from configurator if design has no placements yet
            if (projData && (!firstDesign.placements || firstDesign.placements.length === 0)) {
              await importCamerasFromConfigurator(projData, firstDesign.id)
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // Create New Design
  const handleCreateDesign = async (name: string) => {
    if (!projectId) return

    try {
      setSaving(true)
      const res = await fetch('/api/system-designer/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name,
          floor_number: 0
        })
      })

      if (res.ok) {
        const data = await res.json()
        console.log('✅ Design created:', data.design.name)
        
        // AUTO-IMPORT: Import cameras from configurator after creating new design
        if (project) {
          console.log('🔄 Auto-importing cameras from configurator...')
          await importCamerasFromConfigurator(project, data.design.id)
        }
        
        setDesigns(prev => [data.design, ...prev])
        setCurrentDesign(data.design)
      }
    } catch (error) {
      console.error('Error creating design:', error)
    } finally {
      setSaving(false)
    }
  }

  // Delete Design
  const handleDeleteDesign = async (designId: string) => {
    if (!confirm('Möchten Sie diesen Grundriss wirklich löschen?')) return

    try {
      setSaving(true)
      const res = await fetch(`/api/system-designer/designs?id=${designId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDesigns(prev => prev.filter(d => d.id !== designId))
        if (currentDesign?.id === designId) {
          setCurrentDesign(designs.length > 1 ? designs[0] : null)
        }
      }
    } catch (error) {
      console.error('Error deleting design:', error)
    } finally {
      setSaving(false)
    }
  }

  // Upload Floor Plan Image
  const handleImageUpload = async (file: File) => {
    if (!currentDesign) return

    try {
      setSaving(true)
      
      // Upload to storage
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await fetch('/api/system-designer/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image')
      }

      const uploadData = await uploadRes.json()

      // Get image dimensions
      const img = new Image()
      img.src = URL.createObjectURL(file)
      await new Promise(resolve => { img.onload = resolve })

      // Update design
      const updateRes = await fetch('/api/system-designer/designs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDesign.id,
          image_url: uploadData.url,
          image_width: img.width,
          image_height: img.height
        })
      })

      if (updateRes.ok) {
        const updateData = await updateRes.json()
        setCurrentDesign(updateData.design)
        setDesigns(prev => prev.map(d => d.id === updateData.design.id ? updateData.design : d))
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setSaving(false)
    }
  }

  // Add Camera Placement
  const handleAddCamera = async (x: number, y: number) => {
    if (!currentDesign || !selectedCameraType) return

    try {
      const res = await fetch('/api/system-designer/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_design_id: currentDesign.id,
          camera_type: selectedCameraType,
          position_x: x,
          position_y: y,
          rotation: 0,
          focal_length_mm: 2.8,
          field_of_view: 90,
          detection_range_m: 30
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentDesign(prev => prev ? {
          ...prev,
          placements: [...(prev.placements || []), data.placement]
        } : null)
      }
    } catch (error) {
      console.error('Error adding camera:', error)
    }
  }

  // Update Camera Placement
  const handleUpdatePlacement = async (id: string, updates: Partial<CameraPlacement>) => {
    try {
      const res = await fetch('/api/system-designer/placements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentDesign(prev => prev ? {
          ...prev,
          placements: prev.placements?.map(p => p.id === id ? data.placement : p)
        } : null)
      }
    } catch (error) {
      console.error('Error updating placement:', error)
    }
  }

  // Delete Camera Placement
  const handleDeletePlacement = async (id: string) => {
    try {
      const res = await fetch(`/api/system-designer/placements?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setCurrentDesign(prev => prev ? {
          ...prev,
          placements: prev.placements?.filter(p => p.id !== id)
        } : null)
        setSelectedPlacement(null)
      }
    } catch (error) {
      console.error('Error deleting placement:', error)
    }
  }

  // Dropzone for Image Upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleImageUpload(acceptedFiles[0])
      }
    }
  })

  // Show loading during SSR or while loading data
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade System Designer...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎨 System Designer</h1>
            {project && (
              <p className="text-sm text-gray-600 mt-1">
                Projekt: <span className="font-semibold">{project.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => router.push(`/configurator?id=${projectId}`)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            ← Zurück zum Konfigurator
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          {/* Designs List */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-3">📐 Grundrisse</h2>
            <button
              onClick={() => {
                const name = prompt('Name für neuen Grundriss:')
                if (name) handleCreateDesign(name)
              }}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              + Neuer Grundriss
            </button>
            <div className="mt-3 space-y-2">
              {designs.map(design => (
                <div key={design.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDesign(design)}
                    className={`flex-1 px-3 py-2 text-left rounded-lg transition ${
                      currentDesign?.id === design.id
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{design.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {design.placements?.length || 0} Kameras
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteDesign(design.id)
                    }}
                    className="px-2 py-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Grundriss löschen"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Camera Types */}
          {currentDesign && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">📷 Kameras</h2>
                <button
                  onClick={handleRefreshCameras}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition"
                  title="Kameras aus Konfigurator neu laden"
                >
                  🔄
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { type: 'dome_fixed', label: 'Dome Fixed', icon: '🎥' },
                  { type: 'dome_vario', label: 'Dome Vario', icon: '🎥' },
                  { type: 'bullet_fixed', label: 'Bullet Fixed', icon: '📹' },
                  { type: 'bullet_vario', label: 'Bullet Vario', icon: '📹' },
                  { type: 'ptz', label: 'PTZ', icon: '🔄' },
                  { type: 'thermal', label: 'Thermal', icon: '🌡️' }
                ].map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedCameraType(type)}
                    className={`w-full px-3 py-2 text-left rounded-lg transition ${
                      selectedCameraType === type
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              
              {/* Product Search */}
              <div className="mt-4">
                <button
                  onClick={() => setProductSearchOpen(!productSearchOpen)}
                  className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition text-sm"
                >
                  🔍 Produkt aus Datenbank hinzufügen
                </button>
                
                {productSearchOpen && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Suche nach Name, SKU, Hersteller..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                    
                    <div className="max-h-64 overflow-y-auto space-y-1 bg-gray-50 rounded-lg p-2">
                      {availableProducts
                        .filter(p => {
                          if (!productSearchQuery) return true
                          const query = productSearchQuery.toLowerCase()
                          return (
                            p.products?.name?.toLowerCase().includes(query) ||
                            p.products?.sku?.toLowerCase().includes(query) ||
                            p.products?.manufacturer?.toLowerCase().includes(query)
                          )
                        })
                        .slice(0, 20)
                        .map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleAddProductToCanvas(product)}
                            className="w-full px-2 py-2 text-left hover:bg-white rounded border border-transparent hover:border-purple-200 transition text-sm"
                          >
                            <div className="font-medium text-gray-900 text-xs">
                              {product.products?.name || 'Unbekannt'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.products?.manufacturer} • {product.products?.sku}
                            </div>
                            <div className="text-xs text-purple-600 mt-0.5">
                              {product.category.replace('camera_', '').replace('_', ' ')}
                            </div>
                          </button>
                        ))}
                      
                      {availableProducts.filter(p => {
                        if (!productSearchQuery) return true
                        const query = productSearchQuery.toLowerCase()
                        return (
                          p.products?.name?.toLowerCase().includes(query) ||
                          p.products?.sku?.toLowerCase().includes(query) ||
                          p.products?.manufacturer?.toLowerCase().includes(query)
                        )
                      }).length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Keine Produkte gefunden
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Placement Details */}
          {selectedPlacement && (
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3">⚙️ Kamera-Einstellungen</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedPlacement.camera_name || ''}
                    onChange={(e) => {
                      setSelectedPlacement({ ...selectedPlacement, camera_name: e.target.value })
                      handleUpdatePlacement(selectedPlacement.id, { camera_name: e.target.value })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="z.B. Eingang Haupttür"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rotation: {selectedPlacement.rotation.toFixed(0)}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selectedPlacement.rotation}
                    onChange={(e) => {
                      const rotation = parseFloat(e.target.value)
                      setSelectedPlacement({ ...selectedPlacement, rotation })
                      handleUpdatePlacement(selectedPlacement.id, { rotation })
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detection Range: {selectedPlacement.detection_range_m}m
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={selectedPlacement.detection_range_m}
                    onChange={(e) => {
                      const detection_range_m = parseFloat(e.target.value)
                      setSelectedPlacement({ ...selectedPlacement, detection_range_m })
                      handleUpdatePlacement(selectedPlacement.id, { detection_range_m })
                    }}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => handleDeletePlacement(selectedPlacement.id)}
                  className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                >
                  🗑️ Kamera löschen
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 bg-gray-100 p-6 overflow-auto">
          {!currentDesign ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-xl mb-2">📐 Kein Grundriss ausgewählt</p>
                <p className="text-sm">Erstelle einen neuen Grundriss oder wähle einen aus der Liste</p>
              </div>
            </div>
          ) : !currentDesign.image_url ? (
            <div
              {...getRootProps()}
              className={`h-full flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center p-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? '📁 Loslassen zum Hochladen' : '📁 Grundriss hochladen'}
                </p>
                <p className="text-sm text-gray-600">
                  Ziehe eine Bilddatei hierher oder klicke zum Auswählen
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG, GIF (max. 10MB)
                </p>
              </div>
            </div>
          ) : (
            <SystemDesignerCanvas
              design={currentDesign}
              selectedCameraType={selectedCameraType}
              selectedPlacement={selectedPlacement}
              onSelectPlacement={setSelectedPlacement}
              onAddCamera={handleAddCamera}
              onUpdatePlacement={handleUpdatePlacement}
            />
          )}
        </main>
      </div>
    </div>
  )
}
