import * as fs from 'fs'

export async function fileExists(path: string) {
    return fs.promises
        .access(path)
        .then(() => true)
        .catch(() => false)
}

export function isPorffor() {
    return navigator.userAgent.startsWith('Porffor')
}
