import type { Mod } from '../../../../../ccloader/js/mod.js'
import { importSimplifyPostloadMoudleLibs } from '../ccloader-imports'

const { patchSteps, stripJsonComments, CustomDebugState } = await importSimplifyPostloadMoudleLibs()

interface Handler {
    handler: (xhr: any, url: string) => void
    filter?: string
    beforeCall?: boolean
}

export class SimplifyResources {
    handlers: Handler[] = []
    patchSteps = {
        callable: patchSteps.callable,
    }

    igroot: string = window.IG_ROOT || ''

    constructor() {
        this._hookAjax()
        this._hookHttpRequest()
        this._hookImages()
    }

    async generatePatches(mod: string | Mod) {
        if (typeof mod == 'string') {
            // @ts-expect-error
            this.generatePatches(window.simplify.getMod(mod))
            return
        }

        const baseDir = mod.baseDirectory.substring(7)
        // @ts-expect-error
        const assets: string[] = window.simplify.getAssets(mod)
        for (const asset of assets) {
            if (!asset.endsWith('.json')) {
                continue
            }

            const original = asset.substring(baseDir.length + 7)
            const patch = await this.generatePatch(original, asset)
            console.log('File: ' + asset + '.patch')
            console.log(JSON.stringify(patch))
        }
    }

    async _applyPatch(target: object, patchData: object | unknown[], patch: { mod: Mod; path: string }): Promise<any> {
        const debugState = new CustomDebugState()
        debugState.setPatch(patch)
        debugState.addFile([true, patch.path])
        await patchSteps.patch(
            target,
            patchData,
            async (fromGame: boolean, url: string) => {
                if (fromGame) {
                    // Import (game file)
                    return await this.loadJSONPatched(this.igroot + url)
                } else {
                    // Include (mod file)
                    return await this.loadJSON(patch.mod.baseDirectory + url)
                }
            },
            debugState
        )
    }

    async generatePatch(original: string | object, modified: string | object): Promise<unknown[] | null> {
        if (original.constructor === String) original = await this.loadJSON(original)

        if (modified.constructor === String) modified = await this.loadJSON(modified)

        return patchSteps.diff(original, modified)
    }

    registerHandler(handler: Handler['handler'], filter: string, beforeCall: boolean) {
        this.handlers.push({ handler, filter, beforeCall })
    }

    loadFile(path: string, callback?: (res: string) => void, errorCb?: (err: unknown) => void) {
        const result = fetch(this._stripAssets(path)).then(resp => resp.text())

        if (callback || errorCb) {
            result.then(callback).catch(errorCb)
        }

        return result
    }

    loadJSON(path: string, callback?: () => void, errorCb?: () => void): Promise<any> {
        const result = new Promise((resolve, reject) => {
            this.loadFile(path)
                .then(data => resolve(JSON.parse(stripJsonComments(data, { trailingCommas: true }))))
                .catch(err => reject(err))
        })

        if (callback || errorCb) {
            result.then(callback).catch(errorCb)
        }

        return result
    }

    async loadFilePatched(path: string): Promise<string> {
        // Detect if this would be patched, which implies it's a JSON file.
        const patches = this._getRelevantPatchDetails(path)
        if (patches.length > 0) {
            // It would. loadJSONPatched - with original path for equivalent functionality.
            return JSON.stringify(await this.loadJSONPatched(path))
        }
        return await this.loadFile(this._applyAssetOverrides(path))
    }

    loadJSONPatched(path: string): Promise<any> {
        // To avoid reimplementing the code that was already implemented.
        return new Promise((resolve, reject) => {
            $.ajax({
                dataType: 'json',
                url: path,
                success: val => {
                    resolve(val)
                },
                error: xhr => {
                    reject(`Error ${xhr.status}: Could not load "${path}"`)
                },
            })
        })
    }

    _applyAssetOverrides(path: string): string {
        const apply = () => {
            if (!path.startsWith(this.igroot)) {
                return ''
            }
            const fullreplace = this._getAllAssets(path.substring(this.igroot.length))

            if (fullreplace && fullreplace.length > 0) {
                if (fullreplace.length > 1) console.warn("Conflict between '" + fullreplace.join("', '") + "' found. Taking '" + fullreplace[0] + "'")

                //console.log("Replacing '" + settings.url + "' with '" + fullreplace[0]  + "'");

                if (fullreplace[0].indexOf('assets') === 0) {
                    return this.igroot + fullreplace[0].substring(7)
                } else {
                    return this.igroot + fullreplace[0]
                }
            }
            return path
        }
        if (!path.startsWith('file://')) return apply()

        path = path.substring('file://'.length)
        const res = apply()
        return res
    }

    _getRelevantPatchDetails(path: string): { mod: Mod; path: string }[] {
        if (path.startsWith('file://')) path = path.substring(7)
        return this._getAllAssetDetails(path.substring(this.igroot.length) + '.patch')
    }

