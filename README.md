# crossnode

Run CrossCode headless through node!

## Setup

NOTE: `.ccmod` are not supported! Please unpack them first.

```bash
CROSSCODE_DIR="/path/to/crosscode/root"
cd $CROSSCODE_DIR
cd assets/mods
git clone https://github.com/krypciak/crossnode
cd crossnode
pnpm install
bun ./setup.ts # this will ensure your setup is mostly correct
pnpm start
```

You can adjust crossnode settings in `start.js`.  
For the entire options list see [crossnode.d.ts](./crossnode.d.ts).  
For example usage see [cc-multibakery](https://github.com/krypciak/cc-multibakery) crossnode scripts:

- [server start script](https://github.com/krypciak/cc-multibakery/blob/main/scripts/server.js)

## Canvas backends

By default CrossNode renders with the native [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) (Skia) backend.  
That backend uses a native addon, so it cannot be used in a Porffor-compiled binary.

For Porffor builds, a pure-JavaScript backend based on [`pureimage`](https://github.com/joshmarinacci/node-pureimage) is available.  
Select it at runtime:

```bash
CROSSNODE_CANVAS=pureimage ./por.exe
```

`CROSSNODE_CANVAS=pure` and `CROSSNODE_CANVAS=1` are accepted as aliases.  
The variable is read when the binary starts, not when it is compiled.

Known limitations compared to Skia:

- `globalCompositeOperation` is not implemented (assignments are ignored).
- `createPattern()` is not implemented.
- WebP is not supported; PNG and JPEG are used instead.
- Rasterization and text metrics can differ from Skia, and per-pixel drawing is slower.

Bun/Node users should keep the default native backend for pixel-accurate output.

## Networking under Porffor

Porffor's `https` server uses uWebSockets' TLS support, which cannot hand the
decrypted socket to the `ws` library. A `wss://` server therefore accepts the
TCP connection but never completes the WebSocket handshake (`porf_uws_detach()`
returns `-1` for TLS).

Porffor builds always serve plain `http://`, and clients probe both schemes in
`getServerDetails`. Keep that in mind when connecting a client to a Porffor
server: it announces and serves plain HTTP even if the settings request TLS.

## DOM and canvas

CrossCode expects a browser environment (`window`, `document`, `XMLHttpRequest`, ...).
That environment comes from [`pocketdom`](https://github.com/krypciak/pocketdom), a small
hand written DOM + canvas + `XMLHttpRequest` implementation for non-browser runtimes.

[`src/dom.ts`](./src/dom.ts) is the only glue: it installs the canvas backend, points
`XMLHttpRequest` at `fs`, builds the initial document (`#overlay`, `#status`, `#ui`,
`#game > #canvas`) and exposes the DOM classes as globals.
