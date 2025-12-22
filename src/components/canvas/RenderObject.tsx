import { Rect, Circle, Text, Group, Image as KonvaImage, Line } from 'react-konva'
import useImage from 'use-image'
import { CanvasObject } from '@/store/useUIStore'

const URLImage = ({ src, x, y, width, height }: { src: string, x?: number, y?: number, width: number, height: number }) => {
    const [image] = useImage(src)
    return <KonvaImage image={image} x={x} y={y} width={width} height={height} />
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

    // Default / Generic Rects (Material, OHT, Conveyor, Rail, etc)
    const isStroked = ['conveyor', 'rail', 'material', 'oht'].includes(obj.type)

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
            {/* 1. Base Shape (Fallback / Background) */}
            <RenderShape obj={obj} width={width} height={height} />

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
