#!/bin/node
import { startCrossnode } from './crossnode.js'
startCrossnode({ shell: true, ccloader2: true, nukeImageStack: true, printImageError: true, modWhitelist: [], extensionWhitelist: [] })
