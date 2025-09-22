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
sh ./setup.sh # this will ensure your setup is mostly correct
pnpm start
```
You can adjust crossnode settings in `start.js`.  
For the entire options list see [crossnode.d.ts](./crossnode.d.ts).  
For example usage see [cc-multibakery](https://github.com/krypciak/cc-multibakery) crossnode scripts:  
- [server start script](https://github.com/krypciak/cc-multibakery/blob/main/scripts/server.js)
- [server test script](https://github.com/krypciak/cc-multibakery/blob/main/scripts/test.js)

For example tests see this [cc-multibakery AoC 2024 day 15](https://github.com/krypciak/cc-multibakery/blob/main/src/server/test/aoc2024d15.ts#L291).  
Showcase of a bigger version of this map here is [available on youtube](https://youtube.com/watch?v=-6oM-lSYbJY)  
