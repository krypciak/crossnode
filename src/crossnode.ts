import type {} from 'ultimate-crosscode-typedefs'
import { ccloaderInit, ccloaderPostload, ccloaderPoststart } from './ccloader'
import { initDom, setDocumentLoadingState } from './dom'
import { initLibs, mockNwjs } from './nwjs-mock'
import { setupWindowCapture } from './window-capture'
import { requireFix } from './require-fix'
import { fileExists } from './util'

// import repl from 'repl'
const repl = {} as typeof import('repl')

export interface CrossnodeOptions {
    shell?: boolean
    writeImage?: boolean
    writeImageInterval?: number
    writeImageInstanceinator?: boolean
    printImageError?: boolean
    skipTitlescreen?: boolean
    autoEnterGame?: boolean
    quiet?: boolean

    nukeImageStack?: boolean
    extensionWhitelist?: string[]

    ccloader2?: boolean
    modWhitelist?: string[]

    fps?: number
    skipFrameWait?: boolean

    preload?: () => void
    postload?: () => void
    prestart?: () => void
    poststart?: () => void
}

declare global {
    var crossnode: {
        waitForGamePromise: Promise<void>
        options: CrossnodeOptions
    }
}

function runShell() {
    if (repl?.start) {
        const server = repl.start({
            prompt: 'crosscode > ',
            useGlobal: true,
            ignoreUndefined: true,
        })
        server.on('exit', () => {
            process.exit()
        })
    }
}

let waitForGameResolve: (() => void) | undefined
function injectWaitForGame() {
    ig.Loader.inject({
        finalize() {
            let end = ig.resources.length > 0
            this.parent()
            if (end && ig.ready) {
                waitForGameResolve?.()
            }
        },
    })
}

export async function startCrossnode(options: CrossnodeOptions) {
    const launchDate = Date.now()

    if (!(await fileExists('favicon.png'))) {
        process.chdir('../../..')
    }
    initDom()
    await initLibs()

    mockNwjs()
    requireFix()
    setupWindowCapture()

    window.crossnode = {
        options,
        waitForGamePromise: new Promise(res => (waitForGameResolve = res)),
    }

    let pluginClass
    if (!options.ccloader2) pluginClass = new (await import('./plugin.js')).default()

    const modloader = options.ccloader2 ? await ccloaderInit(options) : undefined

    if (pluginClass) pluginClass.preload()

    require('../../../js/game.compiled.js')

    injectWaitForGame()

    if (options.postload) options.postload()
    if (modloader) await ccloaderPostload(modloader)
    setDocumentLoadingState('complete')
    modloader?.loader.continue()
    if (pluginClass) pluginClass.prestart()
    if (options.prestart) options.prestart()

    window.startCrossCode()

    await window.crossnode.waitForGamePromise

    if (modloader) await ccloaderPoststart(modloader)
    if (options.poststart) options.poststart()

    if (!options.quiet) console.log(`Ready (took ${Date.now() - launchDate}ms)`)

    if (options.shell) runShell()
}
