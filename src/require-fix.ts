import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as http from 'http'
import * as https from 'https'
import * as dns from 'dns'
import * as util from 'util'
import events from 'events'
import * as tty from 'tty'
import * as url from 'url'
import buffer from 'buffer'
import stream from 'stream'
import * as async_hooks from 'async_hooks'
import * as zlib from 'zlib'
import * as net from 'net'
import * as tls from 'tls'
import * as querystring from 'querystring'
import * as timers from 'timers'
import * as supportsColor from 'supports-color'
import * as os from 'os'
import * as child_process from 'child_process'
// @ts-expect-error
import bufferutil from 'bufferutil'
import stringDecoder from 'string_decoder'
import * as ws from 'ws'
import steamWeb from 'stream/web'
import http2 from 'http2'
import consoleImport from 'console'
// import dgram from 'dgram'
const dgram = {}
import dnsPromises from 'dns/promises'
import moduleImport from 'module'
import processImport from 'process'
import readline from 'readline'

export function requireFix() {
    const requireMap: Record<string, any> = {
        fs: fs,
        path: path,
        crypto: crypto,
        http: http,
        https: https,
        dns: dns,
        util: util,
        tty: tty,
        url: url,
        buffer: buffer,
        stream: stream,
        string_decoder: stringDecoder,
        async_hooks: async_hooks,
        events: events,
        zlib: zlib,
        net: net,
        tls: tls,
        querystring: querystring,
        'supports-color': supportsColor,
        timers: timers,
        bufferutil: bufferutil,
        os: os,
        ws: ws,
        'fs/promises': fs.promises,
        'stream/web': steamWeb,
        http2: http2,
        console: consoleImport,
        dgram: dgram,
        'dns/promises': dnsPromises,
        module: moduleImport,
        process: processImport,
        child_process: child_process,
        readline: readline,

        'nw.gui': window.nw,
        './modules/greenworks-nw-0.35/greenworks': undefined,
        assert: (() => {
            const func = function (cond: unknown) {
                if (!cond) throw new Error('assertion failed')
            }
            func.ok = func
            return func
        })(),
    }

    const isBun = typeof global.Bun !== 'undefined'

    // @ts-expect-error
    window.require = global.require = function (name) {
        if (name.startsWith('node:')) name = name.substring('node:'.length)

        const entry = requireMap[name]
        if (entry) return entry

        if (isBun) return require(name)

        console.error(`\nunknown require() module: "${name}"\n`)
        return {}
    }
}
