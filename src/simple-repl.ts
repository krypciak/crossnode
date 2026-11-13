import type * as readline from 'readline'
import type { ReplOptions, REPLServer } from 'repl'

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
            const result = (0, eval)(code)
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