    async _hookAjax() {
        $.ajaxSetup({
            // @ts-expect-error
            beforeSend: async (_, settings: JQueryAjaxSettings) => {
                if (settings.url?.constructor !== String) {
                    return console.log(settings)
                }

                // Apply asset overrides.
                const originalUrl = settings.url
                settings.url = this._applyAssetOverrides(settings.url)
                if (!settings.url.startsWith('file://')) {
                    settings.url = 'file://' + settings.url
                }

                // Run request pre handlers
                this._callHandlers(settings, true)

                let successArgs
                try {
                    successArgs = await this._handleAjaxPatching(originalUrl, this._waitForAjax(settings))
                } catch (e) {
                    // @ts-expect-error
                    settings.error!.apply(settings.context, e)
                    return
                }

                // Done, run final handlers
                this._callHandlers(settings, false)

                // @ts-expect-error
                settings.success!.apply(settings.context, successArgs)
            },
        })
    }

    _callHandlers(settings: JQueryAjaxSettings, beforeCall: boolean) {
        const url = settings.url!.substring(this.igroot.length)
        for (const entry of this.handlers) {
            if (entry.beforeCall == beforeCall && (!entry.filter || url.match(entry.filter))) {
                entry.handler(settings, url)
            }
        }
    }

    _waitForAjax(settings: JQueryAjaxSettings): Promise<any[]> {
        const success = settings.success
        const error = settings.error

        return new Promise<any[]>((resolve, reject) => {
            settings.success = (...sArgs) => {
                this._restoreSettings(settings, success, error)
                resolve(sArgs)
            }
            settings.error = (...err) => {
                this._restoreSettings(settings, success, error)
                reject(err)
            }
        })
    }

    _restoreSettings(settings: JQueryAjaxSettings, success: JQueryAjaxSettings['success'], error: JQueryAjaxSettings['error']) {
        settings.success = success
        settings.error = error
    }

    async _handleAjaxPatching(url: string, promise: Promise<unknown>): Promise<any> {
        // To simplify the timeline, assume patching is always going on.
        // If any patches are actually *present*, the file must be JSON.
        const patches = this._getRelevantPatchDetails(url)

        // It is assumed that a patch's index in here is the patch's normal index + 1.
        // The same applies to the resulting value table later.
        const promises = []

        // Load all resources needed
        promises.push(promise)
        for (const patch of patches) promises.push(this.loadJSON(patch.path))

        // Done making the parallel requests
        const values = await this._awaitAll(promises)
        if (values[0].status !== 'resolved') {
            throw values[0].value
        }

        const successArgs = values[0].value
        for (let i = 0; i < patches.length; i++) {
            if (values[i + 1].status !== 'resolved') {
                console.error(`Could not load patch '${patches[i].path}' for '${url}': `, values[i + 1].value)
                continue
            }

            await this._applyPatch(successArgs[0], values[i + 1].value, patches[i])
        }
        return successArgs
    }

    _awaitAll(promises: Promise<any>[]): Promise<{ status: 'resolved' | 'rejected'; value: any }[]> {
        // @ts-expect-error
        return Promise.all(promises.map(p => p.then(value => ({ status: 'resolved', value: value })).catch(err => ({ status: 'rejected', value: err }))))
    }

    _hookHttpRequest() {
        const instance = this
        const original = window.XMLHttpRequest.prototype.open
        window.XMLHttpRequest.prototype.open = function (_, url: string) {
            url = instance._applyAssetOverrides(url) || url
            url = 'file://' + process.cwd() + '/assets/' + url
            arguments[1] = url
            // @ts-expect-error
            return original.apply(this, arguments)
        }
    }

    _hookImages() {
        const instance = this
        const original = window.Image
        const igroot = this.igroot
        window.Image = class Image extends original {
            set src(url: string) {
                const fullreplace = instance._getAllAssets(url.substring(igroot.length))

                if (fullreplace && fullreplace.length > 0) {
                    if (fullreplace.length > 1) {
                        console.warn("Conflict between '" + fullreplace.join("', '") + "' found. Taking '" + fullreplace[0] + "'")
                    }

                    //console.log('Replacing \'' + url + '\' with \'' + fullreplace[0]  + '\'');

                    if (fullreplace[0].indexOf('assets') === 0) {
                        url = igroot + fullreplace[0].substring(7)
                    } else {
                        url = igroot + fullreplace[0]
                    }
                }

                super.src = url
            }
        }
    }

    _stripAssets(path: string) {
        return path.indexOf('assets/') == 0 ? path.substring(7) : path
    }

    _getAllAssets(name: string): string[] {
        const result: string[] = []

        // @ts-expect-error
        for (const mod of window.activeMods) {
            const asset = mod.getAsset(name)
            if (asset) {
                if (typeof asset === 'string') {
                    result.push(asset)
                } else {
                    result.push(...asset)
                }
            }
        }

        return result
    }

    _getAllAssetDetails(name: string): { mod: Mod; path: string }[] {
        const result: { mod: Mod; path: string }[] = []

        // @ts-expect-error
        for (const mod of window.activeMods) {
            const asset = mod.getAsset(name)

            if (asset) {
                if (typeof asset === 'string') {
                    result.push({
                        mod: mod,
                        path: asset,
                    })
                } else {
                    for (const subasset of asset) {
                        result.push({
                            mod: mod,
                            path: subasset,
                        })
                    }
                }
            }
        }

        return result
    }
}

declare global {
    var simplifyResources: SimplifyResources
    var simplifyResources1: SimplifyResources
}
