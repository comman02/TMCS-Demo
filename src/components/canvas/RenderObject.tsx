import { Rect, Circle, Text, Group, Image as KonvaImage, Line } from 'react-konva'
import useImage from 'use-image'
import { CanvasObject } from '@/store/useUIStore'

type CropBox = { x: number; y: number; width: number; height: number }
const imageCropCache = new Map<string, CropBox>()

function getOpaqueBounds(image: HTMLImageElement): CropBox | null {
    const w = image.naturalWidth || image.width
    const h = image.naturalHeight || image.height
    if (w <= 0 || h <= 0) return null

    try {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        ctx.drawImage(image, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)

        let minX = w
        let minY = h
        let maxX = -1
        let maxY = -1

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const alpha = data[(y * w + x) * 4 + 3]
                if (alpha > 0) {
                    if (x < minX) minX = x
                    if (y < minY) minY = y
                    if (x > maxX) maxX = x
                    if (y > maxY) maxY = y
                }
            }
        }

        if (maxX < minX || maxY < minY) return null
        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
        }
    } catch {
        return null
    }
}

const URLImage = ({ src, x, y, width, height }: { src: string, x?: number, y?: number, width: number, height: number }) => {
    const [image] = useImage(src)
    let crop: CropBox | undefined

    if (image) {
        const cached = imageCropCache.get(src)
        if (cached) {
            crop = cached
        } else {
            const bounds = getOpaqueBounds(image)
            if (bounds) {
                imageCropCache.set(src, bounds)
                crop = bounds
            }
        }
    }

    return <KonvaImage image={image} x={x} y={y} width={width} height={height} crop={crop} />
}

interface RenderObjectProps {
    obj: CanvasObject
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commonProps: any
}

