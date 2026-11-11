function regularImport(url: string) {
    // console.log('regular import', url)
    return import('../../../../assets/' + url)
}

export function importModScript(url: string) {
    return regularImport(url)
}

export function importModPlugin(url: string) {
    return regularImport(url)
}
