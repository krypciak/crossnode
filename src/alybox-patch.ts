import type { ApplierState } from 'ultimate-crosscode-typedefs/patch-steps-lib'
import { conditionToFunction, isModActive } from './var-condition'

async function fixedFunc(state: ApplierState, args: Record<string, string>) {
    const sm = state.stepMachine
    const memory = state.memory
    if (!args['label']) {
        args['label'] = 'IF_' + Math.round(Math.random() * 1e6)
        sm.getCurrentStep()['label'] = args['label']
    }

    const ifLabel = args['label']
    let ifIndex = sm.findLabelIndex(args['label'])
    if (ifIndex == -1) {
        const newSteps: any[] = []
        newSteps.push({ type: 'EXIT_SM' })

        newSteps.push({ type: 'LABEL', name: ifLabel })

        for (const step of args['thenSteps'] || []) {
            newSteps.push(step)
        }

        newSteps.push({ type: 'RETURN' })
        sm.addSteps(newSteps)
        ifIndex = sm.findLabelIndex(args['label'])
    }

    /* changes start here */
    const { func } = conditionToFunction(args.cond)
    const condResult = func()

    // const condResult = new Function(` return ${args.cond}`)()
    if (condResult) {
        memory.callstack = memory.callstack || []
        memory.callstack.push({
            returnIndex: sm.getStepIndex(),
            functionName: state.functionName,
            oldReferenceIndex: state.stepReferenceIndex,
        })
        state.debugState.addStep(sm.getStepIndex(), 'IF', state.functionName)
        state.stepReferenceIndex = ifIndex + 1
        sm.gotoLabel(args['label'])
    }
}

export async function patchAlybox() {
    if (!isModActive('cc-alybox')) return

    const patchSteps = await import('../../simplify/lib/patch-steps-lib/src/patchsteps.js')
    document.addEventListener('prestart', () => {
        patchSteps.callables.delete('IF')
        ccmod.patchStepsLib.callable.register('IF', fixedFunc)
    })
}
