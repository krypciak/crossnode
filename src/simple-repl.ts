import type * as readline from 'readline'
import type { ReplOptions, REPLServer } from 'repl'
import { isPorffor } from './util'

export function createFakeReplModuleWithSimpleRepl(): typeof import('repl') {
    return {
        start(config?: string | ReplOptions) {
            const settings = !config || typeof config == 'string' ? { prompt: config } : config
            return new SimpleRepl(settings) as unknown as REPLServer
        },
    } satisfies Partial<typeof import('repl')> as typeof import('repl')
}

export class SimpleRepl {
    private rl!: readline.Interface
    private commands = new Map<string, { help: string; action: (name?: string) => void }>()
    private onExit?: () => void

    constructor(private settings: { prompt?: string; ignoreUndefined?: boolean }) {
        this.settings.prompt ??= '> '
        this.start()
    }

    private async start() {
        const readline: typeof import('readline') = await import('readline')
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: this.settings.prompt,
            terminal: true,
        })
        this.rl.on('line', this.onLine.bind(this))
        this.rl.on('SIGINT', () => this.rl.close())
        this.rl.on('close', () => this.onExit?.())
        this.rl.prompt()
    }

    defineCommand(name: string, cmd: { help: string; action: (name?: string) => void }) {
        this.commands.set(name, cmd)
    }

    displayPrompt() {
        this.rl.prompt()
    }

    private onLine(line: string) {
        const trimmed = line.trim()
        if (!trimmed) {
            this.rl.prompt()
            return
        }
        if (trimmed.startsWith('.')) {
            this.handleCommand(trimmed)
            return
        }
        this.evaluate(trimmed)
    }

    private handleCommand(input: string) {
        const parts = input.slice(1).split(/\s+/)
        const cmd = parts[0]
        const args = parts.slice(1).join(' ')

        if (cmd === 'help') {
            for (const [name, { help }] of this.commands) {
                console.log(`.${name}  ${help}`)
            }
            this.rl.prompt()
            return
        }

        if (cmd === 'exit') {
            this.rl.close()
            return
        }

        const command = this.commands.get(cmd)
        if (command) {
            command.action(args)
            return
        }

        console.error(`Invalid command: .${cmd}`)
        this.rl.prompt()
    }

    private evaluate(code: string) {
        try {
            const result = isPorffor() ? evaluateGlobalPath(code) : (0, eval)(code)
            if (!this.settings.ignoreUndefined || result !== undefined) {
                console.log(result)
            }
        } catch (err) {
            console.error(err)
        }
        this.rl.prompt()
    }

    close() {
        this.rl.close()
    }

    on(event: 'exit', func: () => void) {
        if (event != 'exit') throw new Error(`SimpleRepl#on only supported events are: ['exit'], called: .on('${event}')`)
        this.onExit = func
    }
}

function readGlobalPath(path: (string | number)[], object: any): any {
    for (const key of path) {
        // probing a path (`ig.game.player.name`) is not an error: a missing
        // intermediate simply means the whole expression is undefined
        if (object == null) return undefined
        object = object[key]
    }
    return object
}

// Split `a.b[2].c`, `a["b"][2]` or `a.b.2.c` into property keys.
function parseGlobalPath(code: string): (string | number)[] {
    const path: (string | number)[] = []
    const length = code.length
    let i = 0

    while (i < length) {
        const ch = code[i]
        if (ch === '.') {
            i++
            continue
        }
        if (ch === '[') {
            const close = code.indexOf(']', i + 1)
            const inner = close === -1 ? '' : code.slice(i + 1, close).trim()
            const quote = inner[0]
            if (/^\d+$/.test(inner)) path.push(Number(inner))
            else if (inner.length >= 2 && (quote === '"' || quote === "'") && inner[inner.length - 1] === quote) {
                path.push(inner.slice(1, -1))
            } else throw new Error(`SimpleRepl under Porffor expected a number or string in [], got: ${code}`)
            i = close + 1
            if (i < length && code[i] !== '.' && code[i] !== '[') {
                throw new Error(`SimpleRepl under Porffor only supports property paths like a.b or a[0].c, got: ${code}`)
            }
            continue
        }

        const start = i
        while (i < length && /[A-Za-z0-9_$]/.test(code[i])) i++
        const part = code.slice(start, i)
        if (!part) throw new Error(`SimpleRepl under Porffor only supports property paths like a.b or a[0].c, got: ${code}`)
        if (/^\d+$/.test(part)) path.push(Number(part))
        else if (/^[A-Za-z_$]/.test(part)) path.push(part)
        else throw new Error(`SimpleRepl under Porffor only supports property paths like a.b or a[0].c, got: ${code}`)
    }

    return path
}

function evaluateGlobalPath(code: string): any {
    return readGlobalPath(parseGlobalPath(code.replace(/;$/, '')), globalThis)
}
