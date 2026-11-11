import type {} from 'ultimate-crosscode-typedefs'
import { ccloaderInit, ccloaderPostload, ccloaderPoststart } from './ccloader'
import { initDom, initLibs, setDocumentLoadingState } from './dom'
import { mockNwjs } from './nwjs-mock'
import { setupWindowCapture } from './window-capture'
import { requireFix } from './require-fix'

import repl from 'repl'
import moduleImport from 'module'
import { fileExists } from './util'

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
    if (repl.start) {
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

    const normalRequire = moduleImport.createRequire(new URL(`file://${process.cwd()}/`))
    normalRequire('./assets/js/game.compiled.js')

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
