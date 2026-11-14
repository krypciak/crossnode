import { nativeCanvasBackend, pureimageCanvasBackend, type DomCanvasBackend } from 'pocketdom'

/* vibecoded */
/**
 * Canvas backend selection.
 *
 * By default crossnode renders with @napi-rs/canvas (Skia). Set
 * CROSSNODE_CANVAS=pureimage (or pure / 1) to use the pure JavaScript
 * pureimage backend instead, which is the only option in a Porffor binary.
 *
 * For a Porffor build the backend can also be baked in at compile time:
 *   --define:process.env.CROSSNODE_CANVAS=true
 */

// Porffor's --define replaces this exact member read at compile time, so
// `--define:process.env.CROSSNODE_CANVAS=true` bakes the backend in. Strings
// still work, and are also read normally at runtime when no define is used.
const backendValue: any = process.env.CROSSNODE_CANVAS
const requestedBackend = typeof backendValue === 'string' ? backendValue.trim().toLowerCase() : backendValue

export const usesPureImageCanvas = requestedBackend === 'pureimage' || requestedBackend === 'pure' || requestedBackend === '1' || requestedBackend === true || requestedBackend === 1

export const canvasBackend: 'native' | 'pureimage' = usesPureImageCanvas ? 'pureimage' : 'native'

export const selectedCanvasBackend: DomCanvasBackend = usesPureImageCanvas ? pureimageCanvasBackend : nativeCanvasBackend
