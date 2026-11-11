import fs from 'fs'
import { PassThrough } from 'stream'
import { Bitmap, decodeJPEGFromStream, decodePNGFromStream } from 'pureimage'
// @ts-ignore - pngjs does not ship its own type declarations
import { PNG } from 'pngjs'
import { encode as encodeJpeg } from 'jpeg-js'

/* vibecoded */
/**
 * A small @napi-rs/canvas-compatible facade over pureimage.
 *
 * Only the surface used by CrossNode is implemented:
 *   - createCanvas() -> Canvas (a pureimage Bitmap with encoding helpers)
 *   - Image          -> loads files / data URLs into a Bitmap
 *
 * Known gaps compared to Skia: createPattern(), globalCompositeOperation,
 * WebP, and strict Canvas 2D text metrics.
 */

export type SKRSContext2D = any

type ImageFormat = 'png' | 'jpeg'

const normalizeFormat = (type?: string): ImageFormat => {
    if (!type) return 'png'
    const lower = type.toLowerCase()
    return lower.includes('jpeg') || lower.includes('jpg') ? 'jpeg' : 'png'
}

const streamOf = (data: Uint8Array): PassThrough => {
    const stream = new PassThrough()
    stream.end(Buffer.from(data))
    return stream
}

const stripQuery = (src: string): string => src.split('?')[0].split('#')[0]

const decodeBitmap = async (data: Uint8Array, format: ImageFormat | 'unknown'): Promise<Bitmap> => {
    if (format === 'jpeg') return decodeJPEGFromStream(streamOf(data))
    if (format === 'png') return decodePNGFromStream(streamOf(data))

    // Unknown extension: try both decoders, starting with the most common one.
    try {
        return await decodePNGFromStream(streamOf(data))
    } catch {
        return await decodeJPEGFromStream(streamOf(data))
    }
}

const dataUrlParts = (src: string): { data: Buffer; format: ImageFormat } => {
    const comma = src.indexOf(',')
    if (comma < 0) throw new Error('Invalid data URL')

    const meta = src.slice('data:'.length, comma)
    const payload = src.slice(comma + 1)
    const format = meta.startsWith('image/jpeg') || meta.startsWith('image/jpg') ? 'jpeg' : 'png'
    const data = meta.includes('base64') ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload))
    return { data, format }
}

const pathFromSrc = (src: string): string => {
    let path = stripQuery(src)
    if (path.startsWith('file://')) {
        path = path.slice('file://'.length)
        // file://localhost/abs -> /abs
        if (path.startsWith('localhost/')) path = path.slice('localhost'.length)
    }

    try {
        return decodeURIComponent(path)
    } catch {
        return path
    }
}

const loadBitmap = async (src: string): Promise<Bitmap> => {
    if (src.startsWith('data:')) {
        const { data, format } = dataUrlParts(src)
        return decodeBitmap(data, format)
    }

    const path = pathFromSrc(src)
    const lower = stripQuery(path).toLowerCase()
    const format: ImageFormat | 'unknown' = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'jpeg' : lower.endsWith('.png') ? 'png' : 'unknown'

    // Reading straight from the file stream is the path that is known to work
    // under Porffor; PassThrough is only needed for in-memory data URLs.
    if (format === 'jpeg') return decodeJPEGFromStream(fs.createReadStream(path))
    if (format === 'png') return decodePNGFromStream(fs.createReadStream(path))
    return decodeBitmap(fs.readFileSync(path), 'unknown')
}

const transparentBitmap = (width: number, height: number): Bitmap => {
    const w = Math.max(0, Math.floor(width) || 0)
    const h = Math.max(0, Math.floor(height) || 0)
    const bitmap = new Bitmap(w, h)
    // A fresh HTML canvas is transparent black, while pureimage starts opaque black.
    bitmap.data = new Uint8Array(w * h * 4)
    return bitmap
}

