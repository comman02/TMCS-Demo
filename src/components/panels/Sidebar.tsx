import { useState } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { cn } from '@/lib/utils'
import {
    ChevronLeft,
    ChevronRight,
    MousePointer2,
    Square,
    Circle,
    Type,
    Truck, // AGV/AMR
    Container, // Stocker/Buffer
    Cable, // Conveyor/Rail
    ArrowRightLeft, // Port
    ChevronDown,
    Box,
    Cpu, // Equipment
    Construction,
    ArrowUpFromLine, // Lifter
    BatteryCharging, // Charger
    BrickWall, // Wall
    Columns, // Pillar
    Plus,
    Trash2,
    Layers,
    Cuboid
} from 'lucide-react'

// Define Asset Categories
const CATEGORIES = [
    {
        id: 'basic',
        label: 'Basic Tools',
        items: [
            { id: 'select', icon: MousePointer2, label: 'Select' },
            { id: 'connect', icon: ArrowRightLeft, label: 'Connect' },
            { id: 'rect', icon: Square, label: 'Rectangle Area' },
            { id: 'circle', icon: Circle, label: 'Circle Area' },
            { id: 'text', icon: Type, label: 'Text' },
        ]
    },
    {
        id: 'logistics',
        label: 'Logistics',
        items: [
            { id: 'agv', icon: Truck, label: 'AGV' },
            { id: 'amr', icon: Truck, label: 'AMR' },
            { id: 'conveyor', icon: Cable, label: 'Conveyor' },
            { id: 'oht', icon: Box, label: 'OHT' },
            { id: 'lifter', icon: ArrowUpFromLine, label: 'Lifter' },
            { id: 'crane', icon: Construction, label: 'Crane' },
        ]
    },
    {
        id: 'storage',
        label: 'Storage',
        items: [
            { id: 'buffer', icon: Box, label: 'Buffer' },
            { id: 'stocker', icon: Container, label: 'Stocker' },
        ]
    },
    {
        id: 'infra',
        label: 'Infrastructure',
        items: [
            { id: 'charger', icon: BatteryCharging, label: 'Charger' },
            { id: 'equipment', icon: Cpu, label: 'Equipment' },
            { id: 'rail', icon: Cable, label: 'OHT Rail' },
            { id: 'port', icon: ArrowRightLeft, label: 'Port' },
            { id: 'wall', icon: BrickWall, label: 'Wall' },
            { id: 'pillar', icon: Columns, label: 'Pillar' },
            { id: 'material', icon: Box, label: 'Material' },
        ]
    }
]



