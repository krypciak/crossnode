export function initDeterminism(): void

declare global {
    var determinism: {
        setSeed(seed: string): void
    }
}