/** Our Canvas/Image wrappers keep the real bitmap in `.bitmap`. */
const unwrapBitmap = (source: any): any => (source && source.bitmap ? source.bitmap : source)

/**
 * A bounds-safe replacement for pureimage's drawImage.
 *
 * pureimage 0.4.20 samples the source with exclusive edges treated as
 * inclusive (`x == width`), which throws "Invalid Index" for perfectly valid
 * drawImage calls. It also does not clip the source rect, so cropping past the
 * edge of a sprite sheet fails.
 *
 * This implementation maps every destination pixel to a source pixel with
 * nearest-neighbour sampling, clipping both the destination (to the canvas)
 * and the source (to the image). Blending is done straight on the RGBA byte
 * buffers: pureimage's `composite()` allocates several arrays per pixel, which
 * makes full-screen blits (the game's main cost) an order of magnitude slower.
 */
const drawImagePixels = (
    ctx: any,
    source: any,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
): void => {
    if (!(sw > 0) || !(sh > 0) || dw === 0 || dh === 0) return

    const sourceWidth = source.width | 0
    const sourceHeight = source.height | 0
    if (sourceWidth <= 0 || sourceHeight <= 0) return

    const dest: Bitmap = ctx._bitmap
    const destWidth = dest.width | 0
    const destHeight = dest.height | 0
    if (destWidth <= 0 || destHeight <= 0) return

    const sourceData: Uint8Array = source.data
    const destData: Uint8Array = dest.data
    if (!sourceData || !destData) return

    let globalAlpha = ctx._globalAlpha
    if (typeof globalAlpha !== 'number' || globalAlpha > 1) globalAlpha = 1
    else if (!(globalAlpha > 0)) return

    // pureimage has no globalCompositeOperation support at all: assignments are
    // ignored. CrossCode relies on it for its lighting layer (drawn with
    // 'lighter'), glow caches ('destination-in') and tinted image fragments
    // ('source-atop'), so the common modes are implemented here.
    const operation = typeof ctx.globalCompositeOperation === 'string' ? ctx.globalCompositeOperation : 'source-over'

    /** Replace one pixel using the current composite operation. */
    let blend: (sourceOffset: number, destOffset: number) => void

    if (operation === 'lighter') {
        // Plus-lighter: add premultiplied colours, clamp the result.
        blend = (sourceOffset: number, destOffset: number): void => {
            const sourceAlpha = sourceData[sourceOffset + 3]
            if (sourceAlpha === 0) return

            const sa = (sourceAlpha / 255) * globalAlpha
            const da = destData[destOffset + 3] / 255
            const sumAlpha = sa + da
            if (!(sumAlpha > 0)) return

            const scale = 1 / Math.min(1, sumAlpha)
            const r = sourceData[sourceOffset] * sa + destData[destOffset] * da
            const g = sourceData[sourceOffset + 1] * sa + destData[destOffset + 1] * da
            const b = sourceData[sourceOffset + 2] * sa + destData[destOffset + 2] * da
            destData[destOffset] = Math.min(255, (r * scale + 0.5) | 0)
            destData[destOffset + 1] = Math.min(255, (g * scale + 0.5) | 0)
            destData[destOffset + 2] = Math.min(255, (b * scale + 0.5) | 0)
            destData[destOffset + 3] = (Math.min(1, sumAlpha) * 255 + 0.5) | 0
        }
    } else if (operation === 'source-atop') {
        // Draw the source only where the destination is already opaque; the
        // destination's alpha is preserved.
        blend = (sourceOffset: number, destOffset: number): void => {
            const destAlpha = destData[destOffset + 3]
            if (destAlpha === 0) return

            const sourceAlpha = sourceData[sourceOffset + 3]
            const sa = (sourceAlpha / 255) * globalAlpha
            if (sa === 0) return

            const inv = 1 - sa
            destData[destOffset] = (sourceData[sourceOffset] * sa + destData[destOffset] * inv + 0.5) | 0
            destData[destOffset + 1] = (sourceData[sourceOffset + 1] * sa + destData[destOffset + 1] * inv + 0.5) | 0
            destData[destOffset + 2] = (sourceData[sourceOffset + 2] * sa + destData[destOffset + 2] * inv + 0.5) | 0
        }
    } else if (operation === 'destination-in') {
        // Keep the destination only where the source is opaque.
        blend = (sourceOffset: number, destOffset: number): void => {
            const sa = (sourceData[sourceOffset + 3] / 255) * globalAlpha
            destData[destOffset + 3] = (destData[destOffset + 3] * sa + 0.5) | 0
        }
    } else if (operation === 'destination-out') {
        // Erase the destination where the source is opaque.
        blend = (sourceOffset: number, destOffset: number): void => {
            const sa = (sourceData[sourceOffset + 3] / 255) * globalAlpha
            destData[destOffset + 3] = (destData[destOffset + 3] * (1 - sa) + 0.5) | 0
        }
    } else if (operation === 'copy') {
        blend = (sourceOffset: number, destOffset: number): void => {
            const sa = (sourceData[sourceOffset + 3] / 255) * globalAlpha
            destData[destOffset] = sourceData[sourceOffset]
            destData[destOffset + 1] = sourceData[sourceOffset + 1]
            destData[destOffset + 2] = sourceData[sourceOffset + 2]
            destData[destOffset + 3] = (sa * 255 + 0.5) | 0
        }
    } else {
        // Source-over, the default.
        blend = (sourceOffset: number, destOffset: number): void => {
            const sourceAlpha = sourceData[sourceOffset + 3]
            if (sourceAlpha === 0) return

            if (sourceAlpha === 255 && globalAlpha === 1) {
                destData[destOffset] = sourceData[sourceOffset]
                destData[destOffset + 1] = sourceData[sourceOffset + 1]
                destData[destOffset + 2] = sourceData[sourceOffset + 2]
                destData[destOffset + 3] = 255
                return
            }

            const sa = (sourceAlpha / 255) * globalAlpha
            const da = destData[destOffset + 3] / 255

            if (da === 0) {
                destData[destOffset] = sourceData[sourceOffset]
                destData[destOffset + 1] = sourceData[sourceOffset + 1]
                destData[destOffset + 2] = sourceData[sourceOffset + 2]
                destData[destOffset + 3] = (sa * 255 + 0.5) | 0
                return
            }

            const destWeight = da * (1 - sa)
            const outAlpha = sa + destWeight
            destData[destOffset] = ((sourceData[sourceOffset] * sa + destData[destOffset] * destWeight) / outAlpha + 0.5) | 0
            destData[destOffset + 1] = ((sourceData[sourceOffset + 1] * sa + destData[destOffset + 1] * destWeight) / outAlpha + 0.5) | 0
            destData[destOffset + 2] = ((sourceData[sourceOffset + 2] * sa + destData[destOffset + 2] * destWeight) / outAlpha + 0.5) | 0
            destData[destOffset + 3] = (outAlpha * 255 + 0.5) | 0
        }
    }

    const transform = ctx._transform
    const identity = typeof transform?.isIdentity === 'function' ? transform.isIdentity() : false
    const clipped = ctx._clip != null

    // Fast path: no transform and no scaling, which is how the game draws the
    // vast majority of its sprites.
    const isInteger = (value: number): boolean => Math.floor(value) === value
    if (identity && sw === dw && sh === dh && isInteger(dx) && isInteger(dy) && isInteger(sx) && isInteger(sy)) {
        const x0 = Math.max(0, Math.floor(dx), dx)
        const y0 = Math.max(0, Math.floor(dy), dy)
        const x1 = Math.min(destWidth, Math.ceil(dx + dw))
        const y1 = Math.min(destHeight, Math.ceil(dy + dh))
        const sourceX0 = sx + x0 - dx

        for (let y = y0; y < y1; y++) {
            const sourceY = sy + y - dy
            if (sourceY < 0 || sourceY >= sourceHeight) continue

            const sourceRow = sourceY * sourceWidth
            const destRow = y * destWidth
            for (let x = x0; x < x1; x++) {
                const sourceX = sourceX0 + (x - x0)
                if (sourceX < 0 || sourceX >= sourceWidth) continue
                if (clipped && !ctx.pixelInsideClip(x, y)) continue
                blend((sourceRow + sourceX) * 4, (destRow + x) * 4)
            }
        }
        return
    }

    let x0: number
    let y0: number
    let x1: number
    let y1: number

    if (identity) {
        x0 = Math.max(0, Math.floor(dx))
        y0 = Math.max(0, Math.floor(dy))
        x1 = Math.min(destWidth, Math.ceil(dx + dw))
        y1 = Math.min(destHeight, Math.ceil(dy + dh))

        for (let y = y0; y < y1; y++) {
            const fy = (y + 0.5 - dy) / dh
            if (!(fy >= 0 && fy <= 1)) continue

            const sourceY = Math.floor(sy + fy * sh)
            if (sourceY < 0 || sourceY >= sourceHeight) continue

            const sourceRow = sourceY * sourceWidth
            const destRow = y * destWidth
            for (let x = x0; x < x1; x++) {
                const fx = (x + 0.5 - dx) / dw
                if (!(fx >= 0 && fx <= 1)) continue

                const sourceX = Math.floor(sx + fx * sw)
                if (sourceX < 0 || sourceX >= sourceWidth) continue
                if (clipped && !ctx.pixelInsideClip(x, y)) continue
                blend((sourceRow + sourceX) * 4, (destRow + x) * 4)
            }
        }
        return
    }

    // Slow path: honour arbitrary transforms.
    const inverse = transform.cloneTransform()
    inverse.invert()

    const corners = [
        transform.transformPoint({ x: dx, y: dy }),
        transform.transformPoint({ x: dx + dw, y: dy }),
        transform.transformPoint({ x: dx + dw, y: dy + dh }),
        transform.transformPoint({ x: dx, y: dy + dh }),
    ]

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let i = 0; i < corners.length; i++) {
        const px = corners[i].x
        const py = corners[i].y
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
    }

    x0 = Math.max(0, Math.floor(minX))
    y0 = Math.max(0, Math.floor(minY))
    x1 = Math.min(destWidth, Math.ceil(maxX))
    y1 = Math.min(destHeight, Math.ceil(maxY))

    for (let y = y0; y < y1; y++) {
        const destRow = y * destWidth
        for (let x = x0; x < x1; x++) {
            // Undo the current transform to get back into user space.
            const point = inverse.transformPoint({ x: x + 0.5, y: y + 0.5 })
            const fx = (point.x - dx) / dw
            const fy = (point.y - dy) / dh
            if (!(fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1)) continue

            const sourceX = Math.floor(sx + fx * sw)
            const sourceY = Math.floor(sy + fy * sh)
            if (sourceX < 0 || sourceX >= sourceWidth || sourceY < 0 || sourceY >= sourceHeight) continue
            if (clipped && !ctx.pixelInsideClip(x, y)) continue
            blend((sourceY * sourceWidth + sourceX) * 4, (destRow + x) * 4)
        }
    }
}

