#!/bin/node
import { startCrossnode } from './crossnode.js'
startCrossnode({ shell: true, test: true, ccloader2: true, writeImage: true, modWhitelist: [], extensionWhitelist: [], modTestWhitelist: ['crossnode'] })
