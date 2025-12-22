import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Transformer, Arrow } from 'react-konva'
import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { Maximize, Plus, Minus } from 'lucide-react'
import { useContainerDimensions } from '@/hooks/useContainerDimensions'
import { Grid } from './Grid'
import { useUIStore } from '@/store/useUIStore'
import { RenderObject } from './RenderObject'
import { Minimap } from './Minimap'

// Simple ID generator if uuid not installed (fallback)
const generateId = () => Math.random().toString(36).substr(2, 9)

export function CanvasArea() {
    const { ref: containerRef, dimensions } = useContainerDimensions()
    const stageRef = useRef<Konva.Stage>(null)
    const transformerRef = useRef<Konva.Transformer>(null)

    const {
        canvasObjects,
        canvasLinks,
        addCanvasObject,
        selectedIds,
        selectObject,
        toggleSelection,
        clearSelection,
        updateCanvasObject,
        removeCanvasObject,
        activeTool,
        setActiveTool,
        addLink,
        gridConfig,
        layers,
        activeLayerId,

        viewMode,
        assets
    } = useUIStore()

    const [scale, setScale] = useState(1)
    const [baseScale, setBaseScale] = useState(1) // Base scale for 100% reference
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [connectSourceId, setConnectSourceId] = useState<string | null>(null)

    // Get Active Layer Dimensions
    const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0]
    const currentGridCountX = activeLayer?.gridCountX || 60
    const currentGridCountY = activeLayer?.gridCountY || 40

    // Filter objects: Show objects on current layer ONLY
    const visibleObjects = useMemo(() => {
        console.log('Filtering Objects:', { activeLayerId, viewMode, total: canvasObjects.length, layers })
        return canvasObjects.filter(obj => {
            // 1. Floor Logic: Must match Active Layer
            // Legacy Fix: If layerId is missing, assume '1f' (default active layer)
            const objectLayerId = obj.layerId || '1f'

            console.log('Obj Check:', { id: obj.id, type: obj.type, layer: obj.layerId, active: activeLayerId, match: objectLayerId === activeLayerId })

            if (objectLayerId !== activeLayerId) return false

            // 2. Sub-Layer Logic: Must match View Mode (Bottom vs Top)
            const objSubLayer = obj.subLayer || 'bottom'
            return objSubLayer === viewMode
        })
    }, [canvasObjects, activeLayerId, viewMode, layers])

    // Update transformer when selection changes (Multi-select support)
    useEffect(() => {
        const stage = stageRef.current
        const transformer = transformerRef.current
        if (stage && transformer) {
            const nodes = selectedIds
                .map(id => stage.findOne('.' + id))
                .filter((node): node is Konva.Node => !!node)

            if (nodes.length > 0) {
                transformer.nodes(nodes)
                transformer.getLayer()?.batchDraw()
            } else {
                transformer.nodes([])
            }
        }
    }, [selectedIds, visibleObjects]) // Depend on visibleObjects instead of all objects

    useEffect(() => {
        const handleExport = () => {
            if (stageRef.current) {
                const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
                const link = document.createElement('a')
                link.download = `layout-${new Date().toISOString().slice(0, 10)}.png`
                link.href = uri
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
        }
        window.addEventListener('tmcs-export-image', handleExport)
        return () => window.removeEventListener('tmcs-export-image', handleExport)
    }, [])

    // Handle Keyboard Events (Delete)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
                // Prevent backspace from navigating back if not in an input
                const activeElement = document.activeElement
                if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
                    selectedIds.forEach(id => removeCanvasObject(id))
                    clearSelection()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedIds, removeCanvasObject, clearSelection])

    const fitToScreen = useCallback(() => {
        if (dimensions.width > 0 && dimensions.height > 0) {
            const totalFabWidth = gridConfig.size * currentGridCountX
            const totalFabHeight = gridConfig.size * currentGridCountY

            // Handle edge case where fab size is 0
            if (totalFabWidth === 0 || totalFabHeight === 0) return

            // 1. Calculate Scale to Fit (with 10% padding)
            const padding = 0.9
            const scaleX = dimensions.width / totalFabWidth
            const scaleY = dimensions.height / totalFabHeight
            const fitScale = Math.min(scaleX, scaleY) * padding

            // 2. Center the scaled Fab
            const scaledWidth = totalFabWidth * fitScale
            const scaledHeight = totalFabHeight * fitScale

            const initialX = (dimensions.width - scaledWidth) / 2
            const initialY = (dimensions.height - scaledHeight) / 2

            setBaseScale(fitScale) // Set 100% reference
            setScale(fitScale)
            setPosition({ x: initialX, y: initialY })
        }
    }, [dimensions.width, dimensions.height, gridConfig.size, currentGridCountX, currentGridCountY])

    // Initial Center Alignment
    useEffect(() => {
        // eslint-disable-next-line
        fitToScreen()
    }, [fitToScreen])

    // Event Handlers
    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault()
        const stage = stageRef.current
        if (!stage) return
        const oldScale = stage.scaleX()
        const pointer = stage.getPointerPosition()
        if (!pointer) return

        const scaleBy = 1.1
        let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

        // Limit zoom relative to base scale (10% to 1000%)
        const minScale = baseScale * 0.1
        const maxScale = baseScale * 30.0

        // Clamp logic so we can hit exactly maxScale/minScale
        if (newScale < minScale) newScale = minScale
        if (newScale > maxScale) newScale = maxScale

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        }

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        }

        setScale(newScale)
        setPosition(newPos)
    }

    const handleZoomStep = (direction: 1 | -1) => {
        const stage = stageRef.current
        if (!stage) return

        const oldScale = stage.scaleX()
        // Step: 10% of BASE scale (linear additives)
        const step = baseScale * 0.1
        let newScale = oldScale + (step * direction)

        // Clamp
        const minScale = baseScale * 0.1
        const maxScale = baseScale * 30.0

        if (newScale < minScale) newScale = minScale
        if (newScale > maxScale) newScale = maxScale

        // Center of viewport
        const center = {
            x: dimensions.width / 2,
            y: dimensions.height / 2
        }

        const mousePointTo = {
            x: (center.x - stage.x()) / oldScale,
            y: (center.y - stage.y()) / oldScale,
        }

        const newPos = {
            x: center.x - mousePointTo.x * newScale,
            y: center.y - mousePointTo.y * newScale,
        }

        stage.scale({ x: newScale, y: newScale })
        stage.position(newPos)
        setScale(newScale)
        setPosition(newPos)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        stageRef.current?.setPointersPositions(e)
        const type = e.dataTransfer.getData('type')
        if (!type) return

        const stage = stageRef.current
        if (!stage) return
        const pointer = stage.getPointerPosition()
        if (!pointer) return

        let stageX = (pointer.x - position.x) / scale
        let stageY = (pointer.y - position.y) / scale

        // Default to grid size (1x1 cell)
        const width = gridConfig.size
        const height = gridConfig.size
        const radius = gridConfig.size / 2
        let fill = '#3b82f6'

        switch (type) {
            case 'agv':
            case 'amr':
                fill = type === 'agv' ? '#f59e0b' : '#10b981'
                break
            case 'oht':
                fill = '#ec4899' // Pink-500
                break
            case 'conveyor':
            case 'rail':
                // Conveyors/Rails might look better as 1xN or Nx1, but user requested "size of 1 grid cell".
                // We'll stick to 1x1 for now as per specific request, or maybe 2x1 for long items if strictly needed?
                // Request: "fixed to the size of 1 grid cell" -> 1x1.
                fill = '#475569'
                break
            case 'stocker':
            case 'rack':
            case 'buffer':
                fill = '#3b82f6'
                break
            case 'crane':
            case 'port':
                fill = '#ef4444'
                break
            case 'equipment':
                fill = '#8b5cf6' // Violet-500
                break
            case 'lifter':
                fill = '#06b6d4' // Cyan-500
                break
            case 'charger':
                fill = '#84cc16' // Lime-500
                break
            case 'wall':
                fill = '#64748b' // Slate-500
                break
            case 'pillar':
                fill = '#334155' // Slate-700
                break
            case 'text':
                // Text might not need dimensions, but good to have defaults
                break
            default:
                // rect, circle
                break
        }

        const totalWidth = gridConfig.size * currentGridCountX
        const totalHeight = gridConfig.size * currentGridCountY

        // Clamp Drop Position
        if (stageX < 0) stageX = 0
        if (stageY < 0) stageY = 0
        if (stageX > totalWidth - width) stageX = totalWidth - width
        if (stageY > totalHeight - height) stageY = totalHeight - height

        const presetId = e.dataTransfer.getData('presetId')
        const preset = presetId ? assets.find(a => a.id === presetId) : null

        const name = type.charAt(0).toUpperCase() + type.slice(1)

        // Use direct store access to avoid stale closures in event handler
        const currentActiveLayerId = useUIStore.getState().activeLayerId
        const currentViewMode = useUIStore.getState().viewMode

        console.log('Drop Event (Direct):', { type, currentActiveLayerId, currentViewMode })

        let newObj = {
            id: `${name}_${generateId()}`,
            name,
            type,
            x: stageX,
            y: stageY,
            z: 0,
            rotation: 0,
            opacity: (type === 'rect' || type === 'circle') ? 0.5 : 1,
            showLabel: false,
            textColor: '#ffffff',
            fill,
            width,
            height,
            depth: height,
            radius,
            text: 'Text',
            fontSize: 14, // Windows default size
            fontFamily: 'Arial',
            layerId: currentActiveLayerId,
            subLayer: currentViewMode,
        }

        // Apply Preset Metadata Overrides
        if (preset && preset.metadata) {
            // Only copy valid visual properties that match CanvasObject keys
            const validKeys = [
                'width', 'height', 'depth', 'z', 'rotation', 'opacity',
                'fill', 'showLabel', 'textColor', 'name', 'fontSize'
            ]

            // If preset has a name (e.g. "Stocker Large"), maybe use it as base name?
            // User might prefer the generic "Stocker" name with ID, or "Stocker Large_123".
            // Let's stick to type-based ID for now, but maybe use preset name for something?
            // Actually, if preset has 'name', we might want to use it if it was customized.

            const meta = preset.metadata
            const overrides: Record<string, unknown> = {}
            validKeys.forEach(key => {
                if (meta[key] !== undefined) {
                    overrides[key] = meta[key]
                }
            })
            newObj = { ...newObj, ...overrides }
        }

        addCanvasObject(newObj)
        selectObject(newObj.id)
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
        updateCanvasObject(id, {
            x: e.target.x(),
            y: e.target.y(),
        })
    }

    const handleTransformEnd = (e: KonvaEventObject<Event>, id: string) => {
        // Sync transformer changes back to store (scale, rotation, etc)
        const node = e.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()

        // Reset scale to 1 and update width/height to avoid compounding scale
        node.scaleX(1)
        node.scaleY(1)

        updateCanvasObject(id, {
            x: node.x(),
            y: node.y(),
            width: node.width() * scaleX,
            height: node.height() * scaleY,
            rotation: node.rotation(),
        })
    }

    return (
        <div
            className="absolute inset-0 bg-gray-100 overflow-hidden"
            ref={containerRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            {dimensions.width > 0 && dimensions.height > 0 && (
                <Stage
                    ref={stageRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    draggable
                    onWheel={handleWheel}
                    scaleX={scale}
                    scaleY={scale}
                    x={position.x}
                    y={position.y}
                    onDragEnd={(e) => {
                        if (e.target === stageRef.current) {
                            setPosition({ x: e.target.x(), y: e.target.y() })
                        }
                    }}
                    onClick={(e) => {
                        // Deselect if clicked on empty stage
                        const clickedOnEmpty = e.target === stageRef.current
                        if (clickedOnEmpty) {
                            if (activeTool === 'connect') {
                                setConnectSourceId(null)
                                setActiveTool('select')
                            }
                            selectObject(null)
                            // Also clear active asset so Inspector falls back to Layer/Fab properties
                            useUIStore.getState().setActiveAssetId(null)
                        }
                    }}
                >
                    <Layer>
                        <Grid
                            width={dimensions.width}
                            height={dimensions.height}
                            scale={scale}
                            x={position.x}
                            y={position.y}
                            size={gridConfig.size}
                            countX={currentGridCountX}
                            countY={currentGridCountY}
                        />
                    </Layer>
                    <Layer>
                        {/* Links Layer */}
                        {canvasLinks?.map((link) => {
                            const fromObj = visibleObjects.find(o => o.id === link.from)
                            const toObj = visibleObjects.find(o => o.id === link.to)

                            if (!fromObj || !toObj) return null

                            const fromX = fromObj.x + (fromObj.width || 0) / 2
                            const fromY = fromObj.y + (fromObj.height || 0) / 2
                            const toX = toObj.x + (toObj.width || 0) / 2
                            const toY = toObj.y + (toObj.height || 0) / 2

                            const isSelected = selectedIds.includes(link.id)

                            return (
                                <Arrow
                                    key={link.id}
                                    points={[fromX, fromY, toX, toY]}
                                    stroke={link.color}
                                    fill={link.color}
                                    strokeWidth={isSelected ? 4 : 2}
                                    pointerLength={10}
                                    pointerWidth={10}
                                    hitStrokeWidth={20} // Easier to click
                                    onClick={(e) => {
                                        e.cancelBubble = true
                                        if (e.evt.shiftKey) {
                                            toggleSelection(link.id)
                                        } else {
                                            selectObject(link.id)
                                        }
                                    }}
                                />
                            )
                        })}

                        {visibleObjects.map((obj) => {
                            const commonProps = {
                                key: obj.id,
                                id: obj.id,
                                name: obj.id, // Important for finding node
                                x: obj.x,
                                y: obj.y,
                                rotation: obj.rotation || 0,
                                opacity: obj.opacity ?? 1,
                                draggable: true,
                                dragBoundFunc: (pos: { x: number, y: number }) => {
                                    const stage = stageRef.current
                                    if (!stage) return pos

                                    const totalWidth = gridConfig.size * currentGridCountX
                                    const totalHeight = gridConfig.size * currentGridCountY

                                    const scaleX = stage.scaleX()
                                    const stageX = stage.x()
                                    const stageY = stage.y()

                                    // Absolute to Local
                                    let x = (pos.x - stageX) / scaleX
                                    let y = (pos.y - stageY) / scaleX

                                    // Bounds
                                    const minX = 0
                                    const minY = 0
                                    const maxX = totalWidth - (obj.width || 0)
                                    const maxY = totalHeight - (obj.height || 0)

                                    if (x < minX) x = minX
                                    if (x > maxX) x = maxX
                                    if (y < minY) y = minY
                                    if (y > maxY) y = maxY

                                    return {
                                        x: x * scaleX + stageX,
                                        y: y * scaleX + stageY
                                    }
                                },
                                onClick: (e: KonvaEventObject<MouseEvent>) => {
                                    e.cancelBubble = true

                                    if (activeTool === 'connect') {
                                        if (!connectSourceId) {
                                            setConnectSourceId(obj.id)
                                        } else {
                                            if (connectSourceId !== obj.id) {
                                                // Create Link
                                                addLink({
                                                    id: generateId(),
                                                    from: connectSourceId,
                                                    to: obj.id,
                                                    color: 'black'
                                                })
                                                setConnectSourceId(null)
                                                setActiveTool('select') // Optional: Auto switch back? Let's keep it for multiple connections
                                            }
                                        }
                                    } else {
                                        if (e.evt.shiftKey) {
                                            toggleSelection(obj.id)
                                        } else {
                                            selectObject(obj.id)
                                        }
                                    }
                                },
                                onDragEnd: (e: KonvaEventObject<DragEvent>) => handleDragEnd(e, obj.id),
                                // onTransform removed to prevent Double-Scale / Re-render loop bug during resize.
                                // Updates will happen on onTransformEnd.
                                onTransformEnd: (e: KonvaEventObject<Event>) => handleTransformEnd(e, obj.id),
                            }

                            return (
                                <RenderObject
                                    key={obj.id}
                                    obj={obj}
                                    commonProps={commonProps}
                                />
                            )
                        })}
                        <Transformer
                            ref={transformerRef}
                            boundBoxFunc={(oldBox, newBox) => {
                                const stage = stageRef.current
                                // Safety: if stage doesn't exist yet, just return oldBox to invalid state
                                if (!stage) return oldBox

                                // 1. Get Stage Transforms (Scale & Position)
                                const scaleX = stage.scaleX()
                                const scaleY = stage.scaleY()
                                const stageX = stage.x()
                                const stageY = stage.y()

                                // 2. Grid & World Constants
                                const size = gridConfig.size || 500
                                const countX = currentGridCountX || 60
                                const countY = currentGridCountY || 40

                                const totalWidth = size * countX
                                const totalHeight = size * countY

                                // 3. Convert NEW Absolute Box to Local Box
                                //    (The inverse of: abs = local * scale + stage)
                                let localX = (newBox.x - stageX) / scaleX
                                let localY = (newBox.y - stageY) / scaleY
                                let localWidth = newBox.width / scaleX
                                let localHeight = newBox.height / scaleY

                                // 4. Clamp in LOCAL Space
                                const minX = 0
                                const minY = 0
                                const maxX = totalWidth
                                const maxY = totalHeight

                                // Clamp Right & Bottom
                                if (localX + localWidth > maxX) {
                                    localWidth = maxX - localX
                                }
                                if (localY + localHeight > maxY) {
                                    localHeight = maxY - localY
                                }

                                // Clamp Left & Top
                                if (localX < minX) {
                                    const right = localX + localWidth
                                    localX = minX
                                    localWidth = right - localX
                                }
                                if (localY < minY) {
                                    const bottom = localY + localHeight
                                    localY = minY
                                    localHeight = bottom - localY
                                }

                                // 5. Minimum Size Constraint (in Local Units)
                                //    Using 'size' (e.g. 500mm) as the minimum
                                if (localWidth < size || localHeight < size) {
                                    return oldBox
                                }

                                // 6. Convert Back to Absolute Box for Return
                                return {
                                    ...newBox,
                                    x: localX * scaleX + stageX,
                                    y: localY * scaleY + stageY,
                                    width: localWidth * scaleX,
                                    height: localHeight * scaleY,
                                }
                            }}
                        />
                    </Layer>
                </Stage>
            )}

            {/* Floor Selector Removed - Moved to Header */}

            {/* Scale/Grid Controls */}
            {/* Minimap & Controls Stacks */}
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3 pointer-events-none">
                <div className="pointer-events-auto">
                    {/* Minimap */}
                    <Minimap
                        width={gridConfig.size * currentGridCountX}
                        height={gridConfig.size * currentGridCountY}
                        objects={visibleObjects}
                        viewX={position.x}
                        viewY={position.y}
                        viewScale={scale}
                        stageWidth={dimensions.width}
                        stageHeight={dimensions.height}

                        onNavigate={(x, y) => setPosition({ x, y })}
                    />
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    {/* Auto-Fit Button */}
                    <button
                        onClick={fitToScreen}
                        className="bg-white p-2 rounded-lg shadow-md border hover:bg-gray-50 text-gray-700 transition-colors"
                        title="Fit to Screen"
                    >
                        <Maximize size={18} />
                    </button>
                </div>
            </div>

            {/* Zoom Indicator */}
            {/* Zoom Indicator & Controls */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-gray-200 text-gray-700">
                <button
                    onClick={() => handleZoomStep(-1)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                    title="Zoom Out (-10%)"
                >
                    <Minus size={16} />
                </button>
                <div className="w-12 text-center text-sm font-semibold font-mono select-none">
                    {Math.round((scale / baseScale) * 100)}%
                </div>
                <button
                    onClick={() => handleZoomStep(1)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                    title="Zoom In (+10%)"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Delete Hint */}
            {selectedIds.length > 0 && !activeTool.includes('connect') && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-medium border border-red-100 animate-in fade-in slide-in-from-bottom-2">
                    Press delete to remove ({selectedIds.length})
                </div>
            )}

            {/* Connection Hint */}
            {activeTool === 'connect' && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4 z-50">
                    {connectSourceId ? 'Click target object to connect' : 'Click source object to start connection'}
                </div>
            )}
        </div>
    )
}
