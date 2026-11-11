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
    return loadNativeModule().createCanvas(width, height)
}

export const getImageClass = (): ImageConstructor => {
    return loadNativeModule().Image
}
