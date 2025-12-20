import { useState, useEffect, useRef } from 'react'

export function useContainerDimensions() {
    const ref = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const element = ref.current
        if (!element) return

        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return
            const { width, height } = entries[0].contentRect
            setDimensions({ width, height })
        })

        resizeObserver.observe(element)

        return () => {
            if (element) resizeObserver.unobserve(element)
        }
    }, [])

    return { ref, dimensions }
}
