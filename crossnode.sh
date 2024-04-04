#!/bin/sh
npm install
cp ./game.compiled.js ./game.compiled.tmp.js
prettier --tab-width 4 --no-semi --print-width 200 --bracket-same-line -w ./game.compiled.tmp.js
cp ./game.compiled.tmp.js ./game.compiled.node.js
patch ./game.compiled.node.js < ./crossnode.diff
rm ./game.compiled.tmp.js
