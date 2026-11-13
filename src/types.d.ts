export interface CrossnodeOptions {
    shell?: boolean
    writeImage?: boolean
    writeImageInterval?: number
    writeImageInstanceinator?: boolean
    printImageError?: boolean
    skipTitlescreen?: boolean
    autoEnterGame?: boolean
    quiet?: boolean

    nukeImageStack?: boolean
    extensionWhitelist?: string[]

    ccloader2?: boolean
    modWhitelist?: string[]

    patchVarCondition?: boolean

    fps?: number
    skipFrameWait?: boolean

    debugLogs?: boolean

    preload?: () => void
    postload?: () => void
    prestart?: () => void
    poststart?: () => void
}

declare global {
    var crossnode: {
        waitForGamePromise: Promise<void>
        options: CrossnodeOptions
    }
}
