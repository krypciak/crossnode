export type CrossnodeOptions = {
    shell?: boolean
    writeImage?: boolean
    writeImageInterval?: number
    printImageError?: boolean
    skipTitlescreen?: boolean
    autoEnterGame?: boolean
    quiet?: boolean

    nukeImageStack?: boolean
    extensionWhitelist?: string[]

    ccloader2?: boolean
    modWhitelist?: string[]

    test?: boolean
    modTestWhitelist?: string[]
    fps?: number
    skipFrameWait?: boolean
}

export type CrossnodeTestRuntime<T> = T & {
    timeoutSeconds?: number
    fps?: number
    skipFrameWait?: boolean

    modId: string
    name: string

    setup(this: CrossnodeTestRuntime<T>): void | Promise<void>
    update(this: CrossnodeTestRuntime<T>, frame: number, kras: T): void
    cleanup?(this: CrossnodeTestRuntime<T>): void | Promise<void>

    finish: (success: boolean, msg?: string) => void
    id: number
}
export type CrossnodeTest<T = {}> = Omit<CrossnodeTestRuntime<T>, 'finish' | 'id'>

declare global {
    var crossnode: {
        waitForGamePromise: Promise<void>
        options: CrossnodeOptions

        tests: CrossnodeTestRuntime<{}>[]
        registerTest: <E>(task: CrossnodeTest<E>) => CrossnodeTestRuntime<E>
        currentTestId: number

        testUtil: {
            loadLevel(mapName: string, marker?: ig.TeleportPosition, hint?: ig.Game.TeleportLoadHint): Promise<void>
        }
    }
}

export function startCrossnode(options: CrossnodeOptions): Promise<void>
