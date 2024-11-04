import { JSDOM } from 'jsdom'
import { Navigator } from 'node-navigator'
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

export async function startCrossnode(options) {
    process.chdir('../../..')

    const dom = new JSDOM(
        `
        <!DOCTYPE html>
        <html>
            <body>
                <div id="game" >
                    <canvas id="canvas"></canvas>
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

    /* Setup missing libraries */
    const navigator = new Navigator()
    Object.defineProperty(global, 'nagivator', {
        get() {
            return navigator
        },
    })
    Object.defineProperty(window, 'nagivator', {
        get() {
            return navigator
        },
    })

    global.localStorage = new LocalStorage('./scratch')

    window.Image = global.Image = Image

    window.$ = global.$ = jquery(window)

    window.CryptoJS = global.CryptoJS = CryptoJS

    await import('../../impact/page/js/seedrandom.js')

    window.HTMLElement = global.HTMLElement = function () {}
    window.name = global.name = ''

    window.crossnode = {
        options
    }

    if (true) {
        window.require = global.require = name => {
            if (name == 'fs') return fs
            if (name == 'path') return path
            if (name == 'crypto') return crypto
            if (name == 'http') return http
            if (name == 'https') return https
            if (name == 'dns') return dns
            if (name == 'util') return util
            if (name == 'events') return events
            if (name == 'nw.gui')
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
            if (name == 'assert') {
                const func = function (cond) {
                    if (!cond) throw new Error('assertion failed')
                }
                func.ok = func
                return func
            }
            console.error(`\nunknown require() module: "${name}\n`)
            throw new Error(`unknown require() module: "${name}`)
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

    /* Set variables from assets/node-webkit.html */
    {
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
    }
    /* Capture window variables */
    {
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

    /* Create dummy Audio implementation */
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

    if (options.shell) {
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

    let modloader
    if (options.ccloader2) {
        window.isLocal = true
        window.location = global.location = document.location
        window.semver = global.semver = semver

        await import('./packed.js')
        const { ModLoader } = await import('../../../ccloader/js/ccloader.js')

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
        modloader = new ModLoader()
        console.logToFile = function () {}
        modloader.loader.doc = new DOMParser().parseFromString(
            `<html>
                <body>
                    <div id="status"></div>
                </body>
            </html>`,
            'text/html'
        )

        await modloader._buildCrosscodeVersion()

        // await this.loader.initialize()

        await modloader._loadModPackages()
        modloader._removeDuplicateMods()
        modloader._orderCheckMods()
        modloader._registerMods()

        modloader._setupGamewindow()

        await modloader._loadPlugins()
        await modloader._executePreload()
    }

    const gameCompliedJs = await fs.promises.readFile('./assets/js/game.compiled.js', 'utf8')
    eval(gameCompliedJs)

    if (options.ccloader2) {
        // todo: simplify _hookHttpRequest is not executed!
        await modloader._executePostload()
        modloader.loader.continue()
    }


    await window.startCrossCode()

    if (options.ccloader2) {
        await modloader._waitForGame()
        await modloader._executeMain()
        // modloader._fireLoadEvent()
    }
}
