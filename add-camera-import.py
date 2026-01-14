#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Add camera import from configurator + icons + labels to System Designer
"""

import subprocess

# Get current [projectId].tsx
result = subprocess.run(
    ['git', 'show', 'HEAD:pages/system-designer/[projectId].tsx'],
    capture_output=True,
    text=True,
    encoding='utf-8',
    cwd=r'C:\Users\Rico\Documents\SalesSupportCCTV'
)

if result.returncode != 0:
    print(f"Error: {result.stderr}")
    exit(1)

content = result.stdout

# Find the loadData function and add camera import logic
old_load = '''        // Load Designs
        const designsRes = await fetch(`/api/system-designer/designs?project_id=${projectId}`)
        if (designsRes.ok) {
          const designsData = await designsRes.json()
          setDesigns(designsData.designs || [])
          
          // Select first design if exists
          if (designsData.designs && designsData.designs.length > 0) {
            setCurrentDesign(designsData.designs[0])
          }
        }'''

new_load = '''        // Load Designs
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
        }'''

content = content.replace(old_load, new_load)

# Add importCamerasFromConfigurator function after handleDeleteDesign
import_function = '''
  // Import cameras from configurator
  const importCamerasFromConfigurator = async (project: Project, designId: string) => {
    if (!project.sites || project.sites.length === 0) return
    
    try {
      const allCameras: any[] = []
      let cameraIndex = 0
      
      // Collect all cameras from all sites
      project.sites.forEach((site: any, siteIdx: number) => {
        const cameras = site.cameras_config || {}
        
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
        
        // Create placement via API
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
        }
      }
      
      console.log(`Imported ${allCameras.length} cameras from configurator`)
    } catch (error) {
      console.error('Error importing cameras:', error)
    }
  }'''

# Find handleDeleteDesign and insert after it
lines = content.split('\n')
insert_index = None
for i, line in enumerate(lines):
    if 'const handleDeleteDesign = async' in line:
        brace_count = 0
        for j in range(i, len(lines)):
            if '{' in lines[j]:
                brace_count += 1
            if '}' in lines[j]:
                brace_count -= 1
                if brace_count == 0:
                    insert_index = j + 1
                    break
        break

if insert_index:
    lines.insert(insert_index, import_function)
    content = '\n'.join(lines)

# Write updated file
with open(r'pages\system-designer\[projectId].tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("SUCCESS: Updated [projectId].tsx")
print("  - Added importCamerasFromConfigurator function")
print("  - Auto-import cameras on first design load")

# Now update SystemDesignerCanvas.tsx for icons
result2 = subprocess.run(
    ['git', 'show', 'HEAD:components/SystemDesignerCanvas.tsx'],
    capture_output=True,
    text=True,
    encoding='utf-8',
    cwd=r'C:\Users\Rico\Documents\SalesSupportCCTV'
)

if result2.returncode == 0:
    canvas = result2.stdout
    
    # Replace Circle with Text for icon
    old_camera = '''              {/* Camera Icon */}
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
              )}'''
    
    # Get icon based on camera type
    camera_icons = {
        'dome_fixed': '🎥',
        'dome_vario': '🎥',
        'bullet_fixed': '📹',
        'bullet_vario': '📹',
        'ptz': '🔄',
        'thermal': '🌡️'
    }
    
    new_camera = '''              {/* Camera Icon */}
              <Text
                x={placement.position_x - 12}
                y={placement.position_y - 12}
                text={placement.camera_type === 'dome_fixed' || placement.camera_type === 'dome_vario' ? '🎥' : 
                      placement.camera_type === 'bullet_fixed' || placement.camera_type === 'bullet_vario' ? '📹' :
                      placement.camera_type === 'ptz' ? '🔄' : '🌡️'}
                fontSize={24}
                draggable
                onClick={() => handleCameraClick(placement)}
                onDragEnd={(e) => handleCameraDragEnd(placement, e)}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.5}
                fill={selectedPlacement?.id === placement.id ? '#3b82f6' : '#000000'}
              />

              {/* Camera Name Label */}
              {placement.camera_name && (
                <Text
                  x={placement.position_x - 40}
                  y={placement.position_y + 20}
                  text={placement.camera_name}
                  fontSize={11}
                  fill="#1f2937"
                  fontStyle="bold"
                  listening={false}
                  align="center"
                  width={80}
                />
              )}'''
    
    canvas = canvas.replace(old_camera, new_camera)
    
    with open(r'components\SystemDesignerCanvas.tsx', 'w', encoding='utf-8', newline='\n') as f:
        f.write(canvas)
    
    print("SUCCESS: Updated SystemDesignerCanvas.tsx")
    print("  - Replaced circles with emoji icons")
    print("  - Added camera name labels below icons")
    print("  - Icons: 🎥 Dome, 📹 Bullet, 🔄 PTZ, 🌡️ Thermal")

print("\nNext steps:")
print("  git add -A")
print("  git commit -m 'feat(system-designer): Import cameras from configurator + icons'")
print("  git push origin main")
