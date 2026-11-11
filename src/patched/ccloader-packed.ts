const ASSETS_MODS_LENGTH = 13 //'/assets/mods/'.length;
const CONTENT_TYPES: Record<string, string> = {
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    html: 'text/html',
    htm: 'text/html',
}

declare const JSZip: any
type JSZip = any

const jszipCache = new Map<string, JSZip>()

export class PackedManagerClass {
    async get(url: string) {
        try {
            const zip = await this._openZip(url)
            const file = zip.file(this._assetPath(url))
            if (file === null) {
                return new Response(new Blob(), {
                    status: 404,
                    statusText: 'not found',
                })
            }

            return new Response(await file.async('blob'), {
                headers: {
                    'Content-Type': this._contentType(url),
                },
                status: 200,
                statusText: 'ok',
            })
        } catch (e) {
            console.error('An error occured while reading a packed mod', e)
            return e
        }
    }

    async getFiles(url: string) {
        const zip = await this._openZip(url)
        const folder = this._openFolder(zip, this._assetPath(url))

        const result: string[] = []
        folder.forEach((relativePath: string, file: any) => {
            if (!file.dir) {
                result.push(relativePath)
            }
        })
        return result
    }

    async isDirectory(url: string) {
        const zip = await this._openZip(url)
        const file = zip.file(this._assetPath(url))
        return file && file.dir
    }

    async isFile(url: string) {
        const zip = await this._openZip(url)
        const file = zip.file(this._assetPath(url))
        return !!file
    }

    packedName(url: string) {
        url = this._normalize(url)
        return decodeURIComponent(url.substring(ASSETS_MODS_LENGTH, url.indexOf('/', ASSETS_MODS_LENGTH)))
    }

    async _openZip(url: string) {
        const zip = this._zipPath(url)
        const cached = jszipCache.get(zip)
        if (cached) {
            return cached
        }

        const request = new Request('http://' + location.hostname + '.cc' + zip)
        const cache = await caches.open('zips')
        let response = await cache.match(request)
        if (!response) {
            response = await fetch(zip)
            cache.put(request, response.clone())
        }

        const result = await JSZip.loadAsync(response.blob())
        jszipCache.set(zip, result)
        return result
    }

    _openFolder(root: JSZip, path: string) {
        const folders = path.split(/\//g)
        for (const folder of folders) {
            root = root.folder(folder)
        }
        return root
    }

    _contentType(url: string): string {
        url = this._normalize(url)
        return CONTENT_TYPES[url.substr(url.lastIndexOf('.') + 1)] || 'text/plain'
    }

    _zipPath(url: string) {
        url = this._normalize(url)
        return url.substr(0, url.indexOf('/', ASSETS_MODS_LENGTH))
    }

    _assetPath(url: string) {
        url = this._normalize(url)
        return url.substr(url.indexOf('/', ASSETS_MODS_LENGTH) + 1)
    }

    _normalize(url: string) {
        url = url.replace(/\\/g, '/').replace(/\/\//, '/')
        //TODO: resolve absolute paths
        if (!url.startsWith('/')) {
            url = '/' + url
        }
        if (url.startsWith('/ccloader')) {
            url = url.substr(9) // '/ccloader'.length
        }
        return url
    }
}

declare global {
    var PackedManager: typeof PackedManagerClass
    namespace NodeJS {
        interface Global {
            PackedManager: typeof PackedManagerClass
        }
    }
}
