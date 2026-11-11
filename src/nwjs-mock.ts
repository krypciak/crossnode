export function mockNwjs() {
    nwGui()
    audioFix()
    cachesFix()

    process.versions['node-webkit'] = '0.72.0'
    // @ts-expect-error
    window.name = global.name = ''
}

function nwGui() {
    const nwGui = {
        App: {
            dataPath: './GameData/Default',
            argv: [],
        } satisfies Partial<nw.App> as unknown as nw.App,
        Window: {
            get(): NWJS_Helpers.win {
                return {
                    isFullscreen: false,
                    enterFullscreen() {},
                    leaveFullscreen() {},
                    close() {
                        process.exit(0)
                    },
                } satisfies Partial<NWJS_Helpers.win> as unknown as NWJS_Helpers.win
            },
            async open(_url: string, _option: NWJS_Helpers.WindowOpenOption) {
                return
            },
        } satisfies Partial<nw.Window> as unknown as nw.Window,
        Clipboard: {
            get() {
                return {
                    async set() {},
                    // @ts-expect-error
                    get() {
                        return ''
                    },
                } satisfies Partial<NWJS_Helpers.clip> as unknown as NWJS_Helpers.clip
            },
        } satisfies Partial<nw.Clipboard> as unknown as nw.Clipboard,
        Shell: {
            openExternal(_url) {
                // window.open(url, '_blank')?.focus()
            },
        } satisfies Partial<nw.Shell> as unknown as nw.Shell,
    } as const satisfies Partial<typeof nw>
    window.nw = nwGui as unknown as typeof nw
}

function audioFix() {
    // @ts-expect-error
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

    // @ts-expect-error
    window.Audio = global.Audio = function (_arg) {
        return {
            addEventListener(type: keyof HTMLElementEventMap, listener: (this: any) => void, _options: boolean | EventListenerOptions) {
                // console.log(`Audio: addEventListener(${type}, ${listener.toString().replace(/\n/g, '').replace(/ /g, '')})`)
                if (type == 'canplaythrough') {
                    setTimeout(() => {
                        listener.bind(this)()
                    }, 0)
                }
            },
            removeEventListener(_type: keyof HTMLElementEventMap, _listener: (this: any) => void, _options: boolean | EventListenerOptions) {
                // console.log(`Audio: removeEventListener(${type}, ${duno}, ${boo})`)
            },
            load() {
                // console.log(`Audio: load()`)
            },
        }
    }
}

function cachesFix() {
    window.caches = global.caches = {
        async delete() {
            return true
        },
        async has() {
            return false
        },
        async keys() {
            return []
        },
        async match() {
            console.warn('crossnode: called unimplemented window.caches.match')
            return new Response()
        },
        async open() {
            return {
                async add() {},
                async addAll() {},
                async delete() {
                    return true
                },
                async keys() {
                    return []
                },
                async match() {
                    return new Response()
                },
                async matchAll() {
                    return []
                },
                async put() {},
            }
        },
    }
}
