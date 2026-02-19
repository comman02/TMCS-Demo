import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { Factory as FactoryIcon, Layers, Hash, Move, Maximize, Palette, Type, Trash2, ArrowRightLeft, Group as GroupIcon, Ungroup, AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, AlignVerticalJustifyCenter, ArrowDownToLine, Pin, PinOff, Grid3X3, Image as ImageIcon, Box } from 'lucide-react'

const PROPERTY_SCHEMAS: Record<string, { label: string, key: string, type: 'text' | 'number' | 'select', options?: string[] }[]> = {
    agv: [
        { label: 'Max Speed (m/s)', key: 'speed', type: 'number' },
        { label: 'Battery (%)', key: 'battery', type: 'number' },
        { label: 'Status', key: 'status', type: 'select', options: ['Idle', 'Moving', 'Charging', 'Error'] }
    ],
    amr: [
        { label: 'Max Speed (m/s)', key: 'speed', type: 'number' },
        { label: 'Payload (kg)', key: 'payload', type: 'number' }
    ],
    conveyor: [
        { label: 'Speed (m/min)', key: 'speed', type: 'number' },
        { label: 'Direction', key: 'direction', type: 'select', options: ['Forward', 'Backward', 'Bi-directional'] }
    ],
    stocker: [
        { label: 'Capacity', key: 'capacity', type: 'number' },
        { label: 'Zone ID', key: 'zoneId', type: 'text' }
    ],
    buffer: [
        { label: 'Capacity', key: 'capacity', type: 'number' },
        { label: 'Type', key: 'type', type: 'select', options: ['Inbound', 'Outbound', 'Internal'] }
    ],
    rack: [
        { label: 'Levels', key: 'levels', type: 'number' },
        { label: 'Bays', key: 'bays', type: 'number' }
    ],
    wall: [
        { label: 'Thickness (mm)', key: 'thickness', type: 'number' },
        { label: 'Material', key: 'material', type: 'text' }
    ],
    pillar: [
        { label: 'Shape', key: 'shape', type: 'select', options: ['Rectangular', 'Circular'] }
    ],
    charger: [
        { label: 'Power (kW)', key: 'power', type: 'number' },
        { label: 'Type', key: 'type', type: 'select', options: ['Fast', 'Standard'] }
    ]
}

