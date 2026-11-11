/* vibe coded */
// ig.VarCondition compiles condition strings with `new Function`, which porffor
// (and any other AOT compiler) cannot do. The game's condition grammar is tiny
// and fully known: variables (ig.vars.get), numbers, strings, true/false/null,
// !, parentheses and the usual binary operators. Parse it once and evaluate the
// AST instead.

type VarNode = { kind: 'value'; value: unknown } | { kind: 'var'; name: string } | { kind: 'unary'; op: string; arg: VarNode } | { kind: 'binary'; op: string; left: VarNode; right: VarNode }

interface VarToken {
    type: 'number' | 'string' | 'word' | 'op' | 'mod-check' | 'eof'
    value: string
    number?: number
}

const binaryPrecedence: Record<string, number> = {
    '||': 1,
    OR: 1,
    '&&': 2,
    AND: 2,
    '==': 3,
    '=': 3,
    '!=': 3,
    '<': 4,
    '<=': 4,
    '>': 4,
    '>=': 4,
    '+': 5,
    '-': 5,
    '*': 6,
    '/': 6,
    '%': 6,
}

function isDigitChar(c: string): boolean {
    return c >= '0' && c <= '9'
}

function isWordChar(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || isDigitChar(c) || c === '_' || c === '/' || c === '.' || c === '-' || c === '[' || c === ']'
}

function unescapeString(raw: string): string {
    let out = ''
    for (let i = 0; i < raw.length; i++) {
        const c = raw[i]
        if (c !== '\\' || i + 1 >= raw.length) {
            out += c
            continue
        }
        const next = raw[++i]
        if (next === 'n') out += '\n'
        else if (next === 'r') out += '\r'
        else if (next === 't') out += '\t'
        else if (next === 'b') out += '\b'
        else if (next === 'f') out += '\f'
        else if (next === 'v') out += '\v'
        else if (next === '0') out += '\0'
        else if (next === 'u' && i + 4 < raw.length) {
            out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 5), 16))
            i += 4
        } else out += next
    }
    return out
}

/**
 * Try to consume `activeMods.find(e => e.name === '<modId>')` starting at `i`.
 * Returns null if the input at `i` doesn't look like that pattern.
 *
 * Deliberately hand-written instead of using a regex so every failure point
 * is obvious to debug.
 */
function tryParseModCheck(source: string, i: number): { modId: string; end: number } | null {
    const marker = 'activeMods.find('
    if (!source.substring(i).startsWith(marker)) return null

    let j = i + marker.length
    const skipWs = () => {
        while (j < source.length && /\s/.test(source[j])) j++
    }

    skipWs()
    if (source[j] !== 'e') return null
    j++

    skipWs()
    if (source[j] !== '=' || source[j + 1] !== '>') return null
    j += 2

    skipWs()
    if (!source.substring(j).startsWith('e.name')) return null
    j += 6

    skipWs()
    if (source[j] !== '=' || source[j + 1] !== '=') return null
    j += 2
    if (source[j] === '=') j++

    skipWs()
    if (source[j] !== "'" && source[j] !== '"') return null
    const quote = source[j]
    j++

    const start = j
    while (j < source.length) {
        if (source[j] === '\\') j += 2
        else if (source[j] === quote) break
        else j++
    }
    if (j >= source.length) return null
    const modId = unescapeString(source.slice(start, j))
    j++

    skipWs()
    if (source[j] !== ')') return null
    j++

    return { modId, end: j }
}

function isModActive(modId: string): boolean {
    return !!(window as any).activeMods.find((m: any) => m.name == modId)
}

function tokenizeCondition(source: string): VarToken[] {
    const tokens: VarToken[] = []
    let i = 0
    let operand = true

    while (i < source.length) {
        const c = source[i]
        if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
            i++
            continue
        }

        if (c === '(') {
            tokens.push({ type: 'op', value: '(' })
            i++
            continue
        }
        if (c === ')') {
            tokens.push({ type: 'op', value: ')' })
            i++
            continue
        }
        if (c === '!' && source[i + 1] !== '=') {
            tokens.push({ type: 'op', value: '!' })
            i++
            continue
        }

        if (operand) {
            const number = /^-?\d+(?:\.\d+)?/.exec(source.slice(i))
            if (number) {
                tokens.push({ type: 'number', value: number[0], number: Number(number[0]) })
                i += number[0].length
                operand = false
                continue
            }

            if (c === '"' || c === "'") {
                const quote = c
                let end = i + 1
                while (end < source.length) {
                    if (source[end] === '\\') end += 2
                    else if (source[end] === quote) break
                    else end++
                }
                if (end >= source.length) throw new Error(`Unterminated string in '${source}'`)
                tokens.push({ type: 'string', value: unescapeString(source.slice(i + 1, end)) })
                i = end + 1
                operand = false
                continue
            }

            if (isWordChar(c)) {
                const mod = tryParseModCheck(source, i)
                if (mod) {
                    tokens.push({ type: 'mod-check', value: mod.modId })
                    i = mod.end
                    operand = false
                    continue
                }

                let end = i + 1
                while (end < source.length && isWordChar(source[end])) end++
                tokens.push({ type: 'word', value: source.slice(i, end) })
                i = end
                operand = false
                continue
            }

            throw new Error(`Could not parse next token of '${source.slice(i)}'`)
        }

        const two = source.slice(i, i + 2)
        if (two === '&&' || two === '||' || two === '==' || two === '!=' || two === '<=' || two === '>=') {
            tokens.push({ type: 'op', value: two })
            i += 2
            operand = true
            continue
        }
        if (c === '<' || c === '>' || c === '+' || c === '-' || c === '*' || c === '/' || c === '%' || c === '=') {
            tokens.push({ type: 'op', value: c === '=' ? '==' : c })
            i++
            operand = true
            continue
        }
        if (isWordChar(c)) {
            let end = i + 1
            while (end < source.length && isWordChar(source[end])) end++
            const word = source.slice(i, end)
            if (word !== 'AND' && word !== 'OR') throw new Error(`Unexpected token '${word}' when parsing expression`)
            tokens.push({ type: 'op', value: word })
            i = end
            operand = true
            continue
        }

        throw new Error(`Could not parse next token of '${source.slice(i)}'`)
    }

    tokens.push({ type: 'eof', value: '' })
    return tokens
}