const installCanvasOverrides = (ctx: any): void => {
    if (ctx.__crossnodeCanvasOverrides) return
    ctx.__crossnodeCanvasOverrides = true

    // Explicit parameters instead of rest args: Porffor compiles this file too.
    ctx.drawImage = function (
        source: any,
        a?: number,
        b?: number,
        c?: number,
        d?: number,
        e?: number,
        f?: number,
        g?: number,
        h?: number
    ): void {
        if (!source) return

        const bitmap = unwrapBitmap(source)
        if (!bitmap || typeof bitmap.getPixelRGBA !== 'function') return

        const width = bitmap.width | 0
        const height = bitmap.height | 0
        if (width <= 0 || height <= 0) return

        if (typeof e !== 'undefined') {
            // drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
            drawImagePixels(ctx, bitmap, a!, b!, c!, d!, e, f!, g!, h!)
        } else if (typeof c !== 'undefined') {
            // drawImage(image, dx, dy, dw, dh)
            drawImagePixels(ctx, bitmap, 0, 0, width, height, a!, b!, c, d!)
        } else if (typeof a !== 'undefined') {
            // drawImage(image, dx, dy)
            drawImagePixels(ctx, bitmap, 0, 0, width, height, a, b!, width, height)
        }
    }

    // fillRect is the other hot path: pureimage validates and writes every pixel
    // individually, even for plain opaque axis-aligned rectangles.
    const originalFillRect = ctx.fillRect
    ctx.fillRect = function (x: number, y: number, width: number, height: number): void {
        const transform = ctx._transform
        const color = ctx._fillColor
        if (!transform || typeof transform.isIdentity !== 'function' || !transform.isIdentity() || typeof color !== 'number') {
            return originalFillRect.call(ctx, x, y, width, height)
        }

        const dest = ctx._bitmap
        const destData: Uint8Array = dest?.data
        const destWidth = dest?.width | 0
        const destHeight = dest?.height | 0
        if (!(destWidth > 0) || !(destHeight > 0) || !destData) return

        const left = width >= 0 ? x : x + width
        const right = width >= 0 ? x + width : x
        const top = height >= 0 ? y : y + height
        const bottom = height >= 0 ? y + height : y

        const x0 = Math.max(0, Math.floor(left))
        const y0 = Math.max(0, Math.floor(top))
        const x1 = Math.min(destWidth, Math.ceil(right))
        const y1 = Math.min(destHeight, Math.ceil(bottom))
        if (x0 >= x1 || y0 >= y1) return

        const r = (color >>> 24) & 255
        const g = (color >>> 16) & 255
        const b = (color >>> 8) & 255
        const a = color & 255

        let globalAlpha = ctx._globalAlpha
        if (typeof globalAlpha !== 'number' || globalAlpha > 1) globalAlpha = 1
        else if (!(globalAlpha > 0)) return

        const operation = typeof ctx.globalCompositeOperation === 'string' ? ctx.globalCompositeOperation : 'source-over'
        const clipped = ctx._clip != null

        // Opaque rectangles are the common case and can be written as whole words.
        if (a === 255 && globalAlpha === 1 && !clipped && (operation === 'source-over' || operation === 'copy')) {
            const pattern = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
            const words = new Uint32Array(destData.buffer, destData.byteOffset, destData.byteLength >>> 2)
            for (let row = y0; row < y1; row++) {
                const start = row * destWidth + x0
                words.fill(pattern, start, start + (x1 - x0))
            }
            return
        }

        const sa = (a / 255) * globalAlpha
        for (let row = y0; row < y1; row++) {
            let offset = (row * destWidth + x0) * 4
            for (let px = x0; px < x1; px++, offset += 4) {
                if (clipped && !ctx.pixelInsideClip(px, row)) continue

                if (operation === 'lighter') {
                    const da = destData[offset + 3] / 255
                    const sumAlpha = sa + da
                    if (!(sumAlpha > 0)) continue
                    const scale = 1 / Math.min(1, sumAlpha)
                    destData[offset] = Math.min(255, ((r * sa + destData[offset] * da) * scale + 0.5) | 0)
                    destData[offset + 1] = Math.min(255, ((g * sa + destData[offset + 1] * da) * scale + 0.5) | 0)
                    destData[offset + 2] = Math.min(255, ((b * sa + destData[offset + 2] * da) * scale + 0.5) | 0)
                    destData[offset + 3] = (Math.min(1, sumAlpha) * 255 + 0.5) | 0
                } else if (operation === 'source-atop') {
                    if (destData[offset + 3] === 0) continue
                    const inv = 1 - sa
                    destData[offset] = (r * sa + destData[offset] * inv + 0.5) | 0
                    destData[offset + 1] = (g * sa + destData[offset + 1] * inv + 0.5) | 0
                    destData[offset + 2] = (b * sa + destData[offset + 2] * inv + 0.5) | 0
                } else if (operation === 'destination-in') {
                    destData[offset + 3] = (destData[offset + 3] * sa + 0.5) | 0
                } else if (operation === 'destination-out') {
                    destData[offset + 3] = (destData[offset + 3] * (1 - sa) + 0.5) | 0
                } else if (operation === 'copy') {
                    destData[offset] = r
                    destData[offset + 1] = g
                    destData[offset + 2] = b
                    destData[offset + 3] = (sa * 255 + 0.5) | 0
                } else {
                    const da = destData[offset + 3] / 255
                    if (da === 0) {
                        destData[offset] = r
                        destData[offset + 1] = g
                        destData[offset + 2] = b
                        destData[offset + 3] = (sa * 255 + 0.5) | 0
                        continue
                    }

                    const destWeight = da * (1 - sa)
                    const outAlpha = sa + destWeight
                    destData[offset] = ((r * sa + destData[offset] * destWeight) / outAlpha + 0.5) | 0
                    destData[offset + 1] = ((g * sa + destData[offset + 1] * destWeight) / outAlpha + 0.5) | 0
                    destData[offset + 2] = ((b * sa + destData[offset + 2] * destWeight) / outAlpha + 0.5) | 0
                    destData[offset + 3] = (outAlpha * 255 + 0.5) | 0
                }
            }
        }
    }
}

