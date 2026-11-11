import * as fs from 'fs'
import * as semver from 'semver'

import { PackedManagerClass } from './patched/ccloader-packed'
// @ts-ignore
import type { Mod } from '../../../../ccloader/js/mod'
import type { CrossnodeOptions } from './crossnode'
import { importCCLoaderClasses } from './ccloader-imports'

type ModLoader = InstanceType<typeof import('../../../../ccloader/js/ccloader.js').ModLoader>
export async function ccloaderInit(options: CrossnodeOptions) {
    // @ts-expect-error
    window.isLocal = true
    // @ts-expect-error
    window.semver = global.semver = semver

    window.PackedManager = global.PackedManager = PackedManagerClass

    const { Loader, UI, ModLoader, Filemanager } = await importCCLoaderClasses()

    const origFetch = global.fetch

    // @ts-expect-error
    window.fetch = global.fetch = function (url: string) {
        if (url.startsWith('http')) return origFetch(url)
        if (!url.startsWith('assets/') && !url.startsWith('/assets/')) {
            url = 'assets/' + url
        }
        url = './' + url
        return new Promise(async res => {
            const data = await fs.promises.readFile(url, 'utf8')
            res({
                async text() {
                    return data
                },
                json() {
                    return JSON.parse(data)
                },
            } as Response)
        })
    }

    const PatchedFileManager = class extends Filemanager {
        getAllModPackages() {
            return []
        }
        async packedFileExists() {
            return false
        }
        loadImage(path: string) {
            return super.loadImage('./' + path.substring('../'.length))
        }
        async _loadScript(url: string, _doc: unknown, _type: string) {
            return import(`../../../${url}`)
        }
    }
    const PatchedUI = class extends UI {
        _drawMessage() {}
    }

    type PatchedFileManager = InstanceType<typeof PatchedFileManager>
    type Loader = InstanceType<typeof Loader>

    const PatchedModLoader = class {
        filemanager: PatchedFileManager
        ui: InstanceType<typeof UI>
        loader: Loader
        overlay: HTMLElement
        status: HTMLElement
        mods: Mod[]
        versions: Record<string, string>
        extensions: string[]

        async _initializeServiceWorker() {}
        constructor() {
            // @ts-expect-error
            console.logToFile = function () {}

            this.filemanager = new PatchedFileManager(this as unknown as ModLoader)
            this.ui = new PatchedUI(this as unknown as ModLoader)

            this.loader = new Loader(this.filemanager, this.ui)
            this.loader.doc = new DOMParser().parseFromString(
                `<html>
                <body>
                    <div id="status"></div>
                </body>
            </html>`,
                'text/html'
            )

            this.overlay = document.getElementById('overlay')!
            this.status = document.getElementById('status')!

            this.mods = []
            this.versions = {}
            this.extensions = this.filemanager.getExtensions()
        }
    }
    Object.setPrototypeOf(PatchedModLoader.prototype, ModLoader.prototype)

    const modloader = new PatchedModLoader() as unknown as ModLoader

    await modloader._buildCrosscodeVersion()

    // await this.loader.initialize()

    await modloader._loadModPackages()
    if (options.modWhitelist) {
        options.modWhitelist.push('crossnode', 'Simplify')
        modloader.mods = modloader.mods.filter(mod => options.modWhitelist!.includes(mod.name))
    }

    modloader._removeDuplicateMods()
    modloader._orderCheckMods()
    modloader._registerMods()

    if (!options.quiet) {
        console.log(
            'MODS:',
            modloader.mods.map(mod => mod.name)
        )
    }

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

    return modloader
}

export async function ccloaderPostload(modloader: ModLoader) {
    await modloader._executePostload()
}

export async function ccloaderPoststart(modloader: ModLoader) {
    await modloader._executeMain()
    // modloader._fireLoadEvent()
}
