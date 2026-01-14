import React, { useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text } from 'react-konva'
import useImage from 'use-image'
import { SystemDesign, CameraPlacement } from '../types'

interface CanvasProps {
  design: SystemDesign
  selectedCameraType: string | null
  selectedPlacement: CameraPlacement | null
  onSelectPlacement: (placement: CameraPlacement | null) => void
  onAddCamera: (x: number, y: number) => void
  onUpdatePlacement: (id: string, updates: Partial<CameraPlacement>) => void
}

export default function SystemDesignerCanvas({
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
