import { Image as PureImageImage, createCanvas as createPureImageCanvas } from './canvas-pureimage'

/* vibecoded */
/**
 * Backend-agnostic canvas entry point.
 *
 * By default this uses the native @napi-rs/canvas (Skia) implementation.
 * Set CROSSNODE_CANVAS=pureimage (or pure / 1) to use the pureimage-backed
 * implementation instead.
 *
 * For a Porffor build, the backend can also be baked in at compile time:
 *   --define:process.env.CROSSNODE_CANVAS=true
 */

export type SKRSContext2D = any

export interface Canvas {
    width: number
    height: number
    getContext(type: string, contextAttributes?: Record<string, any>): any
    toDataURL(type?: string, quality?: number): string
    toBuffer(type?: string, quality?: number): Buffer
    encode?(type?: string, quality?: number): Buffer
}

export type ImageConstructor = new (...args: any[]) => any

interface NativeCanvasModule {
    createCanvas(width: number, height: number): Canvas
    Image: ImageConstructor
}

// Porffor's --define replaces this exact member read at compile time, so
// `--define:process.env.CROSSNODE_CANVAS=true` bakes the backend in. Strings
// still work, and are also read normally at runtime when no define is used.
const backendValue: any = process.env.CROSSNODE_CANVAS
const requestedBackend = typeof backendValue === 'string' ? backendValue.trim().toLowerCase() : backendValue

export const usesPureImageCanvas =
    requestedBackend === 'pureimage' || requestedBackend === 'pure' || requestedBackend === '1' || requestedBackend === true || requestedBackend === 1

export const canvasBackend: 'native' | 'pureimage' = usesPureImageCanvas ? 'pureimage' : 'native'

let nativeModule: NativeCanvasModule | null = null

const loadNativeModule = (): NativeCanvasModule => {
    if (nativeModule) return nativeModule

    // Build the specifier at runtime so Porffor's bundler does not try to link
    // the native addon (which cannot be loaded in a Porffor binary). In native
    // mode this resolves through Bun/Node's normal require implementation.
    const specifier = ['@napi-rs', 'canvas'].join('/')
    const loaded = require(specifier)
    nativeModule = (loaded?.default ?? loaded) as NativeCanvasModule
    return nativeModule
}

export const createCanvas = (width: number, height: number): Canvas => {
    if (usesPureImageCanvas) return createPureImageCanvas(width, height)
    return loadNativeModule().createCanvas(width, height)
}

export const getImageClass = (): ImageConstructor => {
    if (usesPureImageCanvas) return PureImageImage as unknown as ImageConstructor
    return loadNativeModule().Image
}
