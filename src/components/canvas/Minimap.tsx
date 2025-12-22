import { useEffect, useRef } from 'react'
import { CanvasObject } from '@/store/useUIStore'

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

    // Fixed Minimap Size
    const MAP_WIDTH = 240
    const MAP_HEIGHT = 160
    const PADDING = 10

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 1. Clear
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
        ctx.fillStyle = '#f8fafc' // Slate-50
        ctx.fillRect(0, 0, drawW, drawH)
        ctx.strokeStyle = '#cbd5e1' // Slate-300
        ctx.lineWidth = 1 / scale // Keep line thin
        ctx.strokeRect(0, 0, width * scale, height * scale) // Use original scale logic, wait.

        // Actually simpler to just scale the context?
        // Let's stick to world coordinates * scale for precision control or just use ctx.scale?
        // Let's use coordinate math to be explicit.

        // Background Stroke
        ctx.strokeRect(0, 0, drawW, drawH)

        // 5. Draw Objects
        objects.forEach(obj => {
            const ox = obj.x * scale
            const oy = obj.y * scale
            const ow = (obj.width || 50) * scale
            const oh = (obj.height || 50) * scale

            ctx.fillStyle = obj.fill || '#94a3b8' // Slate-400

            // Check for Circular Types
            if (obj.type === 'circle' || obj.type === 'crane' || obj.type === 'port') {
                ctx.beginPath()
                // Ellipse support if width != height? Konva Circle is usually r=width/2
                // Let's assume circle for now based on Konva logic (usually radius or width/2)
                const radius = Math.min(ow, oh) / 2
                // Center calculation: Konva rect is top-left, Circle is center if offset used, 
                // but our store saves x/y as top-left for rects? 
                // Wait, RenderObject uses offsetX/Y for circles to center them? 
                // Inspecting RenderObject: 
                // Circle: offsetX = -width/2, which means the (x,y) point is the CENTER of the circle? 
                // No, offsetX moves the origin. 
                // If x=100, y=100. offsetX=-25. The circle is drawn at (100,100) but shifted by -25? 
                // Actually negative offset moves the drawing right/down. 
                // Let's check CanvasArea: x: obj.x. 
                // If it's a circle, visual center is at obj.x + width/2 if offset is used?
                // Let's assume (x,y) is top-left bounding box for simplicity in minimap 
                // effectively: center = x + w/2, y + h/2.

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

    }, [width, height, objects, viewX, viewY, viewScale, stageWidth, stageHeight])

    const handlePointerDown = (e: React.PointerEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const clickY = e.clientY - rect.top

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

    return (
        <div
            className="bg-white/90 backdrop-blur border rounded-lg shadow-xl overflow-hidden flex flex-col items-center justify-center p-2"
        // No fixed size on container, let canvas dictate
        >
            <canvas
                ref={canvasRef}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                className="cursor-crosshair border border-gray-100 rounded bg-white"
                onPointerDown={handlePointerDown}
            />
            <div className="text-[10px] text-gray-400 mt-1 w-full text-center border-t border-gray-100 pt-1 font-medium tracking-wide">
                MINIMAP
            </div>
        </div>
    )
}
