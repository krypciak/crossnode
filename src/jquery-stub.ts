/* vibecoded */
/**
 * Minimal jQuery-compatible shim used by CrossNode.
 *
 * This only implements the small subset of jQuery that CrossNode and the
 * CrossCode bundle actually touch:
 *
 *  - `$(selector)` / `$(element)` / `$(window)` / `$(document)`
 *  - DOM collection helpers (`find`, `val`, `text`, `append`, `css`, ...)
 *  - `$.ajax` / `$.ajaxSetup`
 *
 * It is intentionally not a general purpose jQuery replacement.
 */

export interface JQueryAjaxSettingsLike {
    url?: string
    type?: string
    method?: string
    dataType?: string
    data?: unknown
    async?: boolean
    context?: unknown
    contentType?: string | false
    processData?: boolean
    beforeSend?: (xhr: unknown, settings: JQueryAjaxSettingsLike) => unknown
    success?: (...args: unknown[]) => void
    error?: (...args: unknown[]) => void
    complete?: (...args: unknown[]) => void
    [key: string]: unknown
}

export interface JQueryCollectionLike {
    [index: number]: unknown
    length: number
    toArray(): unknown[]
}

export type JQueryStaticLike = ((selector?: unknown, context?: unknown) => JQueryCollectionLike) & {
    fn: unknown
    ajax: (settings?: JQueryAjaxSettingsLike) => unknown
    ajaxSetup: (settings?: JQueryAjaxSettingsLike) => JQueryAjaxSettingsLike
    [key: string]: unknown
}

function isNode(value: unknown): value is Node {
    return !!value && typeof (value as Node).nodeType === 'number'
}

function isElement(value: unknown): value is Element {
    return isNode(value) && value.nodeType === 1
}

function isDocument(value: unknown): value is Document {
    return isNode(value) && value.nodeType === 9
}

function isWindow(value: unknown, win: Window): value is Window {
    return value === win || (!!value && (value as Window).window === value)
}

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
    return typeof value === 'function'
}

const UNITLESS_CSS = {
    animationIterationCount: true,
    columnCount: true,
    fillOpacity: true,
    flex: true,
    flexGrow: true,
    flexShrink: true,
    fontWeight: true,
    gridArea: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnStart: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowStart: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    strokeOpacity: true,
    widows: true,
    zIndex: true,
    zoom: true,
} as const

function formatCssValue(name: string, value: unknown): string {
    if (typeof value === 'number' && !(UNITLESS_CSS as Record<string, unknown>)[name]) {
        return value + 'px'
    }
    if (value == null) return ''
    return String(value)
}

function serializeData(data: unknown): string {
    if (typeof data === 'string') return data
    if (data == null) return ''

    const parts: string[] = []
    const appendValue = (key: string, value: unknown) => {
        if (value == null) return
        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) appendValue(key, value[i])
            return
        }
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
    }

    for (const key in data as Record<string, unknown>) {
        appendValue(key, (data as Record<string, unknown>)[key])
    }
    return parts.join('&')
}

function uniquePush(list: unknown[], value: unknown) {
    if (value != null && list.indexOf(value) < 0) list.push(value)
}