/**
 * Canvas-like wrapper around a pureimage Bitmap.
 *
 * Unlike a raw Bitmap, assigning width/height resizes immediately, which is what
 * canvas users expect (happy-dom/ccloader resize canvases after getting the context).
 */
export class Canvas {
    protected bitmap: Bitmap

    constructor(width: number, height: number) {
        this.bitmap = transparentBitmap(width, height)
    }

    get width(): number {
        return this.bitmap.width
    }

    set width(value: number) {
        this.resize(value, this.bitmap.height)
    }

    get height(): number {
        return this.bitmap.height
    }

    set height(value: number) {
        this.resize(this.bitmap.width, value)
    }

    get data(): Uint8Array {
        return this.bitmap.data
    }

    set data(value: Uint8Array) {
        this.bitmap.data = value
    }

    getPixelRGBA(x: number, y: number): number {
        return this.bitmap.getPixelRGBA(x, y)
    }

    protected resize(width: number, height: number): void {
        const w = Math.max(0, Math.floor(width) || 0)
        const h = Math.max(0, Math.floor(height) || 0)
        if (w === this.bitmap.width && h === this.bitmap.height) return

        // Resize in place so contexts that were already handed out (they keep a
        // reference to this bitmap) stay valid.
        this.bitmap.width = w
        this.bitmap.height = h
        this.bitmap.data = new Uint8Array(w * h * 4)
    }

