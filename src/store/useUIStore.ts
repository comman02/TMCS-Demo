import { create } from 'zustand'
import { temporal } from 'zundo'

export const generateId = () => Math.random().toString(36).substr(2, 9)

export interface CanvasObject {
    id: string
    name: string
    parentId?: string // For grouping
    layerId?: string // Associated Floor/Layer ID
    type: string
    x: number
    y: number
    z?: number // Elevation/Height off floor
    width?: number
    height?: number
    depth?: number // size Z (3D Height)
    opacity?: number // value 0-1
    fill?: string
    radius?: number // for circle
    draggable?: boolean
    text?: string
    fontSize?: number
    rotation?: number
    textColor?: string
    showLabel?: boolean
    metadata?: Record<string, any> // Type-specific properties
    fontFamily?: string
    subLayer?: 'bottom' | 'top' // View mode: Bottom (Floor) vs Top (Ceiling)
}

export interface CanvasLink {
    id: string
    from: string
    to: string
    color: string
}

export interface FabLayer {
    uid: string // Stable internal ID for React keys
    id: string
    name: string
    type?: 'common' | 'floor' // 'common' is the shared default layer
    order: number
    height: number
    gridCountX: number
    gridCountY: number
}

interface UIState {
    isSidebarOpen: boolean
    toggleSidebar: () => void

    // Fab Settings
    gridConfig: { size: number; unit: 'mm' | 'cm' | 'm' | 'km' }
    layers: FabLayer[]
    activeLayerId: string
    viewMode: 'bottom' | 'top' // New View Mode for Floor vs Ceiling

    canvasObjects: CanvasObject[]
    canvasLinks: CanvasLink[]
    activeTool: 'select' | 'hand' | 'connect' | string
    selectedIds: string[]

    // Actions
    setActiveTool: (tool: string) => void
    setCanvasObjects: (objects: CanvasObject[]) => void
    addCanvasObject: (object: CanvasObject) => void
    updateCanvasObject: (id: string, updates: Partial<CanvasObject>) => void
    removeCanvasObject: (id: string) => void

    // Fab / Layer Actions
    setGridConfig: (config: Partial<{ size: number; unit: 'mm' | 'cm' | 'm' | 'km' }>) => void
    addLayer: (name: string) => void
    updateLayer: (id: string, updates: Partial<FabLayer>) => void
    removeLayer: (id: string) => void
    renameLayer: (oldId: string, newId: string) => void
    setActiveLayerId: (id: string) => void
    setViewMode: (mode: 'bottom' | 'top') => void

    // Selection
    selectObject: (id: string | null) => void
    toggleSelection: (id: string) => void
    setSelection: (ids: string[]) => void
    clearSelection: () => void

    // Alignment
    alignObjects: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void

    // Grouping
    groupObjects: (ids: string[]) => void
    ungroupObjects: (groupId: string) => void

    // Links
    addLink: (link: CanvasLink) => void
    updateLink: (id: string, updates: Partial<CanvasLink>) => void
    removeLink: (id: string) => void

    // Clipboard
    clipboard: CanvasObject[]
    copyObjects: () => void
    pasteObjects: () => void
    renameCanvasObject: (oldId: string, newId: string) => void

    // Asset Library
    assets: AssetPreset[]
    activeAssetId: string | null
    setActiveAssetId: (id: string | null) => void
    addAssetPreset: (type: string, name: string) => void
    updateAssetPreset: (id: string, updates: Partial<AssetPreset>) => void
    removeAssetPreset: (id: string) => void
}

export interface AssetPreset {
    id: string
    name: string
    type: string
    metadata?: Record<string, any>
}

