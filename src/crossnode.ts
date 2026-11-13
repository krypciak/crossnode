import type {} from 'ultimate-crosscode-typedefs'
import { ccloaderInit, ccloaderPostload, ccloaderPoststart } from './ccloader'
import { initDom, setDocumentLoadingState } from './dom'
import { initLibs, mockNwjs } from './nwjs-mock'
import { setupWindowCapture } from './window-capture'
import { requireFix } from './require-fix'
import { fileExists } from './util'
import { patchVarCondition } from './var-condition'
import { patchAlybox } from './alybox-patch'

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

    patchVarCondition?: boolean

    fps?: number
    skipFrameWait?: boolean

    debugLogs?: boolean

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

async function runShell() {
    const repl: typeof import('repl') = (0, eval)(`require('repl')`)
    const server = repl.start({
        prompt: 'crosscode > ',
        useGlobal: true,
        ignoreUndefined: true,
    })
    server.on('exit', () => {
        process.exit()
    })
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

let debugLogging = false
function log(str: string) {
    if (!debugLogging) return
    console.log(str)
}

export async function startCrossnode(options: CrossnodeOptions) {
    const launchDate = Date.now()
    debugLogging = !!options.debugLogs

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
    if (!options.ccloader2) pluginClass = new (await import('../modSrc/plugin')).default()

    const modloader = options.ccloader2 ? await ccloaderInit(options) : undefined

    if (pluginClass) pluginClass.preload()

    log('require game.compiled.js')
    require('../../../js/game.compiled.js')

    if (options.patchVarCondition) {
        patchVarCondition()
        patchAlybox()
    }

    injectWaitForGame()

    if (options.postload) options.postload()
    log('postload')
    if (modloader) await ccloaderPostload(modloader)
    setDocumentLoadingState('complete')

    log('prestart')
    modloader?.loader.continue()

    if (pluginClass) pluginClass.prestart()
    if (options.prestart) options.prestart()

    log('startCrossCode')
    window.startCrossCode()

    log('waiting')
    await window.crossnode.waitForGamePromise

    log('poststart')
    if (modloader) await ccloaderPoststart(modloader)
    if (options.poststart) options.poststart()

    if (!options.quiet) console.log(`Ready (took ${Date.now() - launchDate}ms)`)

    if (options.shell) await runShell()
}
