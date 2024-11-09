const { options, waitForGamePromise } = window.crossnode

function initColors() {
    function stringify(colorStyle, func) {
        return Object.defineProperty(String.prototype, colorStyle, {
            get: func,
            configurable: true,
        })
    }

    const styles = {
        black: { open: '\u001b[30m', close: '\u001b[39m' },
        blue: { open: '\u001b[34m', close: '\u001b[39m' },
        bold: { open: '\u001b[1m', close: '\u001b[22m' },
        cyan: { open: '\u001b[36m', close: '\u001b[39m' },
        dim: { open: '\u001b[2m', close: '\u001b[22m' },
        gray: { open: '\u001b[90m', close: '\u001b[39m' },
        green: { open: '\u001b[32m', close: '\u001b[39m' },
        grey: { open: '\u001b[90m', close: '\u001b[39m' },
        red: { open: '\u001b[31m', close: '\u001b[39m' },
        reset: { open: '\u001b[0m', close: '\u001b[0m' },
        strikethrough: { open: '\u001b[9m', close: '\u001b[29m' },
        underline: { open: '\u001b[4m', close: '\u001b[24m' },
        white: { open: '\u001b[37m', close: '\u001b[39m' },
    }
    Object.keys(styles).forEach(styleName => {
        stringify(styleName, function () {
            return color(this, styleName).toString()
        })
    })
    function color(str, styleName) {
        const code = styles[styleName]
        return code.open + str.replace(code.closeRe, code.open) + code.close
    }
}
initColors()

let tests
export function initTestApi() {
    tests = window.crossnode.tests = []
    window.crossnode.registerTest = function (test) {
        tests.push(test)
    }

    waitForGamePromise.then(() => {
        setTimeout(() => {
            initTestRunner()
        }, 100)
    })
}

let testId = -1
let testFinished
let testFrameLimit
let testFrame
const notPassed = []

function initTestRunner() {
    console.log(`===== ${'Crossnode tests'.blue.bold} =====`)
    if (options.skipFrameWait) {
        ig.Timer.step = function () {
            const t = ig.Timer._last + 1000 / ig.system.fps
            ig.Timer.time = ig.Timer.time + Math.min((t - ig.Timer._last) / 1e3, ig.Timer.maxStep) * ig.Timer.timeScale
            ig.Timer._last = t
        }
    }

    let waitForGameResolve
    ig.Loader.inject({
        finalize() {
            let end = ig.resources.length > 0
            this.parent()
            if (end && ig.ready && waitForGameResolve) {
                waitForGameResolve()
            }
        },
    })
    window.crossnode.testUtil = {
        async loadLevel(levelName, marker, hint) {
            await new Promise(res => {
                const backup = $.ajax
                $.ajax = function (opts) {
                    opts.success = data => {
                        ig.game.teleporting.levelData = data
                        res()
                    }
                    backup(opts)
                }
                ig.game.teleport(levelName, marker, hint)
                $.ajax = backup
            })

            const promise2 = new Promise(res => (waitForGameResolve = res))

            ig.game.loadLevel(ig.game.teleporting.levelData, ig.game.teleporting.clearCache, ig.game.teleporting.reloadCache)
            ig.game.teleporting.levelData = null
            ig.game.teleporting.clearCache = false
            ig.game.teleporting.timer = 0
            ig.game.onTeleportEnd()

            await promise2
        },
    }

    ig.system.stopRunLoop()
    tests.sort((a, b) => a.name.localeCompare(b.name))

    testId = -1
    nextTest()
}

async function nextTest() {
    testId++
    testFinished = false

    const test = tests[testId]
    if (!test) return allTestsDone()

    await test.setup(testDone)
    if (window.determinism && test.seed) {
        window.determinism.setSeed(test.seed)
    }

    const fps = test.fps ?? options.fps ?? 60
    testFrameLimit = (test.timeoutSeconds ?? 5) * fps
    ig.system.fps = fps

    ig.system.running = true
    testFrame = 0
    if (test.skipFrameWait ?? options.skipFrameWait) {
        while (!testFinished) {
            testRunnerUpdate()
        }
    } else {
        ig.system.intervalId = setInterval(() => {
            testRunnerUpdate()
        }, 1e3 / fps)
    }
}

function printTest(test, success, msg, timeout) {
    if (timeout) {
        console.log(`${'x'.red.bold} test ${test.name.white.bold} timeout (${test.timeoutSeconds}s)`)
        success = false
    } else {
        if (success) {
            console.log(`${'√'.green.bold} test ${test.name.white.bold}`)
        } else {
            console.log(`${'x'.red.bold} test ${test.name.white.bold} failed${msg ? `: ${msg}` : ''}`)
        }
    }
}
function testDone(success, msg, timeout) {
    const test = tests[testId]
    printTest(test, success, msg, timeout)

    if (!success) {
        notPassed.push([test, success, msg, timeout])
    }
    testFinished = true
    ig.system.stopRunLoop()

    nextTest()
}

function testRunnerUpdate() {
    const test = tests[testId]
    test.update(testFrame)
    ig.system.run()
    testFrame++

    if (testFrame >= testFrameLimit) {
        testDone(false, '', true)
    }
}

function allTestsDone() {
    console.log()
    console.log(`===== ${'All tests done'.blue.bold} ======`)
    console.log()
    const len = tests.length
    for (const args of notPassed) {
        printTest(...args)
    }
    console.log()
    console.log(`Passed: ${(len - notPassed.length).toString().white.bold}/${len.toString().white.bold}`)
    process.exit()
}
