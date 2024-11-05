export interface CrossnodeOptions {
    shell?: boolean
    writeImage?: boolean
    writeImageInterval?: number
    printImageError?: boolean
    skipTitlescreen?: boolean
    autoEnterGame?: boolean

    ccloader2?: boolean

    nukeImageStack?: true
}
export function startCrossnode(options: CrossnodeOptions): Promise<void>
