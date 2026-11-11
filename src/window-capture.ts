function captureWindowVar(name: keyof typeof globalThis) {
    Object.defineProperty(window, name, {
        set(v) {
            delete window[name]
            Object.defineProperty(window, name, {
                writable: true,
                value: v,
                configurable: true,
            })
            // @ts-expect-error
            global[name] = v
        },
        configurable: true,
    })
}

export function setupWindowCapture() {
    /* Set variables from assets/node-webkit.html */
    window.IG_GAME_SCALE = global.IG_GAME_SCALE = 1
    window.IG_GAME_CACHE = global.IG_GAME_CACHE = ''
    window.IG_ROOT = global.IG_ROOT = ''
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
    const toCapture: (keyof typeof globalThis)[] = [
        'sc',
        'ig',
        'Vec2',
        'Vec3',
        // @ts-expect-error
        'Line2',
        'KeySpline',
        'KEY_SPLINES',
        // @ts-expect-error
        'assert',
        // @ts-expect-error
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
        // @ts-expect-error
        'IS_IT_CUBAUM',
        // @ts-expect-error
        'checkPlayerPos',
        'testGui',
        'startCrossCode',
        // @ts-expect-error
        'activeMods',
        // @ts-expect-error
        'inactiveMods',
        'Plugin',
        // @ts-expect-error
        'versions',
        // @ts-expect-error
        'Greenworks',
        'simplifyResources',
        // @ts-expect-error
        'isLocal',
        'crossnode',
        'ccmod',
        /* mod specific */
        // @ts-expect-error
        'modmanager',
        // @ts-expect-error
        'cc',
        // @ts-expect-error
        'nax',
        // @ts-expect-error
        'entries',
        // @ts-expect-error
        'simplify',
        // @ts-expect-error
        'customPlayerMenus',
    ]

    for (const name of toCapture) {
        captureWindowVar(name)
    }
}
