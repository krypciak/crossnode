import fs from 'fs'
import { Window } from 'happy-dom'
import { getImageClass } from './canvas-backend'
import { NapiCanvasAdapter } from './napi-canvas-adapter'

export function setDocumentLoadingState(state: DocumentReadyState): void {
    Object.defineProperty(document, 'readyState', {
        configurable: true,
        get(): DocumentReadyState {
            return state
        },
    })
}

export function initDom(): void {
    const win = new Window({
        url: 'http://localhost:3000/',
        settings: {
            canvasAdapter: new NapiCanvasAdapter(),
            enableImageFileLoading: true,
            enableFileSystemHttpRequests: true,
        },
        console: {
            ...console,
            // make it configurable
            error: (...args) => console.error(...args),
        },
    })
    globalThis.window = win as unknown as typeof globalThis.window

    const doc = win.document
    doc.body.innerHTML = `
        <div id="game" >
            <canvas id="canvas" width="568" height="320"></canvas>
        </div>
    `

    globalThis.document = doc as unknown as Document
    globalThis.DOMParser = win.DOMParser as unknown as typeof DOMParser
    window.process = process
    globalThis.XMLHttpRequest = win.XMLHttpRequest as unknown as typeof XMLHttpRequest
    globalThis.location = doc.location as unknown as Location

    fixXMLHttpRequest()

    setDocumentLoadingState('loading')

    const NapiImage = getImageClass() as unknown as typeof globalThis.Image
    globalThis.Image = window.Image = NapiImage
}

function fixXMLHttpRequest(): void {
    /* vibe coded */
    const OriginalXMLHttpRequest = window.XMLHttpRequest

    class FileSystemXMLHttpRequest extends OriginalXMLHttpRequest {
        private _url: string | URL | undefined

        override open(method: string, url: string | URL, async: boolean = true, user?: string | null, password?: string | null): void {
            // Store the URL for our custom send method
            this._url = url
            super.open(method, url, async, user, password)
        }

        override send(body: Document | XMLHttpRequestBodyInit | null = null): void {
            if (this._url?.toString().startsWith('file://')) {
                try {
                    const filePath = new URL(this._url.toString()).pathname
                    const data = fs.readFileSync(filePath, 'utf8')

                    // Simulate a successful response
                    Object.defineProperty(this, 'readyState', { value: 4 })
                    Object.defineProperty(this, 'status', { value: 200 })
                    Object.defineProperty(this, 'statusText', { value: 'OK' })
                    Object.defineProperty(this, 'responseText', { value: data })
                    Object.defineProperty(this, 'response', { value: data })

                    // Trigger the event handlers
                    if (this.onreadystatechange) this.onreadystatechange.call(this, new window.Event('readystatechange'))
                    if (this.onload) this.onload.call(this, new window.ProgressEvent('load'))
                } catch (error) {
                    // Simulate a failed response
                    Object.defineProperty(this, 'readyState', { value: 4 })
                    Object.defineProperty(this, 'status', { value: 404 })
                    Object.defineProperty(this, 'statusText', { value: 'Not Found' })

                    const event = Object.assign(new window.ProgressEvent('error'), { error })
                    if (this.onreadystatechange) this.onreadystatechange.call(this, new window.Event('readystatechange'))
                    if (this.onerror) this.onerror.call(this, event)
                }
                return
            }

            // Fall back to the original implementation for non-file URLs
            return super.send(body)
        }
    }

    window.XMLHttpRequest = FileSystemXMLHttpRequest
}
