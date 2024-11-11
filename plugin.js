const fs = require('fs')
import { initTestApi } from './tester.js'
import { initDeterminism } from './determinism.js'

export default class CrossNode {
    preload() {
        if (!window.crossnode) return
        const { options } = window.crossnode

        if (options.test) {
            initTestApi()
        }

        /* mute the "INIT FULLSCREEN VALUE true" text */
        localStorage.setItem('IG_FULLSCREEN', '')
    }

    prestart() {
        if (!window.crossnode) return

        const { options } = window.crossnode
        if (options.determinism) {
            initDeterminism()
        }

        /* Fix resource loading */
        /* saving it to a variable to it doesnt disappear (it is set to undefined at some point) */
        let simplifyResources = window.simplifyResources

        ig.getFilePath = function (a) {
            a && (a = a.trim())
            const res = ig.fileForwarding[a] ? ig.fileForwarding[a] : a
            return `file://${res}`
        }

        if (options.nukeImageStack) {
            ig.perf.draw = false
            ig.ImagePattern.inject({
                initBuffer() {},
            })
            ig.Font.inject({
                _loadMetrics() {},
            })
            ig.NinePatch.inject({
                draw() {},
                drawComposite() {},
            })
        }

        ig.Image.inject({
            loadInternal() {
                if (options.nukeImageStack) {
                    this.data = new Image()
                    this.width = 0
                    this.height = 0
                    this.loadingFinished(true)
                    return
                }
                this.data = new Image()
                this.data.onload = this.onload.bind(this)
                this.data.onerror = this.onerror.bind(this)

                let path = ig.root + this.path + ig.getCacheSuffix()
                if (options.ccloader2) {
                    path = simplifyResources._applyAssetOverrides(path)
                }
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
            _getExtensionFolder() {
                return ig.root + 'extension/'
            },
            loadInternal() {
                if (options.extensionWhitelist && options.extensionWhitelist.length == 0) {
                    this.onDirRead(true)
                } else {
                    fs.readdir(this._getExtensionFolder(), this.onDirRead.bind(this))
                }
            },
            onExtensionListLoaded(list) {
                if (options.extensionWhitelist) {
                    list = list.filter(ext => options.extensionWhitelist.includes(ext))
                }

                const back = console.log
                console.log = function () {}
                this.parent(list)
                console.log = back

                if (!options.quiet && (!options.extensionWhitelist || options.extensionWhitelist.length > 0)) {
                    console.log('%cEXTENSIONS:%c', 'color:#339966', '', list)
                }
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
        const emptySoundEntry = {
            duration: 4.366666666666666,
            length: 209600,
            numberOfChannels: 2,
            sampleRate: 48000,
        }
        ig.SoundManager.inject({
            init() {
                this.format = {
                    ext: 'ogg',
                }
                this.parent()
                this._createWebAudioContext()
            },
            loadWebAudio(c, d) {
                ig.soundManager.buffers[c] = emptySoundEntry
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

        if (options.test) {
            let i = 0
            function genTest() {
                let finishFunc
                let myI = i
                i++
                return {
                    fps: 60,
                    skipFrameWait: true,
                    timeoutSeconds: 1000e3,

                    seed: 'welcome to hell',
                    modId: 'crossnode',
                    name: `example test ${myI}`,
                    async setup(finish) {
                        ig.interact.entries.forEach(e => ig.interact.removeEntry(e))

                        sc.model.enterNewGame()
                        sc.model.enterGame()
                        ig.game.reset()
                        ig.game.setPaused(false)

                        await window.crossnode.testUtil.loadLevel('crossnode/bots28')

                        finishFunc = finish
                    },
                    update(frame) {
                        if (frame >= 3 * 60) {
                            const expected = { x: 262.87, y: 268.09, z: 0 }
                            const ppos = ig.game.playerEntity.coll.pos
                            if (Vec3.equal(ppos, expected)) {
                                finishFunc(true)
                            } else {
                                function pv(v) {
                                    return `${'{'.white.bold} x: ${v.x.toString().yellow}, y: ${v.y.toString().yellow}, z: ${v.z.toString().yellow} ${'}'.white.bold}`
                                }
                                finishFunc(false, `ig.game.playerEntity.coll.pos is equal ${pv(ppos)}, expected ${pv(expected)}`)
                            }
                            return
                        }
                    },
                }
            }
            for (let i = 0; i < 3; i++) {
                window.crossnode.registerTest(genTest())
            }
        }
    }
}
