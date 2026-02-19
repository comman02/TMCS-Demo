import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'

interface CropRect {
    x: number
    y: number
    width: number
    height: number
}

interface CadImportModalProps {
    imageSrc: string
    imageName: string
    naturalWidth: number
    naturalHeight: number
    onCancel: () => void
    onApply: (crop: CropRect) => void
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

export function CadImportModal({
    imageSrc,
    imageName,
    naturalWidth,
    naturalHeight,
    onCancel,
    onApply,
}: CadImportModalProps) {
    const stageRef = useRef<HTMLDivElement>(null)
    const [crop, setCrop] = useState<CropRect>({
        x: 0,
        y: 0,
        width: naturalWidth,
        height: naturalHeight,
    })
    const [stageSize, setStageSize] = useState({ width: 1, height: 1 })
    const [dragState, setDragState] = useState<{
        mode: 'draw' | 'move'
        startX: number
        startY: number
        startCrop: CropRect
    } | null>(null)

    useEffect(() => {
        const el = stageRef.current
        if (!el) return
        const applySize = () => {
            setStageSize({
                width: el.clientWidth || 1,
                height: el.clientHeight || 1,
            })
        }
        applySize()
        const observer = new ResizeObserver(applySize)
        observer.observe(el)
        return () => observer.disconnect()
    }, [imageSrc])

    const displayCrop = useMemo(() => {
        const sx = stageSize.width / naturalWidth
        const sy = stageSize.height / naturalHeight
        return {
            x: crop.x * sx,
            y: crop.y * sy,
            width: crop.width * sx,
            height: crop.height * sy,
        }
    }, [crop, naturalWidth, naturalHeight, stageSize.width, stageSize.height])

    const toNatural = (clientX: number, clientY: number) => {
        const el = stageRef.current
        if (!el) return { x: 0, y: 0 }
        const rect = el.getBoundingClientRect()
        const px = clamp(clientX - rect.left, 0, rect.width)
        const py = clamp(clientY - rect.top, 0, rect.height)
        return {
            x: (px / rect.width) * naturalWidth,
            y: (py / rect.height) * naturalHeight,
        }
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        const point = toNatural(e.clientX, e.clientY)

        const inside =
            point.x >= crop.x &&
            point.x <= crop.x + crop.width &&
            point.y >= crop.y &&
            point.y <= crop.y + crop.height

        if (inside) {
            setDragState({
                mode: 'move',
                startX: point.x,
                startY: point.y,
                startCrop: crop,
            })
        } else {
            setDragState({
                mode: 'draw',
                startX: point.x,
                startY: point.y,
                startCrop: crop,
            })
            setCrop({ x: point.x, y: point.y, width: 1, height: 1 })
        }

        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragState) return
        const point = toNatural(e.clientX, e.clientY)

        if (dragState.mode === 'draw') {
            const x1 = Math.min(dragState.startX, point.x)
            const y1 = Math.min(dragState.startY, point.y)
            const x2 = Math.max(dragState.startX, point.x)
            const y2 = Math.max(dragState.startY, point.y)
            setCrop({
                x: clamp(x1, 0, naturalWidth - 1),
                y: clamp(y1, 0, naturalHeight - 1),
                width: Math.max(1, clamp(x2, 1, naturalWidth) - clamp(x1, 0, naturalWidth - 1)),
                height: Math.max(1, clamp(y2, 1, naturalHeight) - clamp(y1, 0, naturalHeight - 1)),
            })
            return
        }

        const dx = point.x - dragState.startX
        const dy = point.y - dragState.startY
        const nextX = clamp(dragState.startCrop.x + dx, 0, naturalWidth - dragState.startCrop.width)
        const nextY = clamp(dragState.startCrop.y + dy, 0, naturalHeight - dragState.startCrop.height)
        setCrop((prev) => ({ ...prev, x: nextX, y: nextY }))
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragState) return
        setDragState(null)
        e.currentTarget.releasePointerCapture(e.pointerId)
    }

    const updateCropField = (field: keyof CropRect, value: number) => {
        const next = { ...crop, [field]: value }
        const x = clamp(next.x, 0, naturalWidth - 1)
        const y = clamp(next.y, 0, naturalHeight - 1)
        const width = clamp(next.width, 1, naturalWidth - x)
        const height = clamp(next.height, 1, naturalHeight - y)
        setCrop({ x, y, width, height })
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-[min(1100px,95vw)] bg-white rounded-xl shadow-2xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-gray-800">CAD Import Crop</p>
                        <p className="text-xs text-gray-500 truncate max-w-[65vw]">
                            {imageName} ({naturalWidth} x {naturalHeight}px)
                        </p>
                    </div>
                    <button
                        onClick={() => setCrop({ x: 0, y: 0, width: naturalWidth, height: naturalHeight })}
                        className="text-xs px-2.5 py-1.5 border rounded-md hover:bg-gray-100 flex items-center gap-1 text-gray-700"
                    >
                        <Maximize2 size={12} /> Full
                    </button>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                    <div className="border rounded-lg bg-gray-100 p-2 flex items-center justify-center overflow-hidden">
                        <div className="relative max-w-full max-h-[70vh]">
                            <img src={imageSrc} alt="cad preview" className="block max-w-full max-h-[70vh] object-contain" />
                            <div
                                ref={stageRef}
                                className="absolute inset-0 cursor-crosshair"
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                            >
                                <div
                                    className="absolute border-2 border-blue-500 bg-blue-500/15"
                                    style={{
                                        left: `${displayCrop.x}px`,
                                        top: `${displayCrop.y}px`,
                                        width: `${displayCrop.width}px`,
                                        height: `${displayCrop.height}px`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">Crop (pixels)</p>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs text-gray-500">X</label>
                            <input
                                type="number"
                                className="px-2 py-1.5 border rounded-md text-sm"
                                value={Math.round(crop.x)}
                                onChange={(e) => updateCropField('x', Number(e.target.value))}
                            />
                            <label className="text-xs text-gray-500">Y</label>
                            <input
                                type="number"
                                className="px-2 py-1.5 border rounded-md text-sm"
                                value={Math.round(crop.y)}
                                onChange={(e) => updateCropField('y', Number(e.target.value))}
                            />
                            <label className="text-xs text-gray-500">Width</label>
                            <input
                                type="number"
                                className="px-2 py-1.5 border rounded-md text-sm"
                                value={Math.round(crop.width)}
                                onChange={(e) => updateCropField('width', Number(e.target.value))}
                            />
                            <label className="text-xs text-gray-500">Height</label>
                            <input
                                type="number"
                                className="px-2 py-1.5 border rounded-md text-sm"
                                value={Math.round(crop.height)}
                                onChange={(e) => updateCropField('height', Number(e.target.value))}
                            />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            빈 공간에서 드래그하면 새 영역을 선택합니다. 선택 영역 안에서 드래그하면 이동합니다.
                        </p>
                    </div>
                </div>

                <div className="px-4 py-3 border-t bg-gray-50 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onApply(crop)}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Apply To Canvas
                    </button>
                </div>
            </div>
        </div>
    )
}
