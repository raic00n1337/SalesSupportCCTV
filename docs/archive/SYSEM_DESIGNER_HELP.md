# Cursor: Rebuild System Designer towards CCTVDesignTool parity (structured plan)

We already have a Konva-based MVP (multi-floor, placements, auto-import). 
Now refactor towards a professional architecture inspired by CCTVDesignTool.

## Non-negotiable goals
1) Add scale calibration (2-point measure -> pixels_per_meter)
2) Add Layers panel to toggle visibility: Images, Devices, FOV, Walls, Connections, Labels
3) Replace "detection circle" with real Camera FOV wedge + optional DORI zones
4) Add Camera sidebar properties: rotation, mount/view angle, display range limit, varifocal zoom slider
5) Add Export: PDF/JPG of selected floors with selected layers

## Data model (Supabase)
Refactor DB to support general objects and connections:
- design_floors (per project, multi-floor with scale + view state)
- design_objects (camera/device/wall/label/shape/measurement) with properties jsonb
- design_connections (from,to,type,points)
- optional: design_networks + design_ip_allocations

## Implementation constraints
- Keep Next.js + react-konva
- Avoid SSR for Konva components
- No aggressive reload/visibility hacks
- Provide clear separation: Canvas engine vs. UI panels vs. persistence layer

## Deliverables
- Migrations SQL for new tables (Supabase)
- Typescript types
- Refactored components:
  - SystemDesignerPage
  - CanvasStage (pan/zoom, tool modes)
  - LayersPanel
  - PropertiesSidebar (camera tab with FOV/DORI)
  - ExportPanel (pdf/jpg)
- Minimal UI that matches existing app styling