    getContext(type: string, _contextAttributes?: Record<string, any>): any {
        const context = this.bitmap.getContext(type)
        installCanvasOverrides(context)
        return context
    }

    toBuffer(type?: string, quality?: number): Buffer {
        if (this.width <= 0 || this.height <= 0) return Buffer.alloc(0)

        if (normalizeFormat(type) === 'jpeg') {
            const q = typeof quality === 'number' ? Math.min(1, Math.max(0, quality)) : 0.92
            return encodeJpeg({ data: Buffer.from(this.data), width: this.width, height: this.height }, Math.round(q * 100)).data
        }

        return PNG.sync.write(
            {
                width: this.width,
                height: this.height,
                data: Buffer.from(this.data),
            } as any,
            {
                // pngjs defaults to filterType -1, which runs all five PNG row
                // filters and picks the smallest result. That costs far more than
                // deflate itself (and is especially slow compiled with Porffor).
                // Sub is usually both fast and compact for game screenshots.
                filterType: 1,
                deflateLevel: 6,
            } as any
        )
    }

    toDataURL(type = 'image/png', quality?: number): string {
        const mime = normalizeFormat(type) === 'jpeg' ? 'image/jpeg' : 'image/png'
        return `data:${mime};base64,${this.toBuffer(type, quality).toString('base64')}`
    }

