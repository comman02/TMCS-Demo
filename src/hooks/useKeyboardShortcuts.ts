import { useEffect } from 'react'
import { useStore } from 'zustand'
import { useUIStore } from '@/store/useUIStore'

export function useKeyboardShortcuts() {
    const {
        copyObjects,
        pasteObjects,
        selectedIds,
        removeCanvasObject,
        updateCanvasObject,
        canvasObjects
    } = useUIStore()

    // Zundo temporal store
    // @ts-ignore
    const temporal = useStore(useUIStore.temporal, (state) => state)
    const { undo, redo } = temporal || { undo: () => { }, redo: () => { } }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input/textarea is focused
            if (
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement
            ) {
                return
            }

            const isCtrlOrCmd = e.ctrlKey || e.metaKey

            // Copy: Ctrl+C
            if (isCtrlOrCmd && e.key === 'c') {
                e.preventDefault()
                copyObjects()
                console.log('Copied')
            }

            // Paste: Ctrl+V
            if (isCtrlOrCmd && e.key === 'v') {
                e.preventDefault()
                pasteObjects()
                console.log('Pasted')
            }

            // Delete: Delete or Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault()
                if (selectedIds.length > 0) {
                    selectedIds.forEach(id => removeCanvasObject(id))
                }
            }

            // Undo: Ctrl+Z
            if (isCtrlOrCmd && e.key === 'z') {
                e.preventDefault()
                undo()
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((isCtrlOrCmd && e.key === 'y') || (isCtrlOrCmd && e.shiftKey && e.key === 'z')) {
                e.preventDefault()
                redo()
            }

            // Nudge: Arrow Keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (selectedIds.length === 0) return

                e.preventDefault()
                const step = e.shiftKey ? 10 : 1

                selectedIds.forEach(id => {
                    const obj = canvasObjects.find(o => o.id === id)
                    if (!obj) return

                    let newX = obj.x
                    let newY = obj.y

                    switch (e.key) {
                        case 'ArrowUp': newY -= step; break
                        case 'ArrowDown': newY += step; break
                        case 'ArrowLeft': newX -= step; break
                        case 'ArrowRight': newX += step; break
                    }
                    updateCanvasObject(id, { x: newX, y: newY })
                })
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [copyObjects, pasteObjects, selectedIds, removeCanvasObject, updateCanvasObject, canvasObjects, undo, redo])
}
