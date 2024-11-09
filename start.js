#!/bin/node
import { startCrossnode } from './crossnode.js'
startCrossnode({ shell: true, writeImage: true, test: true, determinism: true, ccloader2: true, modWhitelist: [], extensionWhitelist: [] })
