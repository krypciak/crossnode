#!/usr/bin/env bun
import { $ } from 'bun'

const jsRaw = '../../js/game.compiled.js'

async function exists(flag: '-d' | '-f', path: string): Promise<boolean> {
    const result = await $`test ${flag} ${path}`.nothrow().quiet()
    return result.exitCode === 0
}

if (!(await exists('-d', '../../mods'))) {
    console.error('Ensure that ../../mods exists')
    process.exit(1)
}

if (!(await exists('-f', jsRaw))) {
    console.error(`Ensure that ${jsRaw} exists.`)
    process.exit(2)
}

if (!(await exists('-d', '../../../ccloader/'))) {
    console.error('CCLoader2 must be installed.')
    process.exit(3)
}

console.log('✓ installed correctly')
