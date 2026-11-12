function regularImport(url: string) {
    if (useImportMap) {
        const entry = importMap[url]
        if (entry) return entry()
        console.error('missing mod import from importMap:', url)
    }

    return import('../../../../assets/' + url)
}

export function importModScript(url: string) {
    return regularImport(url)
}

export function importModPlugin(url: string) {
    return regularImport(url)
}

const useImportMap = true

const importMap: Record<string, () => any> = {
    'mods/simplify/plugin.js': () => import('../../simplify/plugin.js'),
    // @ts-expect-error
    'mods/simplify/preload.js': () => import('../../simplify/preload.js'),
    // @ts-expect-error
    'mods/simplify/postload.js': () => import('../../simplify/postload.js'),
    // @ts-expect-error
    'mods/simplify/prestart.js': () => import('../../simplify/prestart.js'),
    // @ts-expect-error
    'mods/simplify/mod.js': () => import('../../simplify/mod.js'),

    'mods/crossnode/src/plugin.js': () => import('./plugin.js'),
    'mods/CCModManager/plugin.js': () => import('../../CCModManager/plugin.js'),

    'mods/cc-multibakery/plugin.js': () => import('../../cc-multibakery/plugin.js'),
    'mods/cc-krypek-lib/plugin.js': () => import('../../cc-krypek-lib/plugin.js'),
    'mods/nax-ccuilib/plugin.js': () => import('../../nax-ccuilib/plugin.js'),
    'mods/cc-alybox/src/_prestart.js': () => import('../../cc-alybox/src/_prestart.js'),
    'mods/cc-instanceinator/plugin.js': () => import('../../cc-instanceinator/plugin.js'),

    'mods/cc-multibakery-additions/prestart.js': () => import('../../cc-multibakery-additions/prestart.js'),
    'mods/cc-variable-charge-time/plugin.js': () => import('../../cc-variable-charge-time/plugin.js'),

    'mods/xenons-triblader-mod/prestart.js': () => import('../../xenons-triblader-mod/prestart.js'),
    // @ts-expect-error
    'mods/xenons-triblader-mod/poststart.js': () => import('../../xenons-triblader-mod/poststart.js'),
    'mods/cc-menu-ui-replacement/plugin.js': () => import('../../cc-menu-ui-replacement/plugin.js'),
    'mods/extension-asset-preloader/postload.js': () => import('../../extension-asset-preloader/postload.js'),
    'mods/extendable-severed-heads/plugin.js': () => import('../../extendable-severed-heads/plugin.js'),
}