export function createJQuery(win: Window): JQueryStaticLike {
    const doc = win.document

    function parseHTML(html: string): Node[] {
        const template = doc.createElement('template')
        template.innerHTML = html
        const nodes: Node[] = []
        const source = template.content ? template.content.childNodes : template.childNodes
        for (let i = 0; i < source.length; i++) nodes.push(source[i])
        return nodes
    }

    function toNodes(value: unknown): Node[] {
        if (value == null) return []
        if (value instanceof JQueryCollection) return value.toArray() as Node[]
        if (isNode(value)) return [value]
        if (typeof value === 'string') return parseHTML(value)
        if (Array.isArray(value)) {
            const result: Node[] = []
            for (let i = 0; i < value.length; i++) result.push(...toNodes(value[i]))
            return result
        }
        if (typeof (value as ArrayLike<unknown>).length === 'number') {
            const result: Node[] = []
            const arrayLike = value as ArrayLike<unknown>
            for (let i = 0; i < arrayLike.length; i++) result.push(...toNodes(arrayLike[i]))
            return result
        }
        return []
    }

    function toArray(selector: unknown, context?: unknown): unknown[] {
        if (selector == null) return []

        if (isWindow(selector, win)) return [selector]
        if (isNode(selector)) return [selector]

        if (selector instanceof JQueryCollection) return selector.toArray()

        if (isFunction(selector)) {
            // $(fn) is document ready
            if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
                win.setTimeout(selector as () => void, 0)
            } else {
                doc.addEventListener('DOMContentLoaded', selector as EventListener, { once: true } as AddEventListenerOptions)
            }
            return []
        }

        if (typeof selector === 'string') {
            const text = selector.trim()
            if (text.length === 0) return []
            if (text.charAt(0) === '<') return parseHTML(text)

            let root: ParentNode = doc
            if (context) {
                const contextArray = toArray(context)
                if (contextArray.length > 0) root = contextArray[0] as ParentNode
            }
            if (!root || !isFunction((root as ParentNode).querySelectorAll)) return []
            const found = (root as ParentNode).querySelectorAll(text)
            const result: unknown[] = []
            for (let i = 0; i < found.length; i++) result.push(found[i])
            return result
        }

        if (typeof (selector as ArrayLike<unknown>).length === 'number') {
            const result: unknown[] = []
            const arrayLike = selector as ArrayLike<unknown>
            for (let i = 0; i < arrayLike.length; i++) result.push(arrayLike[i])
            return result
        }

        return []
    }

    class JQueryCollection {
        [index: number]: unknown
        length: number

        constructor(items: unknown[] = []) {
            this.length = items.length
            for (let i = 0; i < items.length; i++) this[i] = items[i]
        }

        toArray(): unknown[] {
            const result: unknown[] = []
            for (let i = 0; i < this.length; i++) result.push(this[i])
            return result
        }

        get(index?: number): unknown {
            if (index == null) return this.toArray()
            if (index < 0) return this[this.length + index]
            return this[index]
        }

        eq(index: number): JQueryCollection {
            const value = this.get(index)
            return new JQueryCollection(value == null ? [] : [value])
        }

        first(): JQueryCollection {
            return this.eq(0)
        }

        last(): JQueryCollection {
            return this.eq(this.length - 1)
        }

        each(callback: (this: unknown, index: number, element: unknown) => unknown): this {
            for (let i = 0; i < this.length; i++) {
                if (callback.call(this[i], i, this[i]) === false) break
            }
            return this
        }

        find(selector: string): JQueryCollection {
            const result: unknown[] = []
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as ParentNode
                if (!element || !isFunction(element.querySelectorAll)) continue
                const found = element.querySelectorAll(selector)
                for (let j = 0; j < found.length; j++) uniquePush(result, found[j])
            }
            return new JQueryCollection(result)
        }

        children(selector?: string): JQueryCollection {
            const result: unknown[] = []
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (!isElement(element)) continue
                for (let j = 0; j < element.children.length; j++) {
                    const child = element.children[j]
                    if (!selector || (isElement(child) && child.matches(selector))) uniquePush(result, child)
                }
            }
            return new JQueryCollection(result)
        }

        parent(): JQueryCollection {
            const result: unknown[] = []
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (isElement(element) && element.parentElement) uniquePush(result, element.parentElement)
            }
            return new JQueryCollection(result)
        }

        closest(selector: string): JQueryCollection {
            const result: unknown[] = []
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (isElement(element)) uniquePush(result, element.closest(selector))
            }
            return new JQueryCollection(result)
        }

        is(selector: string): boolean {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (isElement(element) && element.matches(selector)) return true
            }
            return false
        }

        index(): number {
            const element = this[0] as Element
            if (!isElement(element) || !element.parentElement) return -1
            const siblings = element.parentElement.children
            for (let i = 0; i < siblings.length; i++) {
                if (siblings[i] === element) return i
            }
            return -1
        }

        addClass(names: string): this {
            const list = String(names).split(/\s+/)
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (!isElement(element) || !element.classList) continue
                for (let j = 0; j < list.length; j++) {
                    if (list[j]) element.classList.add(list[j])
                }
            }
            return this
        }

        removeClass(names?: string): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (!isElement(element) || !element.classList) continue
                if (names == null) {
                    element.className = ''
                    continue
                }
                const list = String(names).split(/\s+/)
                for (let j = 0; j < list.length; j++) {
                    if (list[j]) element.classList.remove(list[j])
                }
            }
            return this
        }

        hasClass(name: string): boolean {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (isElement(element) && element.classList && element.classList.contains(name)) return true
            }
            return false
        }

        toggleClass(name: string, state?: boolean): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (!isElement(element) || !element.classList) continue
                if (state === true) element.classList.add(name)
                else if (state === false) element.classList.remove(name)
                else element.classList.toggle(name)
            }
            return this
        }

        attr(name: string, value?: unknown): unknown {
            if (value === undefined) {
                const element = this[0] as Element
                return isElement(element) ? element.getAttribute(name) : undefined
            }
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (!isElement(element)) continue
                if (value === null) element.removeAttribute(name)
                else element.setAttribute(name, String(value))
            }
            return this
        }

        removeAttr(name: string): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (isElement(element)) element.removeAttribute(name)
            }
            return this
        }

        prop(name: string, value?: unknown): unknown {
            if (value === undefined) {
                const element = this[0] as Record<string, unknown>
                return element ? element[name] : undefined
            }
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Record<string, unknown>
                if (element) element[name] = value
            }
            return this
        }

        data(name: string, value?: unknown): unknown {
            if (value === undefined) {
                const element = this[0] as any
                if (!element) return undefined
                const store = element.__jqData || (element.__jqData = {})
                return store[name]
            }
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as any
                if (!element) continue
                const store = element.__jqData || (element.__jqData = {})
                store[name] = value
            }
            return this
        }

        css(name: string | Record<string, unknown>, value?: unknown): unknown {
            if (typeof name === 'object') {
                for (const key in name) this.css(key, name[key])
                return this
            }

            if (value === undefined) {
                const element = this[0] as any
                if (!element) return undefined
                if (isWindow(element, win) || isDocument(element)) return undefined
                if (element.style && isFunction(element.style.getPropertyValue)) {
                    const inlineValue = element.style.getPropertyValue(name)
                    if (inlineValue) return inlineValue
                }
                const computed = win.getComputedStyle ? win.getComputedStyle(element) : undefined
                return computed ? computed.getPropertyValue(name) : undefined
            }

            const cssValue = formatCssValue(name, value)
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as any
                if (!element || !element.style) continue
                if (isFunction(element.style.setProperty)) element.style.setProperty(name, cssValue)
                else element.style[name] = cssValue
            }
            return this
        }

        width(value?: unknown): unknown {
            return this._dimension('width', value)
        }

        height(value?: unknown): unknown {
            return this._dimension('height', value)
        }

        _dimension(name: 'width' | 'height', value?: unknown): unknown {
            if (value !== undefined) return this.css(name, value)

            const element = this[0] as any
            if (!element) return undefined

            if (isWindow(element, win) || isDocument(element)) {
                const root = doc.documentElement as any
                if (!root) return 0
                return name === 'width' ? root.clientWidth : root.clientHeight
            }

            if (isFunction(element.getBoundingClientRect)) {
                return element.getBoundingClientRect()[name]
            }

            return name === 'width' ? element.clientWidth || element.offsetWidth : element.clientHeight || element.offsetHeight
        }

        text(value?: unknown): unknown {
            if (value === undefined) {
                let result = ''
                for (let i = 0; i < this.length; i++) {
                    const element = this[i] as Node
                    if (element && element.textContent != null) result += element.textContent
                }
                return result
            }
            const text = value == null ? '' : String(value)
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Node
                if (element) element.textContent = text
            }
            return this
        }

        val(value?: unknown): unknown {
            if (value === undefined) {
                const element = this[0] as any
                return element ? element.value : undefined
            }
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as any
                if (element) element.value = value == null ? '' : value
            }
            return this
        }

        html(value?: unknown): unknown {
            if (value === undefined) {
                const element = this[0] as Element
                return isElement(element) ? element.innerHTML : undefined
            }
            const html = value == null ? '' : String(value)
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (isElement(element)) element.innerHTML = html
            }
            return this
        }

        append(value: unknown): this {
            return this._insert(value, 'append')
        }

        prepend(value: unknown): this {
            return this._insert(value, 'prepend')
        }

        before(value: unknown): this {
            return this._insert(value, 'before')
        }

        after(value: unknown): this {
            return this._insert(value, 'after')
        }

        _insert(value: unknown, position: 'append' | 'prepend' | 'before' | 'after'): this {
            const nodes = toNodes(value)
            if (nodes.length === 0) return this

            for (let i = 0; i < this.length; i++) {
                const target = this[i] as Node
                if (!target) continue

                // Clone when the same nodes are inserted into more than one target.
                const lastTarget = i === this.length - 1
                const toInsert: Node[] = []
                for (let j = 0; j < nodes.length; j++) {
                    toInsert.push(lastTarget ? nodes[j] : nodes[j].cloneNode(true))
                }

                if (position === 'append') {
                    for (let j = 0; j < toInsert.length; j++) target.appendChild(toInsert[j])
                } else if (position === 'prepend') {
                    for (let j = toInsert.length - 1; j >= 0; j--) target.insertBefore(toInsert[j], target.firstChild)
                } else {
                    const parent = (target as Element).parentNode
                    if (!parent) continue
                    if (position === 'before') {
                        for (let j = 0; j < toInsert.length; j++) parent.insertBefore(toInsert[j], target)
                    } else {
                        const reference = target.nextSibling
                        for (let j = 0; j < toInsert.length; j++) parent.insertBefore(toInsert[j], reference)
                    }
                }
            }
            return this
        }

        empty(): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Node
                if (!element) continue
                while (element.firstChild) element.removeChild(element.firstChild)
            }
            return this
        }

        remove(): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as Element
                if (isElement(element) && element.parentNode) element.parentNode.removeChild(element)
            }
            return this
        }

        hide(): this {
            for (let i = 0; i < this.length; i++) {
                const element: any = this[i]
                if (!element || element.nodeType !== 1 || !element.style) continue
                if (element.style.display !== 'none') element.__jqOldDisplay = element.style.display
                element.style.display = 'none'
            }
            return this
        }

        show(): this {
            for (let i = 0; i < this.length; i++) {
                const element: any = this[i]
                if (!element || element.nodeType !== 1 || !element.style) continue
                element.style.display = element.__jqOldDisplay || ''
            }
            return this
        }

        toggle(state?: boolean): this {
            const show = state === undefined ? this.length > 0 && (this[0] as any).style?.display === 'none' : state
            return show ? this.show() : this.hide()
        }

        animate(props: Record<string, unknown>, duration?: unknown, easing?: unknown, complete?: unknown): this {
            if (isFunction(duration)) {
                complete = duration
            } else if (isFunction(easing)) {
                complete = easing
            }

            if (this.length > 0) {
                this.css(props)
                if (isFunction(complete)) {
                    const callback = complete
                    const element = this[0]
                    win.setTimeout(() => callback.call(element), 0)
                }
            }
            return this
        }

        focus(): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as HTMLElement
                if (element && isFunction(element.focus)) element.focus()
            }
            return this
        }

        blur(): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as HTMLElement
                if (element && isFunction(element.blur)) element.blur()
            }
            return this
        }

        select(): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as HTMLInputElement
                if (element && isFunction(element.focus)) element.focus()
                if (element && isFunction(element.select)) element.select()
            }
            return this
        }

        on(types: string, handler: EventListener): this {
            if (!isFunction(handler)) return this
            const list = String(types).split(/\s+/)
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as any
                if (!element || !isFunction(element.addEventListener)) continue
                for (let j = 0; j < list.length; j++) {
                    if (list[j]) element.addEventListener(list[j], handler)
                }
            }
            return this
        }

        off(types: string, handler: EventListener): this {
            const list = String(types).split(/\s+/)
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as any
                if (!element || !isFunction(element.removeEventListener)) continue
                for (let j = 0; j < list.length; j++) {
                    if (list[j]) element.removeEventListener(list[j], handler)
                }
            }
            return this
        }

        trigger(type: string): this {
            for (let i = 0; i < this.length; i++) {
                const element = this[i] as any
                if (element && isFunction(element.dispatchEvent)) element.dispatchEvent(new (win as any).Event(type))
            }
            return this
        }
    }

    const jq: any = function (selector?: unknown, context?: unknown): JQueryCollection {
        return new JQueryCollection(toArray(selector, context))
    }

    // Make collections created by this function pass `instanceof jQuery`.
    jq.prototype = JQueryCollection.prototype
    jq.fn = JQueryCollection.prototype
    jq.fn.jquery = '3.7.1-crossnode-stub'

    const ajaxDefaults: JQueryAjaxSettingsLike = {}

    jq.ajaxSetup = function (settings?: JQueryAjaxSettingsLike): JQueryAjaxSettingsLike {
        if (settings) {
            for (const key in settings) ajaxDefaults[key] = settings[key]
        }
        const result: JQueryAjaxSettingsLike = {}
        for (const key in ajaxDefaults) result[key] = ajaxDefaults[key]
        return result
    }

    jq.ajax = function (options?: JQueryAjaxSettingsLike): unknown {
        const settings: JQueryAjaxSettingsLike = {}
        for (const key in ajaxDefaults) settings[key] = ajaxDefaults[key]
        if (options) {
            for (const key in options) settings[key] = options[key]
        }

        const method = String(settings.method || settings.type || 'GET').toUpperCase()
        settings.type = method
        settings.url = settings.url == null ? '' : String(settings.url)
        settings.async = settings.async !== false
        settings.dataType = settings.dataType == null ? undefined : String(settings.dataType).toLowerCase()

        const context = settings.context || settings
        const xhr: any = new (win as any).XMLHttpRequest()
        let finished = false

        const finish = (status: string) => {
            if (finished) return
            finished = true
            if (isFunction(settings.complete)) settings.complete.call(context, xhr, status)
        }

        const success = (data: unknown, textStatus: string) => {
            if (finished) return
            if (isFunction(settings.success)) settings.success.call(context, data, textStatus, xhr)
            finish(textStatus)
        }

        const fail = (textStatus: string, errorThrown?: unknown) => {
            if (finished) return
            if (isFunction(settings.error)) settings.error.call(context, xhr, textStatus, errorThrown)
            finish(textStatus)
        }

        xhr.onload = () => {
            const status = xhr.status
            const isSuccess = (status >= 200 && status < 300) || status === 304 || status === 0
            if (!isSuccess) {
                fail('error')
                return
            }

            let data: unknown = xhr.responseText
            if (settings.dataType === 'json') {
                if (typeof data === 'string' && data.length > 0) {
                    try {
                        data = JSON.parse(data)
                    } catch (error) {
                        fail('parsererror', error)
                        return
                    }
                } else {
                    data = null
                }
            }

            success(data, 'success')
        }
        xhr.onerror = () => fail('error')
        xhr.onabort = () => fail('abort')
        xhr.ontimeout = () => fail('timeout')

        /*
         * jQuery calls beforeSend synchronously and does not await a returned
         * promise.  Simplify relies on this: its beforeSend is async and waits
         * for the *actual* request to complete before patching the response.
         * Awaiting it here would deadlock.
         */
        if (isFunction(settings.beforeSend)) {
            let result: unknown
            try {
                result = settings.beforeSend.call(context, xhr, settings)
            } catch (error) {
                fail('error', error)
                return xhr
            }
            if (result === false) {
                try {
                    if (isFunction(xhr.abort)) xhr.abort()
                } catch {
                    // Ignore abort errors; the request was never opened.
                }
                return xhr
            }
        }

        let body: unknown = settings.data == null ? null : settings.data
        let contentType = settings.contentType

        if (body != null && typeof body === 'object' && settings.processData !== false && typeof (body as BodyInit).toString === 'function' && !(body as any).nodeType) {
            body = serializeData(body)
            if (contentType == null) contentType = 'application/x-www-form-urlencoded; charset=UTF-8'
        }

        try {
            xhr.open(method, settings.url, settings.async)
            if (contentType && method !== 'GET' && method !== 'HEAD') {
                xhr.setRequestHeader('Content-Type', String(contentType))
            }
            xhr.send(method === 'GET' || method === 'HEAD' ? null : body)
        } catch (error) {
            fail('error', error)
        }

        return xhr
    }

    jq.extend = function (...args: any[]): any {
        let target = args[0]
        let start = 1
        if (typeof target !== 'object' || target == null) {
            target = {}
            start = 0
        }
        for (let i = start; i < args.length; i++) {
            const source = args[i]
            if (!source) continue
            for (const key in source) target[key] = source[key]
        }
        return target
    }

    jq.each = function (collection: any, callback: (index: number | string, value: any) => unknown): any {
        if (collection == null) return collection
        if (typeof collection.length === 'number') {
            for (let i = 0; i < collection.length; i++) {
                if (callback.call(collection[i], i, collection[i]) === false) break
            }
        } else {
            for (const key in collection) {
                if (callback.call(collection[key], key, collection[key]) === false) break
            }
        }
        return collection
    }

    jq.isArray = Array.isArray
    jq.isFunction = isFunction
    jq.isNumeric = (value: unknown) => !Array.isArray(value) && value != null && !isNaN((value as number) - parseFloat(String(value)))
    jq.trim = (value: unknown) => String(value == null ? '' : value).trim()
    jq.noop = () => {}

    return jq as JQueryStaticLike
}
