import { useEffect, useRef, useState } from 'react'
import { CanvasObject } from '@/store/useUIStore'
import { Pin, PinOff } from 'lucide-react'

interface MinimapProps {
    width: number
    height: number
    objects: CanvasObject[]
    viewX: number
    viewY: number
    viewScale: number
    stageWidth: number
    stageHeight: number
    onNavigate: (x: number, y: number) => void
}

export function Minimap({
    width,
    height,
    objects,
    viewX,
    viewY,
    viewScale,
    stageWidth,
    stageHeight,
    onNavigate
}: MinimapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // State for Minimap Size
    const [minimapSize, setMinimapSize] = useState({ width: 240, height: 160 })
    const MIN_SIZE = 100
    const [isResizing, setIsResizing] = useState(false)
    const resizeStart = useRef<{ x: number, y: number, w: number, h: number } | null>(null)

    // Derived from state instead of constants
    const MAP_WIDTH = minimapSize.width
    const MAP_HEIGHT = minimapSize.height
    const PADDING = 10

    const [imagesLoaded, setImagesLoaded] = useState(0) // Force re-render when images load
    const imageCache = useRef<Record<string, HTMLImageElement>>({})

    // Renamed isLocked -> isPinned for user preference
    const [isPinned, setIsPinned] = useState(true)
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null)
    const [isDraggingWidget, setIsDraggingWidget] = useState(false)
    const dragOffset = useRef<{ x: number, y: number }>({ x: 0, y: 0 })

    // Load Images
    useEffect(() => {
        objects.forEach(obj => {
            if (obj.image2d && !imageCache.current[obj.image2d]) {
                const img = new Image()
                img.src = obj.image2d
                img.onload = () => {
                    imageCache.current[obj.image2d!] = img
                    setImagesLoaded((prev: number) => prev + 1)
                }
                imageCache.current[obj.image2d] = img // Optimistically set to avoid multiple loads, onload will trigger render
            }
        })
    }, [objects])

    // Resize Handlers
    const handleResizePointerDown = (e: React.PointerEvent) => {
        if (isPinned) return
        e.stopPropagation() // Prevent dragging widget
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsResizing(true)
        resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            w: minimapSize.width,
            h: minimapSize.height
        }
    }

    const handleResizePointerMove = (e: React.PointerEvent) => {
        if (!isResizing || !resizeStart.current) return
        e.stopPropagation()

        const dx = e.clientX - resizeStart.current.x
        const dy = e.clientY - resizeStart.current.y

        setMinimapSize({
            width: Math.max(MIN_SIZE, resizeStart.current.w + dx),
            height: Math.max(MIN_SIZE, resizeStart.current.h + dy)
        })
    }

    const handleResizePointerUp = (e: React.PointerEvent) => {
        if (!isResizing) return
        setIsResizing(false)
        e.currentTarget.releasePointerCapture(e.pointerId)
        resizeStart.current = null
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 1. Clear (to transparent, letting CSS bg-white show through)
        ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

        // 2. Calculate Scale to Fit
        // Available space
        const availW = MAP_WIDTH - (PADDING * 2)
        const availH = MAP_HEIGHT - (PADDING * 2)

        const scaleX = availW / width
        const scaleY = availH / height
        const scale = Math.min(scaleX, scaleY)

        // 3. Calculate Centering Offsets
        const drawW = width * scale
        const drawH = height * scale

        const offsetX = (MAP_WIDTH - drawW) / 2
        const offsetY = (MAP_HEIGHT - drawH) / 2

        ctx.save()
        ctx.translate(offsetX, offsetY)

        // 4. Draw Background (The Grid Area)
        ctx.fillStyle = '#e5e7eb' // Gray-200 (Neutral Gray)
        ctx.fillRect(0, 0, drawW, drawH)
        ctx.strokeStyle = '#d1d5db' // Gray-300
        ctx.lineWidth = 1 // Fixed width, not scaled
        ctx.strokeRect(0, 0, width * scale, height * scale)

        // Background Stroke
        ctx.strokeRect(0, 0, drawW, drawH)

        // 5. Draw Objects
        objects.forEach(obj => {
            const ox = obj.x * scale
            const oy = obj.y * scale
            const ow = (obj.width || 50) * scale
            const oh = (obj.height || 50) * scale

            ctx.fillStyle = obj.fill || '#94a3b8' // Slate-400

            // Check if image is available and loaded
            if (obj.image2d && imageCache.current[obj.image2d] && imageCache.current[obj.image2d].complete) {
                try {
                    ctx.drawImage(imageCache.current[obj.image2d], ox, oy, ow, oh)
                } catch (e) {
                    // Fallback if draw fails
                    ctx.fillRect(ox, oy, ow, oh)
                }
                return // Skip shape rendering
            }

            // Check for Circular Types
            if (obj.type === 'circle' || obj.type === 'crane' || obj.type === 'port') {
                ctx.beginPath()
                const radius = Math.min(ow, oh) / 2
                const cx = ox + ow / 2
                const cy = oy + oh / 2

                ctx.arc(cx, cy, radius, 0, Math.PI * 2)
                ctx.fill()
            } else {
                // Rect
                ctx.fillRect(ox, oy, ow, oh)
            }
        })

        // 6. Draw Viewport Rect
        // Viewport: x = -viewX/viewScale, w = stageWidth/viewScale
        const vx = (-viewX / viewScale) * scale
        const vy = (-viewY / viewScale) * scale
        const vw = (stageWidth / viewScale) * scale
        const vh = (stageHeight / viewScale) * scale

        ctx.strokeStyle = '#3b82f6' // Blue-500
        ctx.lineWidth = 2
        ctx.strokeRect(vx, vy, vw, vh)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
        ctx.fillRect(vx, vy, vw, vh)

        ctx.restore()

    }, [width, height, objects, viewX, viewY, viewScale, stageWidth, stageHeight, imagesLoaded, MAP_WIDTH, MAP_HEIGHT])

    const [isDraggingViewport, setIsDraggingViewport] = useState(false)

    // Helper to calculate and update view position based on pointer (Viewport Panning)
    const updateViewportPosition = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const clickX = clientX - rect.left
        const clickY = clientY - rect.top

        // Re-calculate layout to reverse-engineer coordinates
        const availW = MAP_WIDTH - (PADDING * 2)
        const availH = MAP_HEIGHT - (PADDING * 2)
        const scale = Math.min(availW / width, availH / height)

        const drawW = width * scale
        const drawH = height * scale
        const offsetX = (MAP_WIDTH - drawW) / 2
        const offsetY = (MAP_HEIGHT - drawH) / 2

        // (clickX - offsetX) / scale = worldX
        const worldX = (clickX - offsetX) / scale
        const worldY = (clickY - offsetY) / scale

        // Center view on worldX/Y
        const newViewX = -(worldX * viewScale) + (stageWidth / 2)
        const newViewY = -(worldY * viewScale) + (stageHeight / 2)

        onNavigate(newViewX, newViewY)
    }

    // WIDGET DRAG LOGIC
    const handleWidgetPointerDown = (e: React.PointerEvent) => {
        if (isPinned) return // Pass through to canvas if Pinned (Locked). 
        if (isResizing) return // Don't drag widget if resizing

        // If Unpinned, we grab the whole widget.
        setIsDraggingWidget(true)
        const rect = e.currentTarget.getBoundingClientRect()
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
        e.currentTarget.setPointerCapture(e.pointerId)
        e.stopPropagation() // Prevent canvas interaction
    }

    const handleWidgetPointerMove = (e: React.PointerEvent) => {
        if (!isDraggingWidget || isPinned) return

        const newX = e.clientX - dragOffset.current.x
        const newY = e.clientY - dragOffset.current.y

        setPosition({ x: newX, y: newY })
        e.stopPropagation()
    }

    const handleWidgetPointerUp = (e: React.PointerEvent) => {
        setIsDraggingWidget(false)
        e.currentTarget.releasePointerCapture(e.pointerId)
    }


    // CANVAS EVENT HANDLERS (Only for Viewport Panning when Pinned/Locked)
    const handleCanvasPointerDown = (e: React.PointerEvent) => {
        if (!isPinned) return // When unpinned, clicking canvas drags the widget via parent handler
        setIsDraggingViewport(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        updateViewportPosition(e.clientX, e.clientY)
        e.stopPropagation()
    }

    const handleCanvasPointerMove = (e: React.PointerEvent) => {
        if (isPinned && isDraggingViewport) {
            updateViewportPosition(e.clientX, e.clientY)
        }
    }

    const handleCanvasPointerUp = (e: React.PointerEvent) => {
        setIsDraggingViewport(false)
        e.currentTarget.releasePointerCapture(e.pointerId)
    }


    return (
        <div
            className={`bg-white/90 backdrop-blur border rounded-lg shadow-xl overflow-hidden flex flex-col items-center justify-center p-2 transition-shadow ${!isPinned ? 'cursor-move shadow-2xl ring-2 ring-blue-400' : ''}`}
            style={{
                position: position ? 'fixed' : undefined,
                left: position ? position.x : undefined,
                top: position ? position.y : undefined,
                zIndex: 50,
            }}
            onPointerDown={handleWidgetPointerDown}
            onPointerMove={handleWidgetPointerMove}
            onPointerUp={handleWidgetPointerUp}
        >
            <div className="w-full flex justify-between items-center mb-1 px-1">
                <span className="text-[10px] text-gray-400 font-medium tracking-wide">MINIMAP</span>
                <button
                    onClick={() => setIsPinned(!isPinned)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors"
                    title={isPinned ? "Unpin to move/resize minimap" : "Pin position and size"}
                >
                    {isPinned ? <Pin size={12} fill="currentColor" className="rotate-45" /> : <PinOff size={12} />}
                </button>
            </div>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={MAP_WIDTH}
                    height={MAP_HEIGHT}
                    className={`border border-gray-100 rounded bg-white ${isPinned ? 'cursor-crosshair' : 'pointer-events-none'}`}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerLeave={handleCanvasPointerUp}
                />

                {/* Resize Handle Overlay */}
                {!isPinned && (
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                    >
                        {/* Visual Grip Indicator (CSS Triangle or Icon) */}
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-gray-400/50 transform rotate-0" />
                    </div>
                )}
            </div>
        </div>
    )
}
