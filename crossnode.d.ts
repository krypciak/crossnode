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
    determinism?: boolean
    fps?: number
    skipFrameWait?: boolean
}

export interface CrossnodeTestRuntime {
    timeoutSeconds?: number
    fps?: number
    skipFrameWait?: boolean
    seed?: string

    modId: string
    name: string

    setup: (this: CrossnodeTestRuntime) => Promise<void>
    update: (this: CrossnodeTestRuntime, frame: number) => void

    finish: (success: boolean, msg?: string) => void
    id: number
}
export type CrossnodeTest = Omit<CrossnodeTestRuntime, 'finish' | 'id'>

declare global {
    var crossnode: {
        waitForGamePromise: Promise<void>
        options: CrossnodeOptions

        tests: CrossnodeTestRuntime[]
        registerTest: (task: CrossnodeTest) => void
        currentTestId: number

        testUtil: {
            loadLevel(mapName: string, marker?: ig.TeleportPosition, hint?: ig.Game.TeleportLoadHint): Promise<void>
        }
    }
}

export function startCrossnode(options: CrossnodeOptions): Promise<void>
