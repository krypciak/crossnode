#!/bin/sh

set -e

JS_RAW="../../js/game.compiled.js"

if [ ! -d "../../mods" ]; then
    echo "Ensure that ../../mods exists"
    exit 1
fi

if [ ! -f "$JS_RAW" ]; then
    echo "Ensure that ../../js/game.compiled.js exists."
    exit 2
fi

if [ ! -d "../../../ccloader/" ]; then
    echo "CCLoader2 must be installed."
    exit 3
fi

echo "installed correctly"
