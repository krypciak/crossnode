import { JSDOM } from 'jsdom'
import { LocalStorage } from 'node-localstorage'
import { Image } from 'canvas'
import jquery from 'jquery'
import CryptoJS from 'crypto-js'
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'
import * as semver from 'semver'
import * as crypto from 'crypto'
import * as http from 'http'
import * as https from 'https'
import * as dns from 'dns'
import * as util from 'util'
import * as events from 'events'

function initDom() {
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

    global.window = dom.window
    global.document = window.document
    global.DOMParser = window.DOMParser
    window.process = process
}

async function initLibs() {
    global.navigator.appVersion = '4.0'

    global.localStorage = new LocalStorage('./scratch')

    window.Image = global.Image = Image

    window.$ = global.$ = jquery(window)

    window.CryptoJS = global.CryptoJS = CryptoJS

    await import('../../impact/page/js/seedrandom.js')
}

function mockNwjs() {
    function nwGui() {
        return {
            Window: {
                get() {
                    return {
                        isFullscreen: false,
                        close() {},
                        enterFullscreen() {},
                        leaveFullscreen() {},
                    }
                },
            },
            App: {
                dataPath: './GameData',
                argv: [],
            },
        }
    }
    window.require = global.require = function (name) {
        if (name == 'fs') return fs
        if (name == 'path') return path
        if (name == 'crypto') return crypto
        if (name == 'http') return http
        if (name == 'https') return https
        if (name == 'dns') return dns
        if (name == 'util') return util
        if (name == 'events') return events
        if (name == 'nw.gui') return nwGui()
        if (name == './modules/greenworks-nw-0.35/greenworks') return undefined
        if (name == 'assert') {
            const func = function (cond) {
                if (!cond) throw new Error('assertion failed')
            }
            func.ok = func
            return func
        }
        console.error(`\nunknown require() module: "${name}"\n`)
        throw new Error(`unknown require() module: "${name}"`)
    }
    window.AudioContext = global.AudioContext = class {
        constructor() {}
        createGainNode() {
            return {
                gain: { value: 0 },
                connect() {},
                disconnect() {},
            }
        }
        createGain() {
            return this.createGainNode()
        }
        createDynamicCompressor() {
            return {}
        }
        getDestination() {}
        createBufferSource() {
            return {
                playbackRate: {},
                connect() {},
                noteOn() {},
            }
        }

        close() {}
        createMediaElementSource() {}
        createMediaStreamDestination() {}
        createMediaStreamSource() {}
        createMediaStreamTrackSource() {}
        getOutputTimestamp() {}
        resume() {}
        setSinkId() {}
        suspend() {}
    }

    process.versions['node-webkit'] = '0.72.0'
}

function setupWindow() {
    /* Set variables from assets/node-webkit.html */
    window.IG_GAME_SCALE = global.IG_GAME_SCALE = 1
    window.IG_GAME_CACHE = global.IG_GAME_CACHE = ''
    window.IG_ROOT = global.IG_ROOT = `${process.cwd()}/assets/`
    window.IG_WIDTH = global.IG_WIDTH = 568
    window.IG_HEIGHT = global.IG_HEIGHT = 320
    window.IG_HIDE_DEBUG = global.IG_HIDE_DEBUG = false
    window.IG_SCREEN_MODE_OVERRIDE = global.IG_SCREEN_MODE_OVERRIDE = 2
    window.IG_WEB_AUDIO_BGM = global.IG_WEB_AUDIO_BGM = false
    window.IG_FORCE_HTML5_AUDIO = global.IG_FORCE_HTML5_AUDIO = false
    window.LOAD_LEVEL_ON_GAME_START = global.LOAD_LEVEL_ON_GAME_START = null
    window.IG_GAME_DEBUG = global.IG_GAME_DEBUG = false
    window.IG_GAME_BETA = global.IG_GAME_BETA = false
    /* Capture window variables */
    function captureWindowVar(name) {
        Object.defineProperty(window, name, {
            set(v) {
                delete window[name]
                Object.defineProperty(window, name, {
                    writable: true,
                    value: v,
                    configurable: true,
                })
                global[name] = v
            },
            configurable: true,
        })
    }
    const toCapture = [
        'sc',
        'ig',
        'Vec2',
        'Vec3',
        'Line2',
        'KeySpline',
        'KEY_SPLINES',
        'assert',
        'assertContent',
        'sc',
        'Constants',
        'IG_SOUND_VOLUME',
        'IG_MUSIC_VOLUME',
        'IG_USE_WEBAUDIO',
        'IG_SCREEN_MODE',
        'MENU_ON_GAME_START',
        'IG_KEEP_WINDOW_FOCUS',
        'IG_WEB_AUDIO_BGM',
        'requestAnimationFrame',
        'IG_ENTITY_KILL_CALL',
        'IS_IT_CUBAUM',
        'checkPlayerPos',
        'testGui',
        'startCrossCode',
        'activeMods',
        'inactiveMods',
        'Plugin',
        'versions',
        'Greenworks',
        'simplifyResources',
        'isLocal',
        'determinism',
        /* mod specific */
        'modmanager',
        'cc',
        'nax',
        'entries',
    ]

    for (const name of toCapture) {
        captureWindowVar(name)
    }
}

function mockMisc() {
    window.HTMLElement = global.HTMLElement = function () {}
    window.name = global.name = ''
    window.Audio = global.Audio = function (_arg) {
        return {
            addEventListener(type, listener) {
                // console.log(`Audio: addEventListener(${type}, ${listener.toString().replace(/\n/g, '').replace(/ /g, '')})`)
                if (type == 'canplaythrough') {
                    setTimeout(() => {
                        listener.bind(this)()
                    }, 0)
                }
            },
            removeEventListener(_type, _duno, _boo) {
                // console.log(`Audio: removeEventListener(${type}, ${duno}, ${boo})`)
            },
            load() {
                // console.log(`Audio: load()`)
            },
        }
    }
}

