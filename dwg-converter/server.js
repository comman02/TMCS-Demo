import cors from 'cors'
import express from 'express'
import multer from 'multer'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const app = express()
const upload = multer({ storage: multer.memoryStorage() })

const PORT = Number(process.env.PORT || 8001)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
const MAX_INLINE_SVG_BYTES = Number(process.env.MAX_INLINE_SVG_BYTES || 6_000_000)
const MAX_RASTER_DIM = Number(process.env.MAX_RASTER_DIM || 8192)
const SVG_RASTER_DENSITY = Number(process.env.SVG_RASTER_DENSITY || 180)
const libredwgWasmDir = path.resolve('./node_modules/@mlightcad/libredwg-web/wasm/')
let libredwgInstancePromise = null

app.use(
    cors({
        origin: ALLOWED_ORIGIN,
        credentials: true,
    })
)

app.get('/health', (_req, res) => {
    res.json({ ok: true })
})

function commandToParts(command) {
    // Simple splitter for quoted strings: "a b" c -> ["a b", "c"]
    const parts = []
    let current = ''
    let quote = null
    for (const ch of command.trim()) {
        if ((ch === '"' || ch === "'") && !quote) {
            quote = ch
            continue
        }
        if (ch === quote) {
            quote = null
            continue
        }
        if (ch === ' ' && !quote) {
            if (current) {
                parts.push(current)
                current = ''
            }
            continue
        }
        current += ch
    }
    if (current) parts.push(current)
    return parts
}

async function getLibreDwg() {
    if (!libredwgInstancePromise) {
        libredwgInstancePromise = LibreDwg.create(libredwgWasmDir)
    }
    return libredwgInstancePromise
}

function normalizeSvgForVisibility(svg) {
    // Convert pure white line/fill to dark gray so it is visible on bright canvas backgrounds.
    return svg
        .replaceAll('rgb(255,255,255)', 'rgb(30,41,59)')
        .replaceAll('#ffffff', '#1e293b')
        .replaceAll('#FFF', '#1e293b')
}

function parseViewBoxSize(svg) {
    const match = svg.match(/viewBox="([^"]+)"/i)
    if (!match) return null
    const parts = match[1].trim().split(/\s+/).map(Number)
    if (parts.length !== 4 || !parts.every(Number.isFinite)) return null
    const width = Math.abs(parts[2])
    const height = Math.abs(parts[3])
    if (width <= 0 || height <= 0) return null
    return { width, height }
}

function computeRasterSize(width, height, maxDim) {
    const scale = Math.min(1, maxDim / Math.max(width, height))
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    }
}

async function svgToPng(svg) {
    const vb = parseViewBoxSize(svg)
    const fallback = { width: 2048, height: 1152 }
    const target = vb ? computeRasterSize(vb.width, vb.height, MAX_RASTER_DIM) : fallback

    // Enforce explicit output size so percent-based width/height SVG renders predictably.
    const normalizedSvg = svg
        .replace(/width="[^"]*"/i, `width="${target.width}"`)
        .replace(/height="[^"]*"/i, `height="${target.height}"`)
        // Fix invalid XML entities sometimes emitted from CAD text payloads.
        .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9A-Fa-f]+);)/g, '&amp;')

    return sharp(Buffer.from(normalizedSvg), {
        density: SVG_RASTER_DENSITY,
        limitInputPixels: false,
    })
        .resize(target.width, target.height, { fit: 'fill' })
        .png({ compressionLevel: 9, quality: 90 })
        .toBuffer()
}

async function convertDwgBufferToSvg(buffer) {
    const lib = await getLibreDwg()
    const ptr = lib.dwg_read_data(buffer, Dwg_File_Type.DWG)
    if (!ptr) {
        throw new Error('Failed to parse DWG data')
    }

    try {
        const db = lib.convert(ptr)
        const svg = lib.dwg_to_svg(db)
        if (!svg || !svg.includes('<svg')) {
            throw new Error('DWG converted but SVG output is empty')
        }
        return normalizeSvgForVisibility(svg)
    } finally {
        lib.dwg_free(ptr)
    }
}

async function runDwgToSvg({ inputPath, outputPath, workDir }) {
    const custom = process.env.DWG_TO_SVG_CMD
    if (!custom) {
        throw new Error(
            'DWG_TO_SVG_CMD is not set. Example: DWG_TO_SVG_CMD="python3 /opt/convert.py {input} {output}"'
        )
    }

    const replaced = custom
        .replaceAll('{input}', inputPath)
        .replaceAll('{output}', outputPath)
        .replaceAll('{workdir}', workDir)

    const parts = commandToParts(replaced)
    if (parts.length === 0) {
        throw new Error('DWG_TO_SVG_CMD is empty after placeholder replacement.')
    }

    const [cmd, ...args] = parts
    await execFileAsync(cmd, args)
}

app.post('/convert-dwg', upload.single('file'), async (req, res) => {
    const file = req.file
    if (!file) {
        res.status(400).json({ message: 'file is required' })
        return
    }

    const ext = path.extname(file.originalname).toLowerCase()
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmcs-dwg-'))

    try {
        if (ext === '.svg') {
            res.type('image/svg+xml').send(file.buffer)
            return
        }

        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
            res.type(file.mimetype).send(file.buffer)
            return
        }

        if (ext !== '.dwg') {
            res.status(400).json({ message: `Unsupported extension: ${ext}` })
            return
        }

        let svg
        if (process.env.DWG_TO_SVG_CMD) {
            // Optional external converter path (e.g. ODA/LibreDWG)
            const inputPath = path.join(tmpDir, 'input.dwg')
            const outputPath = path.join(tmpDir, 'output.svg')
            await fs.writeFile(inputPath, file.buffer)
            await runDwgToSvg({ inputPath, outputPath, workDir: tmpDir })
            await fs.access(outputPath)
            svg = await fs.readFile(outputPath, 'utf8')
        } else {
            // Default converter path based on libredwg-web (WASM in node)
            svg = await convertDwgBufferToSvg(file.buffer)
        }

        if (svg.length > MAX_INLINE_SVG_BYTES) {
            try {
                const png = await svgToPng(svg)
                res.type('image/png').send(png)
                return
            } catch (rasterError) {
                console.warn('SVG rasterization failed, fallback to SVG response:', rasterError)
            }
        }

        res.type('image/svg+xml').send(svg)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown conversion error'
        res.status(500).json({
            message: 'DWG conversion failed',
            detail: message,
        })
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true })
    }
})

app.listen(PORT, () => {
    console.log(`DWG converter listening on http://localhost:${PORT}`)
})
