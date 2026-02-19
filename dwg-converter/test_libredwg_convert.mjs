import fs from 'fs/promises'
import path from 'path'
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'

const dwgPath = '/tmp/arc_2004.dwg'
const bytes = await fs.readFile(dwgPath)
const wasmDir = path.resolve('./node_modules/@mlightcad/libredwg-web/wasm/')
const lib = await LibreDwg.create(wasmDir)
const ptr = lib.dwg_read_data(bytes, Dwg_File_Type.DWG)
if (!ptr) throw new Error('dwg_read_data failed')
const db = lib.convert(ptr)
lib.dwg_free(ptr)
const svg = lib.dwg_to_svg(db)
await fs.writeFile('/tmp/arc_2004.svg', svg, 'utf8')
console.log('svg-bytes', svg.length)