interface ParsedCondition {
    node: VarNode
    vars: string[]
}

function parseCondition(source: string): ParsedCondition {
    const tokens = tokenizeCondition(source)
    const vars: string[] = []
    let index = 0

    const peek = (): VarToken => tokens[index]

    const parseExpression = (minPrecedence: number): VarNode => {
        let left = parseUnary()
        for (;;) {
            const token = peek()
            if (token.type !== 'op') break
            const precedence = binaryPrecedence[token.value]
            if (precedence === undefined || precedence < minPrecedence) break
            index++
            const right = parseExpression(precedence + 1)
            left = { kind: 'binary', op: token.value, left, right }
        }
        return left
    }

    const parseUnary = (): VarNode => {
        const token = tokens[index++]
        if (token.type === 'op' && token.value === '!') return { kind: 'unary', op: '!', arg: parseUnary() }
        if (token.type === 'number') return { kind: 'value', value: token.number }
        if (token.type == 'mod-check') return { kind: 'value', value: isModActive(token.value) }
        if (token.type === 'string') return { kind: 'value', value: token.value }
        if (token.type === 'word') {
            if (token.value === 'true') return { kind: 'value', value: true }
            if (token.value === 'false') return { kind: 'value', value: false }
            if (token.value === 'null') return { kind: 'value', value: null }
            vars.push(token.value)
            return { kind: 'var', name: token.value }
        }
        if (token.type === 'op' && token.value === '(') {
            const inner = parseExpression(1)
            const close = tokens[index++]
            if (close.type !== 'op' || close.value !== ')') throw new Error("Didn't close an open paranthesis! Bad!!")
            return inner
        }
        throw new Error(`Unsupported Token: '${token.value}' during terminal expression parsing`)
    }

    const node = parseExpression(1)
    // the game's parser ignores trailing tokens, so do the same
    return { node, vars }
}

function evaluateNode(node: VarNode, getVar: (path: string) => unknown): unknown {
    if (node.kind === 'value') return node.value
    if (node.kind === 'var') return getVar(node.name)
    if (node.kind === 'unary') return !evaluateNode(node.arg, getVar)

    // short-circuit before evaluating the right side
    if (node.op === '&&' || node.op === 'AND') return evaluateNode(node.left, getVar) && evaluateNode(node.right, getVar)
    if (node.op === '||' || node.op === 'OR') return evaluateNode(node.left, getVar) || evaluateNode(node.right, getVar)

    const a = evaluateNode(node.left, getVar) as any
    const b = evaluateNode(node.right, getVar) as any
    switch (node.op) {
        case '==':
            return a == b
        case '!=':
            return a != b
        case '<':
            return a < b
        case '<=':
            return a <= b
        case '>':
            return a > b
        case '>=':
            return a >= b
        case '+':
            return a + b
        case '-':
            return a - b
        case '*':
            return a * b
        case '/':
            return a / b
        case '%':
            return a % b
    }
    throw new Error(`Unsupported operator '${node.op}'`)
}

function conditionToFunction(condition: string | undefined): { source: string; vars: string[]; func: () => unknown } {
    condition = (condition ?? '').trim()
    if (!condition) condition = 'true'

    condition = condition.replace(/(?:\r\n|\r|\n)/g, '')

    let vars: string[] = []
    let func: () => unknown = () => false

    if (condition == 'false') {
    } else if (condition == 'true') {
        func = () => true
    } else {
        try {
            const parsed = parseCondition(condition)
            vars = parsed.vars
            func = () => evaluateNode(parsed.node, path => ig.vars.get(path))
        } catch (e) {
            console.error(`CONDITION PARSING ERROR: ${e}`)
        }
    }
    return { source: condition, vars, func }
}
// replace ig.VarCondition's Function-based setCondition with the interpreter
export function patchVarCondition(): void {
    const ig = (globalThis as any).ig
    if (!ig || !ig.VarCondition || !ig.VarCondition.prototype) return
    const prototype = ig.VarCondition.prototype

    prototype.setCondition = function (this: any, condition?: string): void {
        const { source, vars, func } = conditionToFunction(condition)
        this.pretty = source
        this.code = source
        this.vars = vars
        this.condition = func
    }
}
