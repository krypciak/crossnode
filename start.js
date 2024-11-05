#!/bin/node
import { startCrossnode } from './crossnode.js'
startCrossnode({ shell: true, nukeImageStack: true, ccloader2: true })
