import { Rect, Circle, Text, Group } from 'react-konva'

interface RenderObjectProps {
    obj: any
    commonProps: any
}

export function RenderObject({ obj, commonProps }: RenderObjectProps) {
    // Basic Shapes
    if (obj.type === 'rect') {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Rect
                    width={obj.width}
                    height={obj.height}
                    fill={obj.fill}
                    cornerRadius={4}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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
    if (obj.type === 'circle') {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Circle
                    width={obj.width}
                    height={obj.height}
                    offsetX={-obj.width / 2}
                    offsetY={-obj.height / 2}
                    fill={obj.fill}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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
    if (obj.type === 'text') {
        return (
            <Text
                {...commonProps}
                text={obj.text}
                fontSize={obj.fontSize}
                fontFamily={obj.fontFamily || 'Arial'}
                width={obj.width}
                height={obj.height}
                fill={obj.fill || 'black'}
            />
        )
    }

    // Factory Assets - Scalable Logic
    // Adding a new type here is easy, or we can move this to a lookup map later.

    // Logistics Assets
    // Logistics Assets
    if (obj.type === 'agv') {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Rect
                    width={obj.width}
                    height={obj.height}
                    fill="#f59e0b"
                    cornerRadius={2}
                    stroke="black"
                    strokeWidth={1}
                />
                {/* Front Indicator */}
                <Rect
                    x={obj.width - 10}
                    y={0}
                    width={10}
                    height={obj.height}
                    fill="rgba(0,0,0,0.3)"
                    cornerRadius={[0, 2, 2, 0]}
                    listening={false}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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

    if (obj.type === 'amr') {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Rect
                    width={obj.width}
                    height={obj.height}
                    fill="#10b981"
                    cornerRadius={8}
                    stroke="black"
                    strokeWidth={1}
                />
                {/* Lidar/Sensor */}
                <Circle
                    x={obj.width / 2}
                    y={obj.height / 2}
                    radius={Math.min(obj.width, obj.height) * 0.25}
                    fill="rgba(0,0,0,0.15)"
                    listening={false}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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

    if (obj.type === 'lifter') {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Rect
                    width={obj.width}
                    height={obj.height}
                    fill="#06b6d4"
                    cornerRadius={4}
                    stroke="black"
                    strokeWidth={1}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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

    if (['conveyor', 'rail'].includes(obj.type)) {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Rect
                    width={obj.width}
                    height={obj.height}
                    fill={obj.fill}
                    stroke="black"
                    strokeWidth={1}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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

    // Storage & Infra
    if (['stocker', 'rack', 'buffer', 'equipment', 'charger', 'oht', 'wall', 'pillar', 'material'].includes(obj.type)) {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Rect
                    width={obj.width}
                    height={obj.height}
                    fill={obj.fill}
                    stroke="#1e40af"
                    strokeWidth={2}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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

    if (['crane', 'port'].includes(obj.type)) {
        return (
            <Group {...commonProps} width={obj.width} height={obj.height}>
                <Circle
                    width={obj.width}
                    height={obj.height}
                    offsetX={-obj.width / 2}
                    offsetY={-obj.height / 2}
                    fill={obj.fill}
                    stroke="black"
                    strokeWidth={1}
                />
                {obj.showLabel && (
                    <Text
                        text={obj.name}
                        width={obj.width}
                        height={obj.height}
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

    // Fallback for unknown types
    return (
        <Rect
            {...commonProps}
            width={obj.width || 50}
            height={obj.height || 50}
            fill="#94a3b8"
            stroke="red"
            strokeWidth={1}
        />
    )
}
