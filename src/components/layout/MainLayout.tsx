import { Header } from '@/components/panels/Header'
import { Sidebar } from '@/components/panels/Sidebar'
import { Inspector } from '@/components/panels/Inspector'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function MainLayout({ children }: { children: React.ReactNode }) {
    useKeyboardShortcuts()
    return (
        <div className="h-screen w-full flex flex-col bg-gray-50">
            <Header />
            <div className="flex-1 flex overflow-hidden relative">
                <Sidebar />
                <main className="flex-1 relative overflow-hidden bg-gray-100">
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}
                    />

                    {children}

                    <Inspector />
                </main>
            </div>
        </div>
    )
}