const RenderShape = ({ obj, width, height }: { obj: CanvasObject, width: number, height: number }) => {
    // Basic Shapes
    if (obj.type === 'circle') {
        return (
            <Circle
                width={width}
                height={height}
                offsetX={-width / 2}
                offsetY={-height / 2}
                fill={obj.fill}
            />
        )
    }

    // Crane (Forklift Style)
    if (['crane'].includes(obj.type)) {
        // Forklift: Base + Two Forks
        const forkWidth = width * 0.15
        const baseHeight = height * 0.4

        return (
            <>
                {/* Main Body */}
                <Rect
                    y={height - baseHeight}
                    width={width}
                    height={baseHeight}
                    fill={obj.fill || '#ef4444'}
                    cornerRadius={2}
                    stroke="black"
                    strokeWidth={1}
                />
                {/* Left Fork */}
                <Rect
                    x={width * 0.2}
                    y={0}
                    width={forkWidth}
                    height={height}
                    fill="#333"
                    stroke="black"
                    strokeWidth={1}
                />
                {/* Right Fork */}
                <Rect
                    x={width - (width * 0.2) - forkWidth}
                    y={0}
                    width={forkWidth}
                    height={height}
                    fill="#333"
                    stroke="black"
                    strokeWidth={1}
                />
            </>
        )
    }

    // Port (Semiconductor Load Port)
    if (['port'].includes(obj.type)) {
        // Load Port: Platform + Alignment Pins
        return (
            <>
                {/* Platform */}
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#cbd5e1'}
                    stroke="black"
                    strokeWidth={1}
                    cornerRadius={2}
                />
                {/* Alignment Markings (3 dots or slots) */}
                <Circle
                    x={width * 0.5} y={height * 0.2} radius={2} fill="#64748b" />
                <Circle
                    x={width * 0.2} y={height * 0.8} radius={2} fill="#64748b" />
                <Circle
                    x={width * 0.8} y={height * 0.8} radius={2} fill="#64748b" />

                {/* Inner Slot Area */}
                <Rect
                    x={width * 0.25}
                    y={height * 0.4}
                    width={width * 0.5}
                    height={height * 0.2}
                    stroke="#94a3b8"
                    strokeWidth={1}
                    dash={[2, 2]}
                />
            </>
        )
    }

    // Detailed Rects (Stocker, Rack, Equipment, etc)

    // Stocker / Rack
    if (['stocker', 'rack', 'buffer'].includes(obj.type)) {
        const isStocker = obj.type === 'stocker'
        const baseColor = isStocker ? '#3b82f6' : '#94a3b8' // Blue vs Grey

        return (
            <>
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || baseColor}
                    stroke="#1e3a8a" // Dark Blue
                    strokeWidth={2}
                />
                {/* Shelves Lines */}
                <Line
                    points={[0, height * 0.33, width, height * 0.33]}
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth={1}
                />
                <Line
                    points={[0, height * 0.66, width, height * 0.66]}
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth={1}
                />
                {/* Diagonal Cross for "Storage" symbol? Optional */}
            </>
        )
    }

    // Equipment
    if (['equipment'].includes(obj.type)) {
        return (
            <>
                {/* Main Body */}
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#8b5cf6'}
                    stroke="#5b21b6"
                    strokeWidth={2}
                    cornerRadius={2}
                />
                {/* Chamber / Process Area */}
                <Rect
                    x={width * 0.2}
                    y={height * 0.2}
                    width={width * 0.6}
                    height={height * 0.6}
                    fill="rgba(255,255,255,0.2)"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={1}
                />
                {/* Load Port Extension Indicator */}
                <Rect
                    x={width * 0.35}
                    y={height - 5}
                    width={width * 0.3}
                    height={5}
                    fill="#4c1d95"
                />
                {/* Status Light */}
                <Circle
                    x={width - 8}
                    y={8}
                    radius={3}
                    fill="#22c55e" // Green Light
                />
            </>
        )
    }

    // Charger
    if (['charger'].includes(obj.type)) {
        return (
            <>
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#84cc16'}
                    stroke="#3f6212"
                    strokeWidth={1}
                    cornerRadius={4}
                />
                {/* "Bolt" or Plus Symbol */}
                <Text
                    text="⚡"
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    align="center"
                    verticalAlign="middle"
                    fontSize={Math.min(width, height) * 0.6}
                    fill="yellow"
                />
            </>
        )
    }

    // Wall
    if (['wall'].includes(obj.type)) {
        return (
            <Rect
                width={width}
                height={height}
                fill={obj.fill || '#1e293b'} // Dark Slate
            // No stroke for walls generally
            />
        )
    }

    // Pillar
    if (['pillar'].includes(obj.type)) {
        return (
            <>
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#334155'}
                    stroke="#0f172a"
                    strokeWidth={1}
                />
                {/* X Cross */}
                <Line
                    points={[0, 0, width, height]}
                    stroke="#1e293b"
                    strokeWidth={1}
                />
                <Line
                    points={[width, 0, 0, height]}
                    stroke="#1e293b"
                    strokeWidth={1}
                />
            </>
        )
    }

    // AGV / AMR (Vehicle)
    if (['agv', 'amr'].includes(obj.type)) {
        // If an image is present, do not render the default vector shape
        if (obj.image2d) return null

        const isAMR = obj.type === 'amr'
        const bodyColor = isAMR ? '#fbbf24' : '#eab308' // Amber/Yellow variations

        return (
            <>
                {/* Wheels */}
                <Circle x={width * 0.2} y={height * 0.2} radius={4} fill="#000" />
                <Circle x={width * 0.8} y={height * 0.2} radius={4} fill="#000" />
                <Circle x={width * 0.2} y={height * 0.8} radius={4} fill="#000" />
                <Circle x={width * 0.8} y={height * 0.8} radius={4} fill="#000" />

                {/* Body */}
                <Rect
                    x={2}
                    y={2}
                    width={width - 4}
                    height={height - 4}
                    fill={obj.fill || bodyColor}
                    stroke="black"
                    strokeWidth={1}
                    cornerRadius={isAMR ? 8 : 2}
                />

                {/* Direction Indicator (Arrow or front marker) */}
                <Rect
                    x={width * 0.4}
                    y={4}
                    width={width * 0.2}
                    height={8}
                    fill="rgba(0,0,0,0.5)"
                />
            </>
        )
    }

    // Conveyor / OHT Rail (Linear Transport)
    // Note: Conveoyr is often a surface, Rail is a line.
    if (obj.type === 'conveyor') {
        return (
            <>
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#cbd5e1'}
                    stroke="#64748b"
                    strokeWidth={1}
                />
                {/* Rollers Pattern */}
                {Array.from({ length: Math.floor(height / 10) }).map((_, i) => (
                    <Line
                        key={i}
                        points={[0, (i + 1) * 10, width, (i + 1) * 10]}
                        stroke="#94a3b8"
                        strokeWidth={1}
                    />
                ))}
            </>
        )
    }

    if (obj.type === 'rail') {
        return (
            <>
                {/* Rail Line */}
                <Rect
                    y={height * 0.4}
                    width={width}
                    height={height * 0.2}
                    fill={obj.fill || '#475569'}
                />
                {/* Sleepers / Supports */}
                {Array.from({ length: Math.floor(width / 20) }).map((_, i) => (
                    <Rect
                        key={i}
                        x={(i * 20) + 5}
                        y={height * 0.2}
                        width={4}
                        height={height * 0.6}
                        fill="#1e293b"
                    />
                ))}
            </>
        )
    }


    // OHT (Overhead Hoist Transport) - Vehicle on rail
    if (obj.type === 'oht') {
        return (
            <>
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#f472b6'} // Pink/Magentaish
                    stroke="#db2777"
                    strokeWidth={1}
                    cornerRadius={4}
                />
                {/* Overhead Grip */}
                <Circle x={width / 2} y={height / 2} radius={width * 0.3} stroke="white" strokeWidth={2} />
                <Line points={[0, 0, width, height]} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
                <Line points={[width, 0, 0, height]} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
            </>
        )
    }

    // Lifter
    if (obj.type === 'lifter') {
        return (
            <>
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#c084fc'}
                    stroke="#7e22ce"
                    strokeWidth={2}
                />
                {/* Up/Down Arrows Symbol */}
                <Group>
                    <Line points={[width * 0.5, height * 0.2, width * 0.5, height * 0.8]} stroke="white" strokeWidth={3} />
                    <Line points={[width * 0.3, height * 0.35, width * 0.5, height * 0.2, width * 0.7, height * 0.35]} stroke="white" strokeWidth={3} lineCap='round' lineJoin='round' />
                    <Line points={[width * 0.3, height * 0.65, width * 0.5, height * 0.8, width * 0.7, height * 0.65]} stroke="white" strokeWidth={3} lineCap='round' lineJoin='round' />
                </Group>
            </>
        )
    }

    // Material (Generic Box)
    if (obj.type === 'material') {
        return (
            <>
                <Rect
                    width={width}
                    height={height}
                    fill={obj.fill || '#a855f7'} // Purple box
                    stroke="#6b21a8"
                    strokeWidth={1}
                />
                {/* Box Texture */}
                <Rect x={2} y={2} width={width - 4} height={height - 4} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                <Line points={[0, 0, width, height]} stroke="rgba(0,0,0,0.1)" />
            </>
        )
    }

    // Default / Generic Rects
    const isStroked = true

    return (
        <Rect
            width={width}
            height={height}
            fill={obj.fill || (obj.type === 'text' ? 'transparent' : '#94a3b8')}
            cornerRadius={obj.type === 'rect' ? 4 : 0}
            stroke={isStroked ? 'black' : undefined}
            strokeWidth={isStroked ? 1 : 0}
        />
    )

}

export function RenderObject({ obj, commonProps }: RenderObjectProps) {
    const width = obj.width ?? 50
    const height = obj.height ?? 50

    if (obj.type === 'text') {
        return (
            <Text
                {...commonProps}
                text={obj.text}
                fontSize={obj.fontSize}
                fontFamily={obj.fontFamily || 'Arial'}
                width={width}
                height={height}
                fill={obj.fill || 'black'}
            />
        )
    }

    return (
        <Group {...commonProps} width={width} height={height}>
            {/* 1. Base Shape (Fallback / Background) - Only render if no image2d */}
            {!obj.image2d && <RenderShape obj={obj} width={width} height={height} />}

            {/* 2. Image Overlay (if available) */}
            {obj.image2d && (
                <URLImage src={obj.image2d} width={width} height={height} />
            )}

            {/* 3. Text Label */}
            {obj.showLabel && (
                <Text
                    text={obj.name}
                    width={width}
                    height={height}
                    align="center"
                    verticalAlign="middle"
                    fontSize={obj.fontSize || 12}
                    fontFamily={obj.fontFamily || 'Arial'}
                    fill={obj.textColor || '#ffffff'}
                    listening={false}
                />
            )}
        </Group>
    )
}
