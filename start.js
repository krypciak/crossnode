#!/bin/node
import { startCrossnode } from './crossnode.js'
startCrossnode({ shell: true, test: false, ccloader2: true, modWhitelist: [], extensionWhitelist: [] })
