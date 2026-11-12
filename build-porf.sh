#!/bin/sh

porf_index="/home/krypek/Programming/repos/porffor/runtime/index.js"
opt="${1-"-O3"}"
index_file="/home/krypek/Programming/crosscode/instances/cc-server/assets/mods/cc-multibakery/scripts/run.ts"
# index_file="start.ts"

node --max-old-space-size=16384 --experimental-import-text \
    "$porf_index" native \
    $opt --define:process.env.CROSSNODE_CANVAS=true \
    "$index_file" -o por.exe