    encode(type?: string, quality?: number): Buffer {
        return this.toBuffer(type, quality)
    }
}

export type CanvasElement = Canvas

/**
 * Minimal HTMLImageElement stand-in. It is also a Bitmap, so pureimage can draw
 * it directly and CrossCode's occasional `image.getContext('2d')` calls work.
 */
export class Image extends Canvas {
    private _src = ''
    private _loadPromise: Promise<void> = Promise.resolve()
    private _loaded = false
    private _failed = false
    private _onload: ((event: any) => void) | null = null
    private _onerror: ((event: any) => void) | null = null
    private _loadListeners: Array<(event: any) => void> = []
    private _errorListeners: Array<(event: any) => void> = []

    constructor() {
        super(0, 0)
    }

    get src(): string {
        return this._src
    }

    set src(value: string) {
        this._src = String(value ?? '')
        this.reload()
    }

    get currentSrc(): string {
        return this._src
    }

    get complete(): boolean {
        return this._loaded || this._failed
    }

    get naturalWidth(): number {
        return this.width
    }

    get naturalHeight(): number {
        return this.height
    }

    get onload(): ((event: any) => void) | null {
        return this._onload
    }

    set onload(listener: ((event: any) => void) | null) {
        this._onload = listener
        if (this._loaded) this.emitLoad({ type: 'load', target: this })
    }

