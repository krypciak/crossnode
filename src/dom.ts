import { JSDOM } from 'jsdom'

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
