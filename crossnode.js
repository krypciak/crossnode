import { JSDOM } from 'jsdom'
import { Navigator } from 'node-navigator'
import { LocalStorage } from 'node-localstorage'
import { Image } from 'canvas'
import jquery from 'jquery'
import CryptoJS from 'crypto-js'
import * as readline from 'readline'
import * as fs from 'fs'

export async function startCrossnode(options) {
    process.chdir('../../js')
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
            runScripts: 'dangerously',
            resources: 'usable',
        }
    )

    // @ts-expect-error
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

    // @ts-expect-error
    window.Image = global.Image = Image

    // @ts-expect-error
    window.$ = global.$ = jquery(window)

    window.CryptoJS = global.CryptoJS = CryptoJS

    await import('../../impact/page/js/seedrandom.js')

    /* Set variables from assets/node-webkit.html */
    {
        window.IG_GAME_SCALE = global.IG_GAME_SCALE = 1
        window.IG_GAME_CACHE = global.IG_GAME_CACHE = ''
        window.IG_ROOT = global.IG_ROOT = `${process.cwd()}/../`
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
        ]

        for (const name of toCapture) {
            captureWindowVar(name)
        }
    }

    window.HTMLElement = global.HTMLElement = function () {}
    window.name = global.name = ''

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
            eval(line)
        })

        rl.once('close', () => {})
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
    const gameCompliedJs = await fs.promises.readFile('./game.compiled.crossnode.js', 'utf8')
    eval(gameCompliedJs)

    /* Fix resource loading */
    {
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
                this.data.src = ig.root + this.path + ig.getCacheSuffix()
            },
            onerror() {
                // this.loadingFinished(false)
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
            onDirRead: function (a, b) {
                var c = this._getExtensionFolder(),
                    e = fs, //window.require('fs'),
                    f = []
                if (!a)
                    for (var g = 0; g < b.length; ++g) {
                        var h = b[g]
                        if (h[0] != '.')
                            if (window.IG_GAME_DEBUG) {
                                var i = h.indexOf('.json')
                                i !== -1 && f.push(h.substr(0, i))
                            } else e.lstatSync(c + h).isDirectory() && e.existsSync(c + h + '/' + h + '.json') && f.push(h)
                    }
                this.onExtensionListLoaded(f)
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
                this.context = {
                    getSampleRate() {
                        return 0
                    },
                    getCurrentTimeRaw() {
                        return 0
                    },
                    context: {
                        state: 'duno',
                    },
                }
                this.format = {
                    ext: 'ogg',
                }
                this.parent()
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
    }
    window.startCrossCode()
}
