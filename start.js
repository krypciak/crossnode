#!/bin/node
import { startCrossnode } from './crossnode.js'
startCrossnode({
    shell: true,
    ccloader2: true,
    printImageError: true,
    modWhitelist: [
        'ccmodmanager',

        'cc-alybox',
        'cc-variable-charge-time',

        'xenons-playable-classes',
        'menu-ui-replacer',
        'extension-asset-preloader',
        'extendable-severed-heads',

        'input-api',
    ],
    extensionWhitelist: ['post-game'],
})
