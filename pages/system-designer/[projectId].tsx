import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text } from 'react-konva'
import { useDropzone } from 'react-dropzone'
import useImage from 'use-image'
import { SystemDesign, CameraPlacement, Project } from '@/types'

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
  const [saving, setSaving] = useState(false)

  // Canvas State
  const [stageSize, setStageSize] = useState({ width: 1000, height: 800 })
  const [selectedCameraType, setSelectedCameraType] = useState<string | null>(null)
  const [selectedPlacement, setSelectedPlacement] = useState<CameraPlacement | null>(null)

  // Load Project & Designs
  useEffect(() => {
    if (!projectId) return
    
    const loadData = async () => {
      try {
        // Load Project
        const projRes = await fetch(`/api/projects/${projectId}`)
        if (projRes.ok) {
          const projData = await projRes.json()
          setProject(projData)
        }

        // Load Designs
        const designsRes = await fetch(`/api/system-designer/designs?project_id=${projectId}`)
        if (designsRes.ok) {
          const designsData = await designsRes.json()
          setDesigns(designsData.designs || [])
          
          // Select first design if exists
          if (designsData.designs && designsData.designs.length > 0) {
            setCurrentDesign(designsData.designs[0])
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
        setDesigns(prev => [data.design, ...prev])
        setCurrentDesign(data.design)
      }
    } catch (error) {
      console.error('Error creating design:', error)
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

  if (loading) {
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
                <button
                  key={design.id}
                  onClick={() => setCurrentDesign(design)}
                  className={`w-full px-3 py-2 text-left rounded-lg transition ${
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
              ))}
            </div>
          </div>

          {/* Camera Types */}
          {currentDesign && (
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold mb-3">📷 Kameras</h2>
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

// ============================================
// CANVAS COMPONENT
// ============================================
interface CanvasProps {
  design: SystemDesign
  selectedCameraType: string | null
  selectedPlacement: CameraPlacement | null
  onSelectPlacement: (placement: CameraPlacement | null) => void
  onAddCamera: (x: number, y: number) => void
  onUpdatePlacement: (id: string, updates: Partial<CameraPlacement>) => void
}

function SystemDesignerCanvas({
  design,
  selectedCameraType,
  selectedPlacement,
  onSelectPlacement,
  onAddCamera,
  onUpdatePlacement
}: CanvasProps) {
  const [image] = useImage(design.image_url || '')
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 })

  // Calculate scaled image size
  const imageSize = image
    ? (() => {
        const maxWidth = stageSize.width - 40
        const maxHeight = stageSize.height - 40
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
        return {
          width: image.width * scale,
          height: image.height * scale,
          scale
        }
      })()
    : null

  const handleStageClick = (e: any) => {
    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()

    // Check if clicked on stage (not on a shape)
    if (e.target === stage) {
      if (selectedCameraType) {
        // Add new camera
        onAddCamera(pointerPos.x, pointerPos.y)
      } else {
        // Deselect
        onSelectPlacement(null)
      }
    }
  }

  const handleCameraClick = (placement: CameraPlacement) => {
    onSelectPlacement(placement)
  }

  const handleCameraDragEnd = (placement: CameraPlacement, e: any) => {
    const pos = e.target.position()
    onUpdatePlacement(placement.id, {
      position_x: pos.x,
      position_y: pos.y
    })
  }

  // Calculate Detection Cone Points
  const getDetectionConePoints = (placement: CameraPlacement, scale: number = 1): number[] => {
    const { position_x, position_y, rotation, field_of_view, detection_range_m } = placement
    const rangePixels = detection_range_m * (design.scale_pixels_per_meter / 100) * scale

    // Convert rotation to radians
    const angleRad = (rotation * Math.PI) / 180
    const fovRad = (field_of_view * Math.PI) / 180

    // Calculate cone points
    const leftAngle = angleRad - fovRad / 2
    const rightAngle = angleRad + fovRad / 2

    const leftX = position_x + Math.cos(leftAngle) * rangePixels
    const leftY = position_y + Math.sin(leftAngle) * rangePixels
    const rightX = position_x + Math.cos(rightAngle) * rangePixels
    const rightY = position_y + Math.sin(rightAngle) * rangePixels

    return [
      position_x, position_y,
      leftX, leftY,
      rightX, rightY,
      position_x, position_y
    ]
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onClick={handleStageClick}
        className="border border-gray-200 rounded"
      >
        <Layer>
          {/* Floor Plan Image */}
          {image && imageSize && (
            <KonvaImage
              image={image}
              x={20}
              y={20}
              width={imageSize.width}
              height={imageSize.height}
            />
          )}

          {/* Camera Placements */}
          {design.placements?.map(placement => (
            <React.Fragment key={placement.id}>
              {/* Detection Cone */}
              {placement.show_detection_cone && imageSize && (
                <Line
                  points={getDetectionConePoints(placement, imageSize.scale)}
                  fill={placement.cone_color}
                  opacity={placement.cone_opacity}
                  closed
                  listening={false}
                />
              )}

              {/* Camera Icon */}
              <Circle
                x={placement.position_x}
                y={placement.position_y}
                radius={12}
                fill={selectedPlacement?.id === placement.id ? '#3b82f6' : '#ef4444'}
                stroke="#ffffff"
                strokeWidth={2}
                draggable
                onClick={() => handleCameraClick(placement)}
                onDragEnd={(e) => handleCameraDragEnd(placement, e)}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.3}
              />

              {/* Camera Name */}
              {placement.camera_name && (
                <Text
                  x={placement.position_x + 15}
                  y={placement.position_y - 10}
                  text={placement.camera_name}
                  fontSize={12}
                  fill="#1f2937"
                  listening={false}
                />
              )}
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
