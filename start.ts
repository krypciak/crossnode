#!/bin/node
import { startCrossnode } from './src/crossnode'

startCrossnode({
    shell: true,
    ccloader2: true,
    printImageError: true,
    modWhitelist: [
        'ccmodmanager',

        'cc-instanceinator',

        // 'cc-alybox',
        // 'cc-variable-charge-time',
        //
        // 'xenons-playable-classes',
        // 'menu-ui-replacer',
        // 'extension-asset-preloader',
        // 'extendable-severed-heads',
        //
        // 'input-api',
    ],
    extensionWhitelist: ['post-game'],
    writeImage: true,
    skipTitlescreen: true,
    patchVarCondition: true,
    debugLogs: true
})
