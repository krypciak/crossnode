import fs from 'fs'
import { createWindow, installWindowGlobals, setCanvasBackend, setXhrBackend } from 'pocketdom'
import { selectedCanvasBackend } from './canvas-backend'

/*
 * CrossNode's browser environment bootstrap.
 *
 * The DOM, canvas and XMLHttpRequest implementations live in the standalone
 * `pocketdom` package. This file only installs the backends (canvas backend
 * from CROSSNODE_CANVAS, XHR from the file system), builds the initial
 * document and exposes the usual browser globals.
 */

export function setDocumentLoadingState(state: DocumentReadyState): void {
    ;(document as any).readyState = state
}

/**
 * The initial document mirrors `ccloader/index.html` plus the game canvas from
 * `assets/node-webkit.html`.
 */
const INITIAL_BODY_HTML = `
    <div id="overlay"></div>
    <h1 id="status" class="title">Initializing CCLoader</h1>
    <div id="ui" class="ui"></div>
    <div id="game">
        <canvas id="canvas" width="568" height="320"></canvas>
    </div>
`

export function initDom(): void {
    setCanvasBackend(selectedCanvasBackend)

    setXhrBackend({
        readFile(path: string) {
            try {
                return fs.readFileSync(path)
            } catch {
                return null
            }
        },
    })

    const win = createWindow({
        url: 'http://localhost:3000/',
        width: 1136,
        height: 640,
        screenWidth: 1920,
        screenHeight: 1080,
        bodyHTML: INITIAL_BODY_HTML,
    })

    win.process = process

    installWindowGlobals(win)

    setDocumentLoadingState('loading')
}
