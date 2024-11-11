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

export interface CrossnodeTest {
    timeoutSeconds?: number
    fps?: number
    skipFrameWait?: boolean
    seed?: string

    modId: string
    name: string

    setup: (finish: (success: boolean, msg?: string) => void) => Promise<void>
    update: (frame: number) => void
}

declare global {
    var crossnode: {
        waitForGamePromise: Promise<void>
        options: CrossnodeOptions

        tests: CrossnodeTest[]
        registerTest: (task: CrossnodeTest) => void

        testUtil: {
            // @ts-expect-error
            loadLevel(mapName: string, marker?: ig.TeleportPosition, hint?: ig.Game.TeleportLoadHint): Promise<void>
        }
    }
}

export function startCrossnode(options: CrossnodeOptions): Promise<void>
