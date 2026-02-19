interface DwgImportResult {
    src: string
    width?: number
    height?: number
    name: string
}

async function loadImageDimensions(src: string): Promise<{ width?: number; height?: number }> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => resolve({})
        img.src = src
    })
}

function parseSvgNumber(value?: string | null): number | undefined {
    if (!value) return undefined
    const num = Number(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(num) && num > 0 ? num : undefined
}

function parseSvgDimensions(svgText: string): { width?: number; height?: number } {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return {}

    const width = parseSvgNumber(svg.getAttribute('width'))
    const height = parseSvgNumber(svg.getAttribute('height'))
    if (width && height) return { width, height }

    const viewBox = svg.getAttribute('viewBox')
    if (!viewBox) return {}
    const parts = viewBox.split(/\s+/).map(Number)
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
        return { width: Math.abs(parts[2]), height: Math.abs(parts[3]) }
    }
    return {}
}

export function useDwgImport() {
    const convertDwgToOverlay = async (file: File): Promise<DwgImportResult> => {
        const configuredEndpoint = (import.meta as ImportMeta & {
            env?: Record<string, string | undefined>
        }).env?.VITE_DWG_CONVERTER_URL
        const endpoint = configuredEndpoint || 'http://localhost:8001/convert-dwg'

        const formData = new FormData()
        formData.append('file', file)

        let response: Response
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            })
        } catch {
            throw new Error(`DWG converter is unreachable: ${endpoint}`)
        }

        if (!response.ok) {
            let detail = ''
            try {
                const json = await response.json() as { message?: string; detail?: string }
                detail = [json.message, json.detail].filter(Boolean).join(' - ')
            } catch {
                // no-op
            }
            throw new Error(
                detail
                    ? `DWG conversion failed (${response.status}): ${detail}`
                    : `DWG conversion failed (${response.status})`
            )
        }

        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            const payload = await response.json() as {
                svg?: string
                url?: string
                width?: number
                height?: number
            }

            if (payload.svg) {
                const blob = new Blob([payload.svg], { type: 'image/svg+xml' })
                const src = URL.createObjectURL(blob)
                const dims = parseSvgDimensions(payload.svg)
                return {
                    src,
                    width: payload.width || dims.width,
                    height: payload.height || dims.height,
                    name: file.name.replace(/\.dwg$/i, ''),
                }
            }

            if (payload.url) {
                return {
                    src: payload.url,
                    width: payload.width,
                    height: payload.height,
                    name: file.name.replace(/\.dwg$/i, ''),
                }
            }

            throw new Error('Converter JSON must include svg or url.')
        }

        if (contentType.includes('image/svg+xml') || contentType.includes('text/plain')) {
            const svgText = await response.text()
            const blob = new Blob([svgText], { type: 'image/svg+xml' })
            const src = URL.createObjectURL(blob)
            const dims = parseSvgDimensions(svgText)
            return {
                src,
                width: dims.width,
                height: dims.height,
                name: file.name.replace(/\.dwg$/i, ''),
            }
        }

        if (contentType.startsWith('image/')) {
            const blob = await response.blob()
            const src = URL.createObjectURL(blob)
            const dims = await loadImageDimensions(src)
            return {
                src,
                width: dims.width,
                height: dims.height,
                name: file.name.replace(/\.dwg$/i, ''),
            }
        }

        throw new Error(`Unsupported converter response type: ${contentType}`)
    }

    return { convertDwgToOverlay }
}
