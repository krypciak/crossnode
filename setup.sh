#!/bin/sh

set -e

JS_RAW="../../js/game.compiled.js"
JS_MODI="../../js/game.compiled.crossnode.js"

if [ ! -d "../../mods" ]; then
    echo "Ensure that ../../mods exists"
    exit 1
fi

if [ ! -f "$JS_RAW" ]; then
    echo "Ensure that ../../js/game.compiled.js exists."
    exit 2
fi

if [ ! -d "../../../ccloader/" ] && [ ! -d "../../../ccloader3" ]; then
    echo "CCLoader2 or CCLoader3 must be installed."
    exit 3
fi

cp "$JS_RAW" "$JS_MODI"
npx prettier --tab-width 4 --no-semi --print-width 200 --bracket-same-line -w "$JS_MODI"
