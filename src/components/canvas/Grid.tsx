import { Group, Line } from 'react-konva'

interface GridProps {
    width: number
    height: number
    scale: number
    x: number
    y: number
    size: number
    countX: number
    countY: number
}

export function Grid({ width, height, scale, x, y, size, countX, countY }: GridProps) {
    const gridSize = size
    const totalWidth = size * countX
    const totalHeight = size * countY

    // Calculate visible area based on viewport and transform
    // We strictly limit the drawing to 0 -> totalWidth/Height
    // But we also optimize to only draw what is currently visible on screen
    const visibleStartX = Math.floor((-x) / scale / gridSize) * gridSize
    const visibleEndX = Math.floor((-x + width) / scale / gridSize + 1) * gridSize

    const visibleStartY = Math.floor((-y) / scale / gridSize) * gridSize
    const visibleEndY = Math.floor((-y + height) / scale / gridSize + 1) * gridSize

    // Intersection of Visible Area AND Fab Area
    const startX = Math.max(0, visibleStartX)
    const endX = Math.min(totalWidth, visibleEndX)

    const startY = Math.max(0, visibleStartY)
    const endY = Math.min(totalHeight, visibleEndY)

    const lines = []

    // Vertical lines
    for (let i = startX; i <= endX; i += gridSize) {
        lines.push(
            <Line
                key={`v${i}`}
                points={[i, 0, i, totalHeight]}
                stroke="#e5e7eb"
                strokeWidth={1 / scale}
            />
        )
    }

    // Horizontal lines
    for (let i = startY; i <= endY; i += gridSize) {
        lines.push(
            <Line
                key={`h${i}`}
                points={[0, i, totalWidth, i]}
                stroke="#e5e7eb"
                strokeWidth={1 / scale}
            />
        )
    }

    return (
        <Group>
            {/* Grid Lines */}
            {lines}

            {/* Fab Boundary Border */}
            <Line
                points={[0, 0, totalWidth, 0, totalWidth, totalHeight, 0, totalHeight, 0, 0]}
                stroke="#9ca3af"
                strokeWidth={2 / scale}
                dash={[10 / scale, 5 / scale]}
            />
        </Group>
    )
}