function runShell() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    })

    rl.on('line', line => {
        try {
            eval(`console.log(${line})`)
        } catch (err) {
            console.log(err)
        }
    })

    rl.once('close', () => {})
}

let waitForGameResolve
function injectWaitForGame() {
    ig.Loader.inject({
        finalize() {
            let end = ig.resources.length > 0
            this.parent()
            if (end && ig.ready) {
                waitForGameResolve()
            }
        },
    })
}

let modloader
async function ccloaderInit(options) {
    window.isLocal = true
    window.location = global.location = document.location
    window.semver = global.semver = semver

    await import('./patched/ccloader-packed.js')
    const { ModLoader } = await import('../../../ccloader/js/ccloader.js')
    const { Filemanager } = await import('../../../ccloader/js/filemanager.js')
    const { Loader } = await import('../../../ccloader/js/loader.js')
    const { UI } = await import('../../../ccloader/js/ui.js')

    window.caches = global.caches = {
        async delete() {},
        async has() {
            return false
        },
        async keys() {
            return []
        },
        async match() {
            return false
        },
        async open() {
            return {
                add() {},
                addAll() {},
                delete() {},
                keys() {
                    return {}
                },
                match() {
                    return false
                },
                matchAll() {
                    return false
                },
                put() {},
            }
        },
    }
    window.fetch = global.fetch = function (url) {
        if (!url.startsWith('assets/') && !url.startsWith('/assets/')) {
            url = 'assets/' + url
        }
        url = './' + url
        return new Promise(async res => {
            const data = await fs.promises.readFile(url, 'utf8')
            res({
                text() {
                    return data
                },
                json() {
                    return JSON.parse(data)
                },
            })
        })
    }

    const PatchedModLoader = function () {
        console.logToFile = function () {}
        this._initializeServiceWorker = function () {}

        this.filemanager = new Filemanager(this)
        this.filemanager.packedFileExists = function () {
            return false
        }
        {
            const orig = this.filemanager.loadImage
            this.filemanager.loadImage = function (path) {
                return orig('./' + path.substring('../'.length))
            }
        }
        this.filemanager._loadScript = async function _loadScript(url, _doc, _type) {
            return import(`../../${url}`)
        }
        this.ui = new UI(this)
        this.ui._drawMessage = function (text, _type, _timeout) {
            if (!options.quiet) console.log(`MESSAGE: ${text}`)
        }
        this.loader = new Loader(this.filemanager)
        this.loader.doc = new DOMParser().parseFromString(
            `<html>
                <body>
                    <div id="status"></div>
                </body>
            </html>`,
            'text/html'
        )

        this.overlay = document.getElementById('overlay')
        this.status = document.getElementById('status')

        /** @type {Mod[]} */
        this.mods = []
        /** @type {{[name: string]: string}} */
        this.versions = {}
        /** @type {string[]} */
        this.extensions = this.filemanager.getExtensions()
    }
    PatchedModLoader.prototype = ModLoader.prototype

    modloader = new PatchedModLoader()

    await modloader._buildCrosscodeVersion()

    // await this.loader.initialize()

    await modloader._loadModPackages()
    if (options.modWhitelist) {
        options.modWhitelist.push('crossnode', 'Simplify')
        modloader.mods = modloader.mods.filter(mod => options.modWhitelist.includes(mod.name))
    }
    if (!options.quiet)
        console.log(
            'MODS:',
            modloader.mods.map(mod => mod.name)
        )

    modloader._removeDuplicateMods()
    modloader._orderCheckMods()
    modloader._registerMods()

    modloader._setupGamewindow()

    await modloader._loadPlugins()

    const Simplify = modloader.mods.find(m => m.name == 'Simplify').pluginInstance
    /* prevent pattern-fix.js#fixPatters from running */
    Simplify.prestart = undefined
    Simplify.postload = function () {
        this._applyArgs()
        /* use a modified version of postloadModule.js */
        return import('./patched/simplify-postloadModule.js')
    }

    await modloader._executePreload()
}

async function ccloaderPostload() {
    await modloader._executePostload()
    modloader.loader.continue()
}

async function ccloaderPoststart() {
    await modloader._executeMain()
    // modloader._fireLoadEvent()
}

async function evalGame() {
    const gameCompliedJs = await fs.promises.readFile('./assets/js/game.compiled.js', 'utf8')
    eval(gameCompliedJs)
}

export async function startCrossnode(options) {
    const launchDate = Date.now()

    process.chdir('../../..')
    initDom()
    await initLibs()

    window.crossnode = {
        options,
        waitForGamePromise: new Promise(res => (waitForGameResolve = res)),
    }
    mockNwjs()
    setupWindow()
    mockMisc()

    if (options.shell) runShell()

    if (options.ccloader2) await ccloaderInit(options)

    if (!options.ccloader2) {
        new (await import('./plugin.js')).default().preload()
    }

    await evalGame()

    injectWaitForGame()

    if (options.ccloader2) await ccloaderPostload()

    if (!options.ccloader2) {
        new (await import('./plugin.js')).default().prestart()
    }

    await window.startCrossCode()

    await window.crossnode.waitForGamePromise

    if (options.ccloader2) await ccloaderPoststart()

    if (!options.quiet) console.log(`Ready (took ${Date.now() - launchDate}ms)`)
}
