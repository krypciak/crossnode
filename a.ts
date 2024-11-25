import type { CrossnodeTest, CrossnodeTestRuntime } from './crossnode.d.ts'

const test1 = crossnode.registerTest<{
    das: number
}>({
    name: 'swap update master + 5 children',
    modId: '',
    async setup() {},
    fps: 1,
    das: 1,
    update(_frame, kras) {
        this.das
    },
})
test1.das
