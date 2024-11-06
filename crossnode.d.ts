export type CrossnodeOptions = {
    shell?: boolean
    writeImage?: boolean
    writeImageInterval?: number
    printImageError?: boolean
    skipTitlescreen?: boolean
    autoEnterGame?: boolean

    nukeImageStack?: true
    dontLoadExtensions?: boolean
    extensionWhitelist?: string[]
} & (
    | {
          ccloader?: false
      }
    | {
          ccloader: true
          modWhitelist?: string[]
      }
) &
    (
        | {
              test?: false
          }
        | {
              test: true
              fps?: number
              skipFrameWait?: boolean
          }
    )

export interface CrossnodeTest {
    timeoutSeconds?: number
    fps?: number
    skipFrameWait?: boolean

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
    }
}

export function startCrossnode(options: CrossnodeOptions): Promise<void>