export function Sidebar() {
    const {
        isSidebarOpen,
        toggleSidebar,
        activeTool,
        setActiveTool,
        assets,
        addAssetPreset,
        removeAssetPreset,
        activeAssetId,
        setActiveAssetId,
        layers,
        activeLayerId,
        setActiveLayerId,
        addLayer,
        removeLayer
    } = useUIStore()
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic', 'logistics'])
    const [activeTab, setActiveTab] = useState<'assets' | 'layers'>('assets')

    const toggleCategory = (catId: string) => {
        if (!isSidebarOpen) return
        setExpandedCategories(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        )
    }

    return (
        <div
            className={cn(
                "h-[calc(100vh-3.5rem)] bg-white border-r flex flex-col transition-all duration-300 relative select-none",
                isSidebarOpen ? "w-64" : "w-16"
            )}
        >
            {/* Tabs */}
            {isSidebarOpen && (
                <div className="flex border-b bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={cn(
                            "flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors",
                            activeTab === 'assets'
                                ? "border-blue-600 text-blue-600 bg-white"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Cuboid size={14} /> Components
                    </button>
                    <button
                        onClick={() => setActiveTab('layers')}
                        className={cn(
                            "flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors",
                            activeTab === 'layers'
                                ? "border-blue-600 text-blue-600 bg-white"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Layers size={14} /> Floors
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-2">
                {(!isSidebarOpen || activeTab === 'assets') ? (
                    // ASSETS TAB CONTENT
                    <>
                        {CATEGORIES.map(category => (
                            <div key={category.id} className="mb-2">
                                {/* Category Header */}
                                {isSidebarOpen && (
                                    <button
                                        onClick={() => toggleCategory(category.id)}
                                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 uppercase tracking-wider"
                                    >
                                        <span>{category.label}</span>
                                        <ChevronDown
                                            size={14}
                                            className={cn("transition-transform", !expandedCategories.includes(category.id) && "-rotate-90")}
                                        />
                                    </button>
                                )}

                                {/* Items */}
                                <div className={cn(
                                    "px-2 space-y-1 transition-all",
                                    isSidebarOpen && !expandedCategories.includes(category.id) ? "hidden" : "block"
                                )}>
                                    {category.items.map((tool) => {
                                        // Basic tools (Select, Rect...) are NOT hierarchical assets in this context?
                                        // User said "Logistics, Storage, Infra objects".
                                        // So "Basic" category might behave simply.
                                        const isBasic = category.id === 'basic'
                                        const toolPresets = isBasic ? [] : assets.filter(a => a.type === tool.id)

                                        if (isBasic) {
                                            return (
                                                <button
                                                    key={tool.id}
                                                    onClick={() => setActiveTool(tool.id)}
                                                    draggable={tool.id !== 'select'}
                                                    onDragStart={(e) => e.dataTransfer.setData('type', tool.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors group relative",
                                                        activeTool === tool.id
                                                            ? "bg-blue-50 text-blue-600"
                                                            : "text-gray-600 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
                                                    <span className={cn("text-sm font-medium transition-opacity", isSidebarOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>
                                                        {tool.label}
                                                    </span>
                                                </button>
                                            )
                                        }

                                        return (
                                            <div key={tool.id} className="mb-1">
                                                {/* Root Type (Non-draggable, Add Button) */}
                                                <div className={cn(
                                                    "flex items-center justify-between px-2 py-1.5 rounded-md text-gray-700 hover:bg-gray-100 group select-none",
                                                    activeTool === tool.id ? "bg-gray-100" : ""
                                                )}>
                                                    <div className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1"
                                                        onClick={() => setActiveTool(tool.id)}
                                                    >
                                                        <tool.icon size={16} className={cn(activeTool === tool.id ? "text-blue-600" : "text-gray-500")} />
                                                        <span className={cn("text-sm font-medium transition-all", isSidebarOpen ? "opacity-100" : "opacity-0 w-0")}>{tool.label}</span>
                                                    </div>

                                                    {isSidebarOpen && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                addAssetPreset(tool.id, `${tool.label} ${toolPresets.length + 1}`)
                                                            }}
                                                            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Create Sub-object"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Presets (Draggable) */}
                                                {isSidebarOpen && (
                                                    <div className="pl-8 space-y-0.5 mt-0.5 border-l border-gray-100 ml-3">
                                                        {toolPresets.length === 0 && (
                                                            <div className="text-[10px] text-gray-400 py-1 pl-2 italic">No presets</div>
                                                        )}
                                                        {toolPresets.map(preset => (
                                                            <div
                                                                key={preset.id}
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData('type', preset.type)
                                                                    e.dataTransfer.setData('presetId', preset.id)
                                                                    setActiveAssetId(preset.id) // Auto-select on drag? Sure.
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveAssetId(preset.id)
                                                                }}
                                                                className={cn(
                                                                    "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer border transition-colors group/item",
                                                                    activeAssetId === preset.id
                                                                        ? "bg-blue-100 text-blue-700 border-blue-200"
                                                                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-700 border-transparent hover:border-blue-100"
                                                                )}
                                                            >
                                                                <span className="truncate">{preset.name}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        removeAssetPreset(preset.id)
                                                                    }}
                                                                    className="hidden group-hover/item:block p-0.5 hover:text-red-500 rounded bg-white/50"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                {isSidebarOpen && <div className="h-px bg-gray-100 mx-4 my-2" />}
                            </div>
                        ))}
                    </>
                ) : (
                    // LAYERS TAB CONTENT
                    <div className="px-3 space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Floor Structure</span>
                            <button
                                onClick={() => addLayer(`Floor ${layers.length + 1}`)}
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded bg-gray-50 border border-gray-100 transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {layers.map(layer => (
                                <div
                                    key={layer.uid}
                                    onClick={() => setActiveLayerId(layer.id)}
                                    className={cn(
                                        "flex items-center justify-between p-2 rounded-md border text-sm cursor-pointer transition-all group",
                                        activeLayerId === layer.id
                                            ? "bg-blue-50 border-blue-200 shadow-sm"
                                            : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200"
                                    )}
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            {layer.type === 'common' && <Layers size={14} className="text-blue-500" />}
                                            <span className={cn("font-medium truncate", activeLayerId === layer.id ? "text-blue-700" : "text-gray-700")}>
                                                {layer.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-mono truncate pl-0.5">
                                            {layer.type === 'common' ? 'Default / Skeleton' : layer.id}
                                        </span>
                                    </div>

                                    {layer.type !== 'common' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeLayer(layer.id)
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-6 bg-white border shadow-sm p-1 rounded-full text-gray-500 hover:text-gray-900 z-10"
            >
                {(!isSidebarOpen) ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </div>
    )
}
