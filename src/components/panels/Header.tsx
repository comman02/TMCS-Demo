import { useRef } from 'react'
import { Box, Settings, Save, Upload, Image as ImageIcon, Undo, Redo, MousePointer2, Hand } from 'lucide-react'
import { useStore } from 'zustand'
import { useUIStore } from '@/store/useUIStore'
import { useFileSystem } from '@/hooks/useFileSystem'
import { cn } from '@/lib/utils'

export function Header() {
    const { canvasObjects, setCanvasObjects, layers, activeLayerId, setActiveLayerId, viewMode, setViewMode } = useUIStore()

    const temporal = useStore(useUIStore.temporal, (state) => state)
    const { undo, redo, pastStates, futureStates } = temporal || { undo: () => { }, redo: () => { }, pastStates: [], futureStates: [] }
    const { showSaveFilePicker } = useFileSystem()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const canUndo = pastStates.length > 0
    const canRedo = futureStates.length > 0

    // Save as JSON
    const handleSave = async () => {
        const data = JSON.stringify(canvasObjects, null, 2)
        await showSaveFilePicker(data)
    }

    // Load JSON
    const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string)
                if (Array.isArray(json)) {
                    setCanvasObjects(json)
                } else {
                    alert('Invalid JSON format')
                }
            } catch (err) {
                console.error(err)
                alert('Failed to parse JSON')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const handleExportImage = () => {
        window.dispatchEvent(new Event('tmcs-export-image'))
    }

    return (
        <header className="h-14 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-sm">
                    <Box size={20} />
                </div>
                <span className="font-bold text-gray-800 tracking-tight">TMCS Designer</span>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => undo()}
                    disabled={!canUndo}
                    className="p-1.5 hover:bg-white rounded-md text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={18} />
                </button>
                <button
                    onClick={() => redo()}
                    disabled={!canRedo}
                    className="p-1.5 hover:bg-white rounded-md text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={18} />
                </button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <button className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-all"><MousePointer2 size={18} /></button>
                <button className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-all"><Hand size={18} /></button>
            </div>

            {/* Floor & View Mode Selector */}
            <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                <select
                    className="bg-white border text-xs rounded px-2 py-1.5 font-medium min-w-[100px] focus:ring-2 focus:ring-blue-500 outline-none"
                    value={activeLayerId}
                    onChange={(e) => setActiveLayerId(e.target.value)}
                >
                    {layers.map(layer => (
                        <option key={layer.uid} value={layer.id}>{layer.name}</option>
                    ))}
                </select>

                <div className="h-4 w-px bg-gray-300" />

                <div className="flex bg-gray-200 p-0.5 rounded-md">
                    <button
                        onClick={() => setViewMode('bottom')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded transition-all",
                            viewMode === 'bottom' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Bottom
                    </button>
                    <button
                        onClick={() => setViewMode('top')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded transition-all",
                            viewMode === 'top' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Top
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                    <button
                        onClick={handleSave}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-blue-600 transition-all"
                        title="Save JSON"
                    >
                        <Save size={18} />
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-blue-600 transition-all"
                        title="Load JSON"
                    >
                        <Upload size={18} />
                    </button>
                    <button
                        onClick={handleExportImage}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-blue-600 transition-all"
                        title="Export Image"
                    >
                        <ImageIcon size={18} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleLoad}
                    />
                </div>

                <div className="h-4 w-px bg-gray-200" />

                <button className="p-2 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors">
                    <Settings size={18} />
                </button>
            </div>
        </header>
    )
}
