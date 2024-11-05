export interface CrossnodeOptions {
    shell?: boolean
    writeImage?: boolean
    writeImageInterval?: number
    printImageError?: boolean
    skipTitlescreen?: boolean
    autoEnterGame?: boolean

    ccloader2?: boolean

    nukeImageStack?: true
    dontLoadExtensions?: boolean
    extensionWhitelist?: string[]
}
export function startCrossnode(options: CrossnodeOptions): Promise<void>
