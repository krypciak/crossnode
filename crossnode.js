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
            'entries'
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

    if (options.autoEnterGame) {
        options.skipTitlescreen = true
        setTimeout(() => {
            function keyPress(time, keyCode) {
                return [
                    { time, event: 'keydown', opts: { keyCode } },
                    { time: 10, event: 'keyup', opts: { keyCode } },
                ]
            }
            const actions = [...keyPress(2e3, 40), ...keyPress(10, 13), ...keyPress(5e3, 13), ...keyPress(500, 89), ...keyPress(10, 13)]
            let i = 0

            function nextAction() {
                const act = actions[i++]
                if (!act) return
                setTimeout(() => {
                    window.dispatchEvent(new window.KeyboardEvent(act.event, act.opts))
                    nextAction()
                }, act.time || 0)
            }
            nextAction()
        }, 3e3)
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

    /* Fix resource loading */
    {
        /* saving it to a variable to it doesnt disappear (it is set to undefined at some point) */
        let simplifyResources = window.simplifyResources
        
        ig.getFilePath = function (a) {
            a && (a = a.trim())
            const res = ig.fileForwarding[a] ? ig.fileForwarding[a] : a
            return `file://${res}`
        }
        ig.Image.inject({
            loadInternal() {
                this.data = new Image()
                this.data.onload = this.onload.bind(this)
                this.data.onerror = this.onerror.bind(this)
                let path = ig.root + this.path + ig.getCacheSuffix()
                path = simplifyResources._applyAssetOverrides(path)
                this.data.src = path
            },
            onerror() {
                if (options.printImageError) {
                    console.log('Image error!', this.data.src)
                }
                this.data = new Image()
                this.onload()
            },
        })
        ig.Lang.inject({
            loadInternal() {
                for (var a = 0; a < ig.langFileList.length; ++a) {
                    var b = ig.root + ig.langFileList[a].toPath('data/lang/', '.' + ig.currentLang + '.json')
                    $.ajax({ dataType: 'json', url: ig.getFilePath(b + ig.getCacheSuffix()), context: this, success: this.onload.bind(this), error: this.onerror.bind(this) })
                }
                this._doCallback()
            },
        })
        ig.GlobalSettings.inject({
            loadInternal: function () {
                $.ajax({
                    dataType: 'json',
                    url: ig.getFilePath(ig.root + 'data/global-settings.json' + ig.getCacheSuffix()),
                    context: this,
                    success: this.onload.bind(this),
                    error: this.onerror.bind(this),
                })
            },
        })
        ig.TileInfoList.inject({
            loadInternal() {
                $.ajax({ dataType: 'json', url: ig.getFilePath(ig.root + ig.TILEINFO_FILE + ig.getCacheSuffix()), context: this, success: this.onload.bind(this), error: this.onerror.bind(this) })
            },
        })
        ig.ExtensionList.inject({
            loadInternal() {
                const b = ig.getFilePath(this._getExtensionFolder())
                fs.readdir(b, this.onDirRead.bind(this))
                // ig.platform == ig.PLATFORM_TYPES.DESKTOP ? this.loadExtensionsNWJS() : this.loadExtensionsPHP()
            },
        })
        ig.Database.inject({
            loadInternal() {
                $.ajax({ dataType: 'json', url: ig.getFilePath(ig.root + ig.DATABASE_FILE + ig.getCacheSuffix()), context: this, success: this.onload.bind(this), error: this.onerror.bind(this) })
            },
        })
        ig.Terrain.inject({
            loadInternal() {
                $.ajax({ dataType: 'json', url: ig.getFilePath(ig.root + ig.TERRAIN_FILE + ig.getCacheSuffix()), context: this, success: this.onload.bind(this), error: this.onerror.bind(this) })
            },
        })
        sc.VerionChangeLog.inject({
            loadInternal() {
                $.ajax({ dataType: 'json', url: ig.getFilePath(ig.root + ig.CHANGE_LOG + ig.getCacheSuffix()), context: this, success: this.onload.bind(this), error: this.onerror.bind(this) })
            },
        })
        sc.Inventory.inject({
            loadInternal() {
                $.ajax({ dataType: 'json', url: ig.getFilePath(ig.root + ig.ITEM_DATABASE + ig.getCacheSuffix()), context: this, success: this.onload.bind(this), error: this.onerror.bind(this) })
            },
        })
        sc.SkillTree.inject({
            loadInternal() {
                $.ajax({ dataType: 'json', url: ig.getFilePath(ig.root + ig.SKILL_TREE + ig.getCacheSuffix()), context: this, success: this.onload.bind(this), error: this.onerror.bind(this) })
            },
        })
        sc.CreditSectionLoadable.inject({
            loadInternal() {
                $.ajax({
                    dataType: 'json',
                    url: ig.getFilePath(ig.root + b.toPath('data/credits/', '.json') + ig.getCacheSuffix()),
                    context: this,
                    success: this.onload.bind(this),
                    error: this.onerror.bind(this),
                })
            },
        })
    }
    {
        ig.$ = function (a) {
            // /* weird */ if (a == '#canvas') return canvas
            return a.charAt(0) == '#' ? document.getElementById(a.substr(1)) : document.getElementsByTagName(a)
        }

        ig.MapSoundEntry.inject({
            start() {
                return
            },
            stop() {
                return
            },
        })
        ig.Sound.enabled = false
        ig.SoundManager.inject({
            init() {
                this.format = {
                    ext: 'ogg',
                }
                this.parent()
                this._createWebAudioContext()
            },
            loadWebAudio(c, d) {
                ig.soundManager.buffers[c] = {
                    duration: 4.366666666666666,
                    length: 209600,
                    numberOfChannels: 2,
                    sampleRate: 48000,
                }
                d && d(c, true)
            },
        })
        ig.TrackDefault.inject({
            play() {
                return
            },
            pause() {
                return
            },
        })
    }
    /* Skip title screen */
    if (options.skipTitlescreen) {
        sc.TitleScreenGui.inject({
            init(...args) {
                this.parent(...args)
                if (true) {
                    this.introGui.timeLine = [{ time: 0, end: true }]
                    this.bgGui.parallax.addLoadListener({
                        onLoadableComplete: () => {
                            let { timeLine } = this.bgGui
                            let idx = timeLine.findIndex(item => item.time > 0)
                            if (idx < 0) idx = timeLine.length
                            timeLine.splice(idx, 0, { time: 0, goto: 'INTRO_SKIP_NOSOUND' })
                        },
                    })
                    this.removeChildGui(this.startGui)
                    this.startGui = {
                        show: () => {
                            ig.interact.removeEntry(this.screenInteract)
                            this.buttons.show()
                        },
                        hide: () => {},
                    }
                }
            },
        })
    }

    if (options.writeImage) {
        const inter = options.writeImageInterval ?? 1000 / 10

        setInterval(() => {
            if (!(ig && ig.system && ig.system.canvas)) return
            const canvas = ig.system.canvas
            fs.writeFileSync('image.png', Buffer.from(canvas.toDataURL().split(',')[1], 'base64'))
            // console.log('writing')
        }, inter)
    }

    await window.startCrossCode()

    if (options.ccloader2) {
		await modloader._waitForGame();
        await modloader._executeMain()
        // modloader._fireLoadEvent()
    }
}