    get onerror(): ((event: any) => void) | null {
        return this._onerror
    }

    set onerror(listener: ((event: any) => void) | null) {
        this._onerror = listener
        if (this._failed) this.emitError({ type: 'error', target: this })
    }

    addEventListener(type: string, listener: (event: any) => void): void {
        if (typeof listener !== 'function') return
        if (type === 'load') this._loadListeners.push(listener)
        else if (type === 'error') this._errorListeners.push(listener)
    }

    removeEventListener(type: string, listener: (event: any) => void): void {
        if (type === 'load') this._loadListeners = this._loadListeners.filter(x => x !== listener)
        else if (type === 'error') this._errorListeners = this._errorListeners.filter(x => x !== listener)
    }

    dispatchEvent(event: any): boolean {
        if (event?.type === 'load') this.emitLoad(event)
        else if (event?.type === 'error') this.emitError(event)
        return true
    }

    decode(): Promise<void> {
        return this._loadPromise
    }

    private reload(): void {
        const src = this._src
        this._loaded = false
        this._failed = false

        if (!src) {
            this._loaded = true
            this._loadPromise = Promise.resolve()
            return
        }

        this._loadPromise = loadBitmap(src)
            .then(bitmap => {
                // A newer src assignment superseded this load.
                if (this._src !== src) return
                this.resize(bitmap.width, bitmap.height)
                this.data = bitmap.data
                this._loaded = true
                this.emitLoad({ type: 'load', target: this })
            })
            .catch((error: any) => {
                if (this._src !== src) return
                this._failed = true
                this.emitError({ type: 'error', target: this, error })
            })
    }

    private emitLoad(event: any): void {
        this._onload?.call(this, event)
        for (const listener of this._loadListeners) listener.call(this, event)
    }

    private emitError(event: any): void {
        this._onerror?.call(this, event)
        for (const listener of this._errorListeners) listener.call(this, event)
    }
}

export const createCanvas = (width: number, height: number): Canvas => new Canvas(width, height)
