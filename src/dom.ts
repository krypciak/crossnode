import { JSDOM } from 'jsdom'
import { Image } from 'canvas'
import jquery from 'jquery'
import CryptoJS from 'crypto-js'

import { AsyncLocalStorage } from './localstorage'

export function setDocumentLoadingState(state: string) {
    Object.defineProperty(document, 'readyState', {
        configurable: true,
        get() {
            return state
        },
    })
}

export function initDom() {
    const dom = new JSDOM(
        `
        <!DOCTYPE html>
        <html>
            <body>
                <div id="game" >
                    <canvas id="canvas" width="568" height="320"></canvas>
                </div>
            </body>
        </html>
        `,
        {
            pretendToBeVisual: true,
        }
    )

    // @ts-expect-error
    global.window = dom.window
    global.document = window.document
    global.DOMParser = window.DOMParser
    window.process = process
    global.XMLHttpRequest = window.XMLHttpRequest

    // @ts-expect-error
    window.location = global.location = document.location

    setDocumentLoadingState('loading')
}

export async function initLibs() {
    // @ts-expect-error
    global.navigator.appVersion = '4.0'

    global.localStorage = new AsyncLocalStorage({ storagePath: './localStorage.json' })
    Object.defineProperty(window, 'localStorage', {
        value: global.localStorage,
    })

    // @ts-expect-error
    window.Image = global.Image = Image
    global.HTMLCanvasElement = window.HTMLCanvasElement

    // @ts-expect-error
    window.HTMLElement = global.HTMLElement = function () {}

    // @ts-expect-error
    window.$ = global.$ = jquery(window)

    window.CryptoJS = global.CryptoJS = CryptoJS

    // @ts-ignore
    await import('../../../impact/page/js/seedrandom.js')
}
