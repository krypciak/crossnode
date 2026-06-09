#!/bin/node
import { startCrossnode } from './crossnode.js'
startCrossnode({ shell: true, ccloader2: true, printImageError: true, modWhitelist: [], extensionWhitelist: [] })