// Helper Component for Numeric Inputs
// Allows empty string, '-', or partial decimal inputs without resetting to 0
function NumberInput({ value, onChange, className }: { value: number, onChange: (val: number) => void, className?: string }) {
    const [localValue, setLocalValue] = useState(String(value))

    // Sync local state with prop when prop changes (and we're not potentially typing)
    // We only update if the parsed local value doesn't match the new prop value,
    // to avoid wiping out "0." or "-." while typing
    useEffect(() => {
        const parsedLocal = parseFloat(localValue)
        if (value !== parsedLocal) {
            setLocalValue(String(value))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
        setLocalValue(raw)

        // Only propagate if valid number
        if (raw === '') return // Don't propagate empty (or decide if we want to send 0?)
        if (raw === '-') return

        const parsed = parseFloat(raw)
        if (!isNaN(parsed)) {
            onChange(parsed)
        }
    }

    const handleBlur = () => {
        // On blur, force sync to formatted value or 0 if empty
        if (localValue === '' || localValue === '-') {
            onChange(0)
            setLocalValue('0')
        } else {
            const parsed = parseFloat(localValue)
            if (!isNaN(parsed)) {
                setLocalValue(String(parsed)) // Standardize format (e.g. "01" -> "1")
            }
        }
    }

    return (
        <input
            type="text" // Use text to allow "-" and empty
            className={className}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => {
                // Stop propagation? Maybe not needed for simple inputs
                if (e.key === 'Enter') handleBlur()
            }}
        />
    )
}

export function Inspector() {
    const {
        selectedIds,
        canvasObjects,
        updateCanvasObject,
        removeCanvasObject,
        groupObjects,
        ungroupObjects,
        canvasLinks,
        updateLink,
        removeLink,
        alignObjects,
        renameCanvasObject,
        gridConfig,
        setGridConfig,
        layers,
        updateLayer,
        toggleLayerVisibility,
        toggleLayerLock,
        removeLayer,
        renameLayer,
        activeAssetId,
        assets,
        updateAssetPreset,
        activeLayerId,
        cadOverlay,
        updateCadOverlay,
        cadOverlaySelected
    } = useUIStore()

    const [position, setPosition] = useState<{ x: number, y: number } | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const [isPinned, setIsPinned] = useState(false)
    const dragOffsetRef = useRef({ x: 0, y: 0 })
    const panelRef = useRef<HTMLDivElement>(null)
    const dragLimitsRef = useRef({ maxX: 0, maxY: 0 })

    // Handle Dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                let newX = e.clientX - dragOffsetRef.current.x
                let newY = e.clientY - dragOffsetRef.current.y

                // Clamp to window bounds
                newX = Math.max(0, Math.min(newX, dragLimitsRef.current.maxX))
                newY = Math.max(0, Math.min(newY, dragLimitsRef.current.maxY))

                setPosition({ x: newX, y: newY })
            }
        }
        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isPinned) return
        if (panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect()
            dragOffsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            }
            dragLimitsRef.current = {
                maxX: window.innerWidth - rect.width,
                maxY: window.innerHeight - rect.height
            }

            // If first time dragging, set initial position to current styles
            if (!position) {
                setPosition({ x: rect.left, y: rect.top })
            }
            setIsDragging(true)
        }
    }

    // For simplicity in Phase 4, if multiple objects are selected, just show "Multiple Selected"
    // or picking the first one for now. Ideal is multi-edit.
    // Let's implement single edit first, and a multi-select info screen.

    const isMultiSelect = selectedIds.length > 1
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null

    const selectedObject = selectedId ? (canvasObjects.find(o => o.id === selectedId) || null) : null
    const selectedLink = (!selectedObject && selectedId) ? (canvasLinks.find(l => l.id === selectedId) || null) : null

    // Helper for unit conversion
    const toDisplay = (val: number) => {
        switch (gridConfig.unit) {
            case 'cm': return Number((val / 10).toFixed(2))
            case 'm': return Number((val / 1000).toFixed(3))
            case 'km': return Number((val / 1000000).toFixed(6))
            default: return Number(val.toFixed(1)) // mm
        }
    }

    const fromDisplay = (val: number) => {
        switch (gridConfig.unit) {
            case 'cm': return val * 10
            case 'm': return val * 1000
            case 'km': return val * 1000000
            default: return val
        }
    }

    // Handlers
    const handleChange = (key: string, value: unknown) => {
        if (selectedId) updateCanvasObject(selectedId, { [key]: value })
    }

    // --- Render Content Logic ---
    let headerContent = null
    let bodyContent = null
    let footerContent = null

    if (isMultiSelect) {
        headerContent = (
            <div className="flex items-center gap-2">
                <Hash size={20} className="text-blue-500" />
                <span className="font-medium">{selectedIds.length} objects selected</span>
            </div>
        )
        bodyContent = (
            <div className="space-y-6">
                {/* Alignment Tools */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Alignment</label>
                    <div className="grid grid-cols-6 gap-1 mb-2">
                        <button onClick={() => alignObjects('left')} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors" title="Align Left">
                            <AlignLeft size={16} />
                        </button>
                        <button onClick={() => alignObjects('center')} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors" title="Align Center (Horizontal)">
                            <AlignCenter size={16} />
                        </button>
                        <button onClick={() => alignObjects('right')} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors" title="Align Right">
                            <AlignRight size={16} />
                        </button>
                        <button onClick={() => alignObjects('top')} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors" title="Align Top">
                            <ArrowUpToLine size={16} />
                        </button>
                        <button onClick={() => alignObjects('middle')} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors" title="Align Middle (Vertical)">
                            <AlignVerticalJustifyCenter size={16} />
                        </button>
                        <button onClick={() => alignObjects('bottom')} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors" title="Align Bottom">
                            <ArrowDownToLine size={16} />
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={() => groupObjects(selectedIds)}
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md flex items-center justify-center gap-2 transition-colors text-sm font-medium border border-gray-100"
                    >
                        <GroupIcon size={16} /> Group Objects
                    </button>
                    <button
                        onClick={() => { selectedIds.forEach(id => removeCanvasObject(id)) }}
                        className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                    >
                        <Trash2 size={16} /> Delete Selected
                    </button>
                </div>
            </div>
        )
    } else if (selectedLink) {
        headerContent = (
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    <ArrowRightLeft size={16} />
                    <span className="font-semibold text-sm text-gray-900">Link Properties</span>
                </div>
                <span className="text-xs font-mono text-gray-400">{selectedLink.id.slice(0, 4)}</span>
            </div>
        )
        bodyContent = (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Palette size={12} /> Style
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-500">Color</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                            value={selectedLink.color}
                            onChange={(e) => updateLink(selectedLink.id, { color: e.target.value })}
                        />
                        <input
                            type="text"
                            className="flex-1 px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                            value={selectedLink.color}
                            onChange={(e) => updateLink(selectedLink.id, { color: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        )
        footerContent = (
            <button
                onClick={() => removeLink(selectedLink.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-medium"
            >
                <Trash2 size={16} /> Delete Link
            </button>
        )
    } else if (selectedObject) {
        headerContent = (
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    {selectedObject.type === 'rect' && <Maximize size={16} />}
                    {selectedObject.type === 'circle' && <Maximize size={16} className="rounded-full" />}
                    {selectedObject.type === 'text' && <Type size={16} />}
                    {selectedObject.type === 'group' && <GroupIcon size={16} />}
                    <span className="capitalize font-semibold text-sm text-gray-900">{selectedObject.type} Properties</span>
                </div>
                <span className="text-xs font-mono text-gray-400">{selectedObject.id.slice(0, 4)}</span>
            </div>
        )
        bodyContent = (
            <div className="space-y-5">
                {selectedObject.type === 'group' && (
                    <div className="pb-0">
                        <button
                            onClick={() => ungroupObjects(selectedObject.id)}
                            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                        >
                            <Ungroup size={16} /> Ungroup
                        </button>
                    </div>
                )}

                {/* Identity Group */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Hash size={12} /> Identity
                    </div>
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={selectedObject.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">ID (Unique)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                value={selectedObject.id}
                                onChange={(e) => renameCanvasObject(selectedObject.id, e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Position Group */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Move size={12} /> Position ({gridConfig.unit})
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">X</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                value={toDisplay(selectedObject.x)}
                                onChange={(val) => handleChange('x', fromDisplay(val))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Y</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                value={toDisplay(selectedObject.y)}
                                onChange={(val) => handleChange('y', fromDisplay(val))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Elevation (Z)</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                value={toDisplay(selectedObject.z || 0)}
                                onChange={(val) => handleChange('z', fromDisplay(val))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Rotation (°)</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                value={selectedObject.rotation || 0}
                                onChange={(val) => handleChange('rotation', val)}
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Dimensions Group - 3D Size */}
                {(selectedObject.width !== undefined) && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Maximize size={12} /> Size ({gridConfig.unit})
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Width (W)</label>
                                <NumberInput
                                    className="w-full px-2 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                    value={toDisplay(selectedObject.width)}
                                    onChange={(val) => handleChange('width', fromDisplay(val))}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Length (L)</label>
                                <NumberInput
                                    className="w-full px-2 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                    value={toDisplay(selectedObject.height!)}
                                    onChange={(val) => handleChange('height', fromDisplay(val))}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Height (H)</label>
                                <NumberInput
                                    className="w-full px-2 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                    value={toDisplay(selectedObject.depth || 0)}
                                    onChange={(val) => handleChange('depth', fromDisplay(val))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-px bg-gray-100" />

                {/* Type-Specific Properties */}
                {(() => {
                    const schema = PROPERTY_SCHEMAS[selectedObject.type]
                    if (!schema) return null

                    return (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <AlignLeft size={12} /> {selectedObject.type} Config
                            </div>
                            <div className="space-y-3 bg-gray-50 p-3 rounded-md border border-gray-100">
                                {schema.map((field) => (
                                    <div key={field.key} className="space-y-1">
                                        <label className="text-xs text-gray-500">{field.label}</label>
                                        {field.type === 'select' ? (
                                            <select
                                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                                value={(selectedObject.metadata?.[field.key] as string) || ''}
                                                onChange={(e) => {
                                                    const newMetadata = { ...selectedObject.metadata, [field.key]: e.target.value }
                                                    updateCanvasObject(selectedObject.id, { metadata: newMetadata })
                                                }}
                                            >
                                                <option value="">Select...</option>
                                                {field.options?.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'number' ? (
                                            <NumberInput
                                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                                value={(selectedObject.metadata?.[field.key] as number) || 0}
                                                onChange={(val) => {
                                                    const newMetadata = { ...selectedObject.metadata, [field.key]: val }
                                                    updateCanvasObject(selectedObject.id, { metadata: newMetadata })
                                                }}
                                            />
                                        ) : (
                                            <input
                                                type={field.type}
                                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                                value={(selectedObject.metadata?.[field.key] as string) || ''}
                                                onChange={(e) => {
                                                    const newMetadata = { ...selectedObject.metadata, [field.key]: e.target.value }
                                                    updateCanvasObject(selectedObject.id, { metadata: newMetadata })
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })()}

                <div className="h-px bg-gray-100" />

                {/* Appearance (Images) */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <ImageIcon size={12} /> Appearance
                    </div>

                    {/* 2D Image */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">2D Image (Top View)</label>
                        <div className="flex items-center gap-2">
                            {selectedObject.image2d ? (
                                <div className="relative w-10 h-10 border rounded bg-gray-50 overflow-hidden group">
                                    <img src={selectedObject.image2d} alt="2D" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => handleChange('image2d', undefined)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-10 h-10 border rounded border-dashed flex items-center justify-center bg-gray-50 text-gray-400">
                                    <ImageIcon size={16} />
                                </div>
                            )}
                            <div className="flex-1">
                                <label className="cursor-pointer text-xs bg-white border px-2 py-1.5 rounded hover:bg-gray-50 flex items-center justify-center gap-1 transition-colors">
                                    <span>Upload 2D...</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const reader = new FileReader()
                                                reader.onload = (ev) => {
                                                    handleChange('image2d', ev.target?.result as string)
                                                }
                                                reader.readAsDataURL(file)
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 3D Image (Placeholder for now) */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">3D Image (Model/Texture)</label>
                        <div className="flex items-center gap-2">
                            {selectedObject.image3d ? (
                                <div className="relative w-10 h-10 border rounded bg-gray-50 overflow-hidden group">
                                    <img src={selectedObject.image3d} alt="3D" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => handleChange('image3d', undefined)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-10 h-10 border rounded border-dashed flex items-center justify-center bg-gray-50 text-gray-400">
                                    <Box size={16} />
                                </div>
                            )}
                            <div className="flex-1">
                                <label className="cursor-pointer text-xs bg-white border px-2 py-1.5 rounded hover:bg-gray-50 flex items-center justify-center gap-1 transition-colors">
                                    <span>Upload 3D...</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const reader = new FileReader()
                                                reader.onload = (ev) => {
                                                    handleChange('image3d', ev.target?.result as string)
                                                }
                                                reader.readAsDataURL(file)
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Style & Typo */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Palette size={12} /> Style
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Fill Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                                value={selectedObject.fill || '#000000'}
                                onChange={(e) => handleChange('fill', e.target.value)}
                            />
                            <input
                                type="text"
                                className="flex-1 px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                                value={selectedObject.fill || ''}
                                onChange={(e) => handleChange('fill', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Opacity</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                className="flex-1 accent-blue-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                value={selectedObject.opacity ?? 1}
                                onChange={(e) => handleChange('opacity', Number(e.target.value))}
                            />
                            <span className="text-xs w-8 text-right font-mono text-gray-500">
                                {Math.round((selectedObject.opacity ?? 1) * 100)}%
                            </span>
                        </div>
                    </div>
                </div>

                {selectedObject.type !== 'text' && (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Type size={12} /> Label
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-500">Show Name</label>
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedObject.showLabel || false}
                                    onChange={(e) => handleChange('showLabel', e.target.checked)}
                                />
                            </div>

                            {selectedObject.showLabel && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Text Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                                                value={selectedObject.textColor || '#ffffff'}
                                                onChange={(e) => handleChange('textColor', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                                                value={selectedObject.textColor || '#ffffff'}
                                                onChange={(e) => handleChange('textColor', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Font Family</label>
                                        <select
                                            className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                            value={selectedObject.fontFamily || 'Arial'}
                                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                                        >
                                            <option value="Arial">Arial</option>
                                            <option value="Verdana">Verdana</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Courier New">Courier New</option>
                                            <option value="Georgia">Georgia</option>
                                            <option value="Impact">Impact</option>
                                            <option value="Inter">Inter</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Font Size</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={selectedObject.fontSize || 12}
                                            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {selectedObject.type === 'text' && (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Type size={12} /> Typography
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Content</label>
                            <input
                                type="text"
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={selectedObject.text}
                                onChange={(e) => handleChange('text', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Font Family</label>
                            <select
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                value={selectedObject.fontFamily || 'Arial'}
                                onChange={(e) => handleChange('fontFamily', e.target.value)}
                            >
                                <option value="Arial">Arial</option>
                                <option value="Verdana">Verdana</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Impact">Impact</option>
                                <option value="Inter">Inter</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Font Size</label>
                            <input
                                type="number"
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={selectedObject.fontSize}
                                onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                            />
                        </div>
                    </div>
                )}
            </div>
        )
        footerContent = (
            <button
                onClick={() => {
                    if (selectedId) {
                        updateCanvasObject(selectedId, { ...selectedObject })
                        removeCanvasObject(selectedId)
                    }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-medium"
            >
                <Trash2 size={16} /> Delete Object
            </button>
        )

    } else if (activeAssetId) {
        // ASSET INSPECTOR
        const selectedAsset = assets.find(a => a.id === activeAssetId)
        if (selectedAsset) {
            headerContent = (
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1 bg-green-100 rounded text-green-600">
                        <FactoryIcon size={14} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{selectedAsset.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono truncate">Asset Library Preset</span>
                    </div>
                </div>
            )

            const schema = PROPERTY_SCHEMAS[selectedAsset.type]

            bodyContent = (
                <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Preset Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={selectedAsset.name}
                                onChange={(e) => updateAssetPreset(selectedAsset.id, { name: e.target.value })}
                            />
                        </div>
                    </div>

                    {schema && (
                        <>
                            <div className="h-px bg-gray-100" />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <AlignLeft size={12} /> Default Properties
                                </div>
                                <div className="space-y-3 bg-gray-50 p-3 rounded-md border border-gray-100">
                                    {schema.map((field) => (
                                        <div key={field.key} className="space-y-1">
                                            <label className="text-xs text-gray-500">{field.label}</label>
                                            {field.type === 'select' ? (
                                                <select
                                                    className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                                    value={(selectedAsset.metadata?.[field.key] as string) || ''}
                                                    onChange={(e) => {
                                                        const newMetadata = { ...selectedAsset.metadata, [field.key]: e.target.value }
                                                        updateAssetPreset(selectedAsset.id, { metadata: newMetadata })
                                                    }}
                                                >
                                                    <option value="">Select...</option>
                                                    {field.options?.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                                    value={(selectedAsset.metadata?.[field.key] as string | number) || ''}
                                                    onChange={(e) => {
                                                        const val = field.type === 'number' ? Number(e.target.value) : e.target.value
                                                        const newMetadata = { ...selectedAsset.metadata, [field.key]: val }
                                                        updateAssetPreset(selectedAsset.id, { metadata: newMetadata })
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )
        }
    } else if (cadOverlay && cadOverlaySelected) {
        const activeLayer = layers.find(l => l.id === activeLayerId)
        const floorWidth = (activeLayer?.gridCountX || 60) * gridConfig.size
        const floorHeight = (activeLayer?.gridCountY || 40) * gridConfig.size
        const naturalWidth = cadOverlay.naturalWidth || cadOverlay.width
        const naturalHeight = cadOverlay.naturalHeight || cadOverlay.height
        const cropX = cadOverlay.cropX || 0
        const cropY = cadOverlay.cropY || 0
        const cropWidth = cadOverlay.cropWidth || naturalWidth
        const cropHeight = cadOverlay.cropHeight || naturalHeight

        const updateCrop = (updates: Partial<{ cropX: number; cropY: number; cropWidth: number; cropHeight: number }>) => {
            const nextX = updates.cropX ?? cropX
            const nextY = updates.cropY ?? cropY
            const nextW = updates.cropWidth ?? cropWidth
            const nextH = updates.cropHeight ?? cropHeight

            const clampedX = Math.max(0, Math.min(nextX, naturalWidth - 1))
            const clampedY = Math.max(0, Math.min(nextY, naturalHeight - 1))
            const clampedW = Math.max(1, Math.min(nextW, naturalWidth - clampedX))
            const clampedH = Math.max(1, Math.min(nextH, naturalHeight - clampedY))

            updateCadOverlay({
                cropX: clampedX,
                cropY: clampedY,
                cropWidth: clampedW,
                cropHeight: clampedH
            })
        }

        headerContent = (
            <div className="flex items-center gap-2">
                <ImageIcon size={16} />
                <span className="font-semibold text-sm text-gray-900">CAD Overlay</span>
            </div>
        )

        bodyContent = (
            <div className="space-y-5">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Name</label>
                        <input
                            type="text"
                            className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={cadOverlay.name}
                            onChange={(e) => updateCadOverlay({ name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Opacity</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                className="flex-1 accent-blue-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                value={cadOverlay.opacity}
                                onChange={(e) => updateCadOverlay({ opacity: Number(e.target.value) })}
                            />
                            <span className="text-xs w-8 text-right font-mono text-gray-500">
                                {Math.round(cadOverlay.opacity * 100)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Move size={12} /> Placement ({gridConfig.unit})
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">X</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={toDisplay(cadOverlay.x)}
                                onChange={(val) => updateCadOverlay({ x: fromDisplay(val) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Y</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={toDisplay(cadOverlay.y)}
                                onChange={(val) => updateCadOverlay({ y: fromDisplay(val) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Width</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={toDisplay(cadOverlay.width)}
                                onChange={(val) => updateCadOverlay({ width: Math.max(1, fromDisplay(val)) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Height</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={toDisplay(cadOverlay.height)}
                                onChange={(val) => updateCadOverlay({ height: Math.max(1, fromDisplay(val)) })}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const fitScale = Math.min(floorWidth / cropWidth, floorHeight / cropHeight) * 0.95
                            const nextWidth = cropWidth * fitScale
                            const nextHeight = cropHeight * fitScale
                            updateCadOverlay({
                                width: nextWidth,
                                height: nextHeight,
                                x: Math.max(0, (floorWidth - nextWidth) / 2),
                                y: Math.max(0, (floorHeight - nextHeight) / 2)
                            })
                        }}
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md text-sm font-medium border border-gray-100"
                    >
                        Fit To Floor
                    </button>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Maximize size={12} /> Crop (pixels)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Crop X</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={cropX}
                                onChange={(val) => updateCrop({ cropX: val })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Crop Y</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={cropY}
                                onChange={(val) => updateCrop({ cropY: val })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Crop Width</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={cropWidth}
                                onChange={(val) => updateCrop({ cropWidth: val })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Crop Height</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={cropHeight}
                                onChange={(val) => updateCrop({ cropHeight: val })}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => updateCadOverlay({
                            cropX: 0,
                            cropY: 0,
                            cropWidth: naturalWidth,
                            cropHeight: naturalHeight
                        })}
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md text-sm font-medium border border-gray-100"
                    >
                        Reset Crop
                    </button>
                </div>
            </div>
        )
    } else if (activeLayerId) {
        // LAYER PROPERTIES (Fab / Floor)
        const activeLayer = layers.find(l => l.id === activeLayerId)

        if (activeLayer) {
            headerContent = (
                <div className="flex items-center gap-2">
                    {activeLayer.type === 'common' ? <FactoryIcon size={16} /> : <Layers size={16} />}
                    <span className="font-semibold text-sm text-gray-900">
                        {activeLayer.type === 'common' ? 'Fab Properties' : 'Floor Properties'}
                    </span>
                </div>
            )

            bodyContent = (
                <div className="space-y-5">
                    {/* Common: Global Grid Config */}
                    {activeLayer.type === 'common' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <Maximize size={12} /> Grid Configuration
                                </div>
                                <select
                                    className="text-xs border rounded px-1 py-0.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={gridConfig.unit}
                                    onChange={(e) => setGridConfig({ unit: e.target.value as 'mm' | 'cm' | 'm' | 'km' })}
                                >
                                    <option value="mm">mm</option>
                                    <option value="cm">cm</option>
                                    <option value="m">m</option>
                                    <option value="km">km</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Grid Unit Size ({gridConfig.unit})</label>
                                    <NumberInput
                                        className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                        value={toDisplay(gridConfig.size)}
                                        onChange={(val) => {
                                            setGridConfig({ size: fromDisplay(val) })
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Default Weight</label>
                                    <NumberInput
                                        className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                        value={gridConfig.defaultWeight ?? 1}
                                        onChange={(val) => {
                                            setGridConfig({ defaultWeight: val })
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="bg-blue-50/50 p-3 rounded-md text-xs text-blue-700 leading-relaxed border border-blue-100">
                                <strong>Default Layer:</strong> Objects placed here are visible on all floors.
                            </div>
                            <div className="h-px bg-gray-100" />
                        </div>
                    )}

                    {/* Identity (All Layers) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Hash size={12} /> Identity
                        </div>
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Floor Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={activeLayer.name}
                                    onChange={(e) => updateLayer(activeLayer.id, { name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">ID (Unique)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                    value={activeLayer.id}
                                    onChange={(e) => renameLayer(activeLayer.id, e.target.value)}
                                // Maybe disable for 'default' to prevent bugs?
                                // disabled={activeLayer.type === 'common'}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Layer Behavior */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Layers size={12} /> Layer Behavior
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-500">Visible</label>
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={activeLayer.visible}
                                    onChange={() => toggleLayerVisibility(activeLayer.id)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-500">Locked</label>
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={activeLayer.locked}
                                    onChange={() => toggleLayerLock(activeLayer.id)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Geometry (All Layers) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Maximize size={12} /> Geometry
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Floor Height ({gridConfig.unit})</label>
                            <NumberInput
                                className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={toDisplay(activeLayer.height || 0)}
                                onChange={(val) => updateLayer(activeLayer.id, { height: fromDisplay(val) })}
                            />
                        </div>
                    </div>

                    {/* Grid Config (Local X/Y) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Grid3X3 size={12} /> Grid Layout
                        </div>
                        {/* Auto-Grid from Size */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Physical Size ({gridConfig.unit})</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Width</label>
                                    <NumberInput
                                        className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={toDisplay((activeLayer.gridCountX || 60) * gridConfig.size)}
                                        onChange={(val) => {
                                            const totalSize = fromDisplay(val)
                                            const count = Math.round(totalSize / gridConfig.size)
                                            updateLayer(activeLayer.id, { gridCountX: count > 0 ? count : 1 })
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Length</label>
                                    <NumberInput
                                        className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={toDisplay((activeLayer.gridCountY || 40) * gridConfig.size)}
                                        onChange={(val) => {
                                            const totalSize = fromDisplay(val)
                                            const count = Math.round(totalSize / gridConfig.size)
                                            updateLayer(activeLayer.id, { gridCountY: count > 0 ? count : 1 })
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-50 border-t border-dashed border-gray-200" />

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Grid Cells</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Columns (X)</label>
                                    <NumberInput
                                        className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={activeLayer.gridCountX || 60}
                                        onChange={(val) => updateLayer(activeLayer.id, { gridCountX: val })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Rows (Y)</label>
                                    <NumberInput
                                        className="w-full px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={activeLayer.gridCountY || 40}
                                        onChange={(val) => updateLayer(activeLayer.id, { gridCountY: val })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            if (activeLayer.type !== 'common') {
                footerContent = (
                    <button
                        onClick={() => removeLayer(activeLayer.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                        <Trash2 size={16} /> Delete Floor
                    </button>
                )
            }
        }
    }

    return (
        <div
            ref={panelRef}
            style={{
                left: position ? position.x : undefined,
                top: position ? position.y : undefined,
                right: position ? undefined : 16, // Default position: right-4 (16px)
                // If position is not set, it means it's in its initial absolute position.
                // If position is set, it's fixed and controlled by `left` and `top`.
            }}
            className={`
                w-72 bg-white/95 backdrop-blur-sm border rounded-xl shadow-xl flex flex-col overflow-hidden max-h-[calc(100%-2rem)] animate-in slide-in-from-right-4 duration-200 z-50
                ${position ? 'fixed' : 'absolute top-4'}
            `}
        >
            <div
                onMouseDown={handleMouseDown}
                className={`p-4 border-b bg-gray-50/50 flex items-center justify-between select-none transition-colors ${isPinned ? '' : 'cursor-move active:bg-gray-100'
                    }`}
                title={isPinned ? "Panel Pinned" : "Drag to move"}
            >
                <div className="flex-1 min-w-0 pr-2">
                    {headerContent}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsPinned(!isPinned)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-1.5 rounded-md transition-colors ${isPinned
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                        }`}
                    title={isPinned ? "Unpin Panel" : "Pin Panel"}
                >
                    {isPinned ? <Pin size={14} className="fill-current" /> : <PinOff size={14} />}
                </button>
            </div>

            <div className="p-4 space-y-5 overflow-y-auto flex-1">
                {bodyContent}
            </div>

            {footerContent && (
                <div className="p-4 border-t bg-gray-50/50">
                    {footerContent}
                </div>
            )}
        </div>
    )
}
