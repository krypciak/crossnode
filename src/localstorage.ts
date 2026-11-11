import fs from 'fs'
import path from 'path'

export class AsyncLocalStorage {
    cache = new Map()
    storagePath
    flushIntervalMs
    changeCount = 0
    isSaving = false

    constructor(options) {
        this.storagePath = path.resolve(options.storagePath)
        this.flushIntervalMs = options.flushIntervalMs ?? 5000

        this.loadFromDisk()

        setInterval(() => this.saveToDisk(), this.flushIntervalMs)

        return new Proxy(this, {
            get(target, prop) {
                if (prop in target) {
                    const value = Reflect.get(target, prop, target)
                    return typeof value === 'function' ? value.bind(target) : value
                }
                return target.getItem(String(prop))
            },
            set(target, prop, value) {
                if (prop in target) {
                    return Reflect.set(target, prop, value, target)
                }
                target.setItem(String(prop), String(value))
                return true
            },
            deleteProperty(target, prop) {
                if (prop in target) {
                    return Reflect.deleteProperty(target, prop)
                }
                target.removeItem(String(prop))
                return true
            },
        })
    }

    getItem(key) {
        return this.cache.get(key) ?? null
    }

    setItem(key, value) {
        this.cache.set(key, String(value))
        this.onChange()
    }

    removeItem(key) {
        this.cache.delete(key)
        this.onChange()
    }

    clear() {
        this.cache.clear()
        this.onChange()
    }

    get length() {
        return this.cache.size
    }

    key(index) {
        if (index < 0 || index >= this.cache.size) return null
        return Array.from(this.cache.keys())[index]
    }

    onChange() {
        this.changeCount++
    }

    async saveToDisk() {
        if (this.isSaving || this.changeCount == 0) return
        this.isSaving = true

        try {
            const dataToWrite = Object.fromEntries(this.cache)
            await fs.promises.writeFile(this.storagePath, JSON.stringify(dataToWrite, null, 2))
            this.changeCount = 0
        } catch (err) {
            console.error(`Error writing to ${this.storagePath}:`, err)
        } finally {
            this.isSaving = false
        }
    }

    async loadFromDisk() {
        try {
            const fileContent = await fs.promises.readFile(this.storagePath, 'utf-8')
            const parsed = JSON.parse(fileContent)
            if (parsed && typeof parsed === 'object') {
                for (const [key, value] of Object.entries(parsed)) {
                    this.cache.set(key, String(value))
                }
            }
        } catch (err) {
            if (err.code != 'ENOENT') {
                console.error(`Error loading storage file ${this.storagePath}:`, err)
            }
        }
    }
}