export const useUIStore = create<UIState>()(
    temporal(
        (set, get) => ({
            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

            // Initial Fab State
            gridConfig: { size: 500, unit: 'mm' },
            layers: [
                { uid: 'sys-default', id: 'default', name: 'Default', type: 'common', order: -1, height: 4000, gridCountX: 60, gridCountY: 40 },
                { uid: 'sys-1f', id: '1f', name: '1F', type: 'floor', order: 0, height: 4000, gridCountX: 60, gridCountY: 40 }
            ],
            activeLayerId: '1f',
            viewMode: 'bottom',

            canvasObjects: [],
            canvasLinks: [],
            activeTool: 'select',
            selectedIds: [],

            setGridConfig: (config) => set((state) => ({
                gridConfig: { ...state.gridConfig, ...config }
            })),
            addLayer: (name) => set((state) => {
                const newLayerId = `${name}_${Math.random().toString(36).substr(2, 9)}`

                // Find Common/Default Layer to inherit settings
                const commonLayer = state.layers.find(l => l.type === 'common')

                // Default values fallback
                const initialHeight = commonLayer ? commonLayer.height : 4000
                const initialGridX = commonLayer ? commonLayer.gridCountX : 60
                const initialGridY = commonLayer ? commonLayer.gridCountY : 40

                const newLayer: FabLayer = {
                    uid: Math.random().toString(36).substr(2, 9),
                    id: newLayerId,
                    name,
                    type: 'floor',
                    order: state.layers.length,
                    height: initialHeight,
                    gridCountX: initialGridX,
                    gridCountY: initialGridY
                }

                // CLONE Objects from Common Layer
                const sourceLayerId = commonLayer ? commonLayer.id : 'default'
                const defaultObjects = state.canvasObjects.filter(obj => obj.layerId === sourceLayerId)

                const clonedObjects = defaultObjects.map(obj => ({
                    ...obj,
                    id: `${obj.type}_${Math.random().toString(36).substr(2, 9)}`, // New Unique ID
                    layerId: newLayerId // Assign to new layer
                }))

                return {
                    layers: [...state.layers, newLayer],
                    canvasObjects: [...state.canvasObjects, ...clonedObjects]
                }
            }),
            updateLayer: (id, updates) => set((state) => ({
                layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l)
            })),
            removeLayer: (id) => set((state) => {
                const layerToRemove = state.layers.find(l => l.id === id)
                if (layerToRemove?.type === 'common') return {} // Prevent removing default layer

                const newLayers = state.layers.filter(l => l.id !== id)
                // If active layer is removed, switch to another one (e.g., first one that is NOT the removed one)
                let newActiveId = state.activeLayerId
                if (id === state.activeLayerId) {
                    newActiveId = newLayers.length > 0 ? newLayers[0].id : ''
                }
                return {
                    layers: newLayers,
                    activeLayerId: newActiveId,
                    // For safety, let's cascade delete objects on this layer.
                    canvasObjects: state.canvasObjects.filter(o => o.layerId !== id)
                }
            }),

            renameLayer: (oldId, newId) => set((state) => {
                if (!newId || state.layers.some(l => l.id === newId)) return {} // Collision or empty check

                // 1. Update Layers
                const newLayers = state.layers.map(l => l.id === oldId ? { ...l, id: newId } : l)

                // 2. Update Active Layer ID
                const newActiveId = state.activeLayerId === oldId ? newId : state.activeLayerId

                // 3. Update Objects
                const newObjects = state.canvasObjects.map(obj =>
                    obj.layerId === oldId ? { ...obj, layerId: newId } : obj
                )

                return {
                    layers: newLayers,
                    activeLayerId: newActiveId,
                    canvasObjects: newObjects
                }
            }),

            setActiveLayerId: (id) => set({ activeLayerId: id, selectedIds: [] }), // Clear selection when switching floors
            setViewMode: (mode) => set({ viewMode: mode }),

            setActiveTool: (tool) => set({ activeTool: tool }),

            setCanvasObjects: (objects) => set({ canvasObjects: objects, canvasLinks: [] }),

            addCanvasObject: (object) => {
                set((state) => ({
                    canvasObjects: [...state.canvasObjects, { ...object, layerId: object.layerId || state.activeLayerId }]
                }))
            },

            updateCanvasObject: (id, updates) => {
                set((state) => ({
                    canvasObjects: state.canvasObjects.map((obj) =>
                        obj.id === id ? { ...obj, ...updates } : obj
                    ),
                }))
            },

            removeCanvasObject: (id) => {
                set((state) => {
                    // Start with removing the object itself
                    let objectsToRemove = [id]

                    // If it's a group, remove children too? Or just ungroup?
                    // Let's remove children for now.
                    const children = state.canvasObjects.filter(o => o.parentId === id)
                    children.forEach(c => objectsToRemove.push(c.id))

                    // Also remove any links connected to these objects
                    const remainingLinks = state.canvasLinks.filter(
                        (link) => !objectsToRemove.includes(link.from) && !objectsToRemove.includes(link.to)
                    )

                    const newObjects = state.canvasObjects.filter(o => !objectsToRemove.includes(o.id))
                    const newSelectedIds = state.selectedIds.filter(sid => !objectsToRemove.includes(sid))

                    return {
                        canvasObjects: newObjects,
                        canvasLinks: remainingLinks,
                        selectedIds: newSelectedIds
                    }
                })
            },

            selectObject: (id) => set({ selectedIds: id ? [id] : [] }),

            toggleSelection: (id) => set((state) => {
                const isSelected = state.selectedIds.includes(id)
                if (isSelected) {
                    return { selectedIds: state.selectedIds.filter(sid => sid !== id) }
                } else {
                    return { selectedIds: [...state.selectedIds, id] }
                }
            }),

            setSelection: (ids) => set({ selectedIds: ids, activeAssetId: null }), // Clear asset selection when selecting canvas objects
            clearSelection: () => set({ selectedIds: [] }),

            // Asset Library
            activeAssetId: null,
            setActiveAssetId: (id) => set({ activeAssetId: id, selectedIds: [] }), // Clear canvas selection

            assets: [
                { id: 'agv_std', name: 'AGV Standard', type: 'agv' },
                { id: 'amr_std', name: 'AMR Standard', type: 'amr' },
                { id: 'oht_std', name: 'OHT Standard', type: 'oht' },
                { id: 'oht_rail_std', name: 'OHT Rail Standard', type: 'rail' },
                { id: 'lifter_std', name: 'Lifter Standard', type: 'lifter' },
                { id: 'eq_std', name: 'Equipment Standard', type: 'equipment' },
                { id: 'crane_std', name: 'Crane Standard', type: 'crane' },
                { id: 'port_std', name: 'Port Standard', type: 'port' },
                { id: 'buffer_std', name: 'Buffer Standard', type: 'buffer' },
                { id: 'charger_std', name: 'Charger Standard', type: 'charger' },
                { id: 'cv_std', name: 'Conveyor Standard', type: 'conveyor' },
                { id: 'stocker_l', name: 'Stocker Large', type: 'stocker', metadata: { capacity: 100, zoneId: 'Z-01' } },
                { id: 'rack_std', name: 'Rack Standard', type: 'rack' },
                { id: 'wall_std', name: 'Wall Standard', type: 'wall' },
                { id: 'pillar_std', name: 'Pillar Standard', type: 'pillar' }
            ],

            addAssetPreset: (type, name) => set((state) => ({
                assets: [...state.assets, {
                    id: `${type}_${Math.random().toString(36).substr(2, 6)}`,
                    name,
                    type,
                    metadata: {}
                }]
            })),

            updateAssetPreset: (id, updates) => set((state) => ({
                assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a)
            })),

            removeAssetPreset: (id) => set((state) => ({
                assets: state.assets.filter(a => a.id !== id),
                activeAssetId: state.activeAssetId === id ? null : state.activeAssetId
            })),

            alignObjects: (type) => {
                const state = get()
                const selectedIds = state.selectedIds
                if (selectedIds.length < 2) return

                const objectsToAlign = state.canvasObjects.filter(obj => selectedIds.includes(obj.id))
                if (objectsToAlign.length === 0) return

                // Calculate bounding box of selection
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

                objectsToAlign.forEach(obj => {
                    minX = Math.min(minX, obj.x)
                    minY = Math.min(minY, obj.y)
                    const w = obj.width || 0
                    const h = obj.height || 0
                    maxX = Math.max(maxX, obj.x + w)
                    maxY = Math.max(maxY, obj.y + h)
                })

                const centerX = minX + (maxX - minX) / 2
                const centerY = minY + (maxY - minY) / 2

                const updatedObjects = objectsToAlign.map(obj => {
                    let newX = obj.x
                    let newY = obj.y
                    const w = obj.width || 0
                    const h = obj.height || 0

                    switch (type) {
                        case 'left':
                            newX = minX
                            break
                        case 'center': // Horizontal center
                            newX = centerX - (w / 2)
                            break
                        case 'right':
                            newX = maxX - w
                            break
                        case 'top':
                            newY = minY
                            break
                        case 'middle': // Vertical center
                            newY = centerY - (h / 2)
                            break
                        case 'bottom':
                            newY = maxY - h
                            break
                    }

                    return { ...obj, x: newX, y: newY }
                })

                set((state) => ({
                    canvasObjects: state.canvasObjects.map(obj => {
                        const updated = updatedObjects.find(u => u.id === obj.id)
                        return updated || obj
                    })
                }))
            },

            groupObjects: (ids) => {
                const state = get()
                if (ids.length < 2) return

                const objectsToGroup = state.canvasObjects.filter(obj => ids.includes(obj.id))
                if (objectsToGroup.length === 0) return

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

                objectsToGroup.forEach(obj => {
                    minX = Math.min(minX, obj.x)
                    minY = Math.min(minY, obj.y)
                    const w = obj.width || 0
                    const h = obj.height || 0
                    maxX = Math.max(maxX, obj.x + w)
                    maxY = Math.max(maxY, obj.y + h)
                })

                const groupX = minX
                const groupY = minY
                const groupWidth = maxX - minX
                const groupHeight = maxY - minY
                const groupId = `group-${Date.now()}`

                const groupObj: CanvasObject = {
                    id: groupId,
                    name: 'Group',
                    type: 'group',
                    x: groupX,
                    y: groupY,
                    width: groupWidth,
                    height: groupHeight,
                    fill: 'transparent'
                }

                const updatedChildren = objectsToGroup.map(obj => ({
                    ...obj,
                    parentId: groupId,
                    x: obj.x - groupX,
                    y: obj.y - groupY
                }))

                const otherObjects = state.canvasObjects.filter(obj => !ids.includes(obj.id))

                set({
                    canvasObjects: [...otherObjects, groupObj, ...updatedChildren],
                    selectedIds: [groupId]
                })
            },

            ungroupObjects: (groupId) => {
                const state = get()
                const group = state.canvasObjects.find(o => o.id === groupId)
                if (!group) return

                const children = state.canvasObjects.filter(o => o.parentId === groupId)

                const restoredChildren = children.map(child => ({
                    ...child,
                    parentId: undefined,
                    x: child.x + group.x,
                    y: child.y + group.y
                }))

                const otherObjects = state.canvasObjects.filter(o => o.id !== groupId && o.parentId !== groupId)

                set({
                    canvasObjects: [...otherObjects, ...restoredChildren],
                    selectedIds: restoredChildren.map(c => c.id)
                })
            },

            addLink: (link) => set((state) => ({ canvasLinks: [...state.canvasLinks, link] })),

            updateLink: (id, updates) => set((state) => ({
                canvasLinks: state.canvasLinks.map(l => l.id === id ? { ...l, ...updates } : l)
            })),

            removeLink: (id) => set((state) => ({
                canvasLinks: state.canvasLinks.filter(l => l.id !== id)
            })),

            clipboard: [],

            copyObjects: () => set((state) => {
                const selected = state.canvasObjects.filter(obj => state.selectedIds.includes(obj.id))
                return { clipboard: selected }
            }),

            pasteObjects: () => set((state) => {
                if (state.clipboard.length === 0) return {}

                const newObjects = state.clipboard.map(obj => ({
                    ...obj,
                    id: Math.random().toString(36).substr(2, 9),
                    x: obj.x + 20,
                    y: obj.y + 20,
                    parentId: undefined, // Don't paste group structure blindly for now
                    layerId: state.activeLayerId // Paste into current layer
                }))

                return {
                    canvasObjects: [...state.canvasObjects, ...newObjects],
                    selectedIds: newObjects.map(o => o.id)
                }
            }),

            renameCanvasObject: (oldId, newId) => set((state) => {
                if (state.canvasObjects.some(obj => obj.id === newId)) return {}

                // 1. Update Object ID
                const updatedObjects = state.canvasObjects.map(obj =>
                    obj.id === oldId ? { ...obj, id: newId } : obj
                )

                // 2. Update Links (from/to)
                const updatedLinks = state.canvasLinks.map(link => ({
                    ...link,
                    from: link.from === oldId ? newId : link.from,
                    to: link.to === oldId ? newId : link.to
                }))

                // 3. Update Selection
                const updatedSelection = state.selectedIds.map(id =>
                    id === oldId ? newId : id
                )

                return {
                    canvasObjects: updatedObjects,
                    canvasLinks: updatedLinks,
                    selectedIds: updatedSelection
                }
            }),
        }),
        {
            limit: 100,
            partialize: (state) => ({
                canvasObjects: state.canvasObjects,
                canvasLinks: state.canvasLinks,
            })
        }
    )
)

export const useTemporalStore = () => useUIStore.temporal
