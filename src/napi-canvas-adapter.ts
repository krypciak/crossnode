import { createCanvas, type Canvas, type SKRSContext2D } from './canvas-backend'
import type ICanvasAdapter from 'happy-dom/lib/canvas/ICanvasAdapter.js'
import type ICanvasAdapterCaller from 'happy-dom/lib/canvas/ICanvasAdapterCaller.js'
import type ICanvasRenderingContext2D from 'happy-dom/lib/canvas/ICanvasRenderingContext2D.js'
import type Blob from 'happy-dom/lib/file/Blob.js'

/* vibe coded */
export class NapiCanvasAdapter implements ICanvasAdapter {
    private canvasCache = new WeakMap<ICanvasAdapterCaller['canvas'], Canvas>()
    private sizeHooked = new WeakSet<ICanvasAdapterCaller['canvas']>()

    private getNativeCanvas(caller: ICanvasAdapterCaller): Canvas {
        const canvasElement = caller.canvas
        let nativeCanvas = this.canvasCache.get(canvasElement)

        if (!nativeCanvas) {
            nativeCanvas = createCanvas(canvasElement.width, canvasElement.height)
            this.canvasCache.set(canvasElement, nativeCanvas)
        } else {
            if (nativeCanvas.width !== canvasElement.width) nativeCanvas.width = canvasElement.width
            if (nativeCanvas.height !== canvasElement.height) nativeCanvas.height = canvasElement.height
        }

        this.hookCanvasSize(canvasElement, nativeCanvas)
        return nativeCanvas
    }

    /**
     * Keep the native canvas in sync while the DOM canvas is resized.
     *
     * Getting a context once and then assigning canvas.width/height afterwards is
     * a common pattern (ccloader's UI does it). Without this hook the native
     * canvas only catches up on the next getContext()/toDataURL(), after drawing
     * has already happened.
     */
    private hookCanvasSize(canvasElement: ICanvasAdapterCaller['canvas'], nativeCanvas: Canvas): void {
        if (this.sizeHooked.has(canvasElement)) return
        this.sizeHooked.add(canvasElement)

        const hook = (property: 'width' | 'height'): void => {
            let prototype = Object.getPrototypeOf(canvasElement)
            let descriptor: PropertyDescriptor | undefined
            while (prototype && !(descriptor = Object.getOwnPropertyDescriptor(prototype, property))) {
                prototype = Object.getPrototypeOf(prototype)
            }

            const originalGet = descriptor?.get
            const originalSet = descriptor?.set
            if (!originalGet || !originalSet) return

            Object.defineProperty(canvasElement, property, {
                configurable: true,
                get(this: any): number {
                    return originalGet.call(this)
                },
                set(this: any, value: number): void {
                    const previous = originalGet.call(this)
                    originalSet.call(this, value)
                    const next = originalGet.call(this)
                    if (next === previous) return

                    if (property === 'width') nativeCanvas.width = next
                    else nativeCanvas.height = next
                },
            })
        }

        hook('width')
        hook('height')
    }

    resolveCanvasSource(source: any): any {
        // If the source is a Happy DOM canvas element (has a 'getContext' method and 'width'/'height')
        // and we have a cached native canvas for it, return the native canvas.
        if (source && typeof source.getContext === 'function' && 'width' in source && 'height' in source) {
            const native = this.canvasCache.get(source as ICanvasAdapterCaller['canvas'])
            if (native) {
                return native
            }
        }
        // If it's not a Happy DOM canvas we know about, return it as-is.
        // This allows native @napi-rs/canvas Image objects to pass through.
        return source
    }

    getContext(caller: ICanvasAdapterCaller, contextType: string, contextAttributes?: Record<string, any>): ICanvasRenderingContext2D | null {
        const nativeCanvas = this.getNativeCanvas(caller)
        const nativeContext = nativeCanvas.getContext(contextType, contextAttributes) as SKRSContext2D | null

        if (!nativeContext) return null

        const originalDrawImage = nativeContext.drawImage.bind(nativeContext)
        nativeContext.drawImage = function (this: any, image: any, ...args: any[]) {
            const resolvedImage = this._adapter.resolveCanvasSource(image)
            return originalDrawImage(resolvedImage, ...args)
        } as any

        // Attach adapter reference for the wrapper function to use
        ;(nativeContext as any)._adapter = this

        return nativeContext as unknown as ICanvasRenderingContext2D
    }

    toDataURL(caller: ICanvasAdapterCaller, type?: string, quality?: unknown): string {
        const nativeCanvas = this.getNativeCanvas(caller)
        return nativeCanvas.toDataURL(type, quality as number)
    }

    toBlob(caller: ICanvasAdapterCaller, callback: (blob: Blob | null) => void, type?: string, quality?: unknown): void {
        const nativeCanvas = this.getNativeCanvas(caller)
        try {
            const buffer = nativeCanvas.toBuffer(type as any, quality as any)
            const BlobConstructor = caller.window.Blob
            const blob = new BlobConstructor([buffer], { type: type || 'image/png' }) as unknown as Blob
            callback(blob)
        } catch {
            callback(null)
        }
    }

    getNativeFor(canvasElement: ICanvasAdapterCaller['canvas']): Canvas | undefined {
        return this.canvasCache.get(canvasElement)
    }
}
