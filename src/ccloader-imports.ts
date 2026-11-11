export async function importCCLoaderClasses() {
    const { Loader } = await import('../../../../ccloader/js/loader.js')
    const { UI } = await import('../../../../ccloader/js/ui.js')

    const { ModLoader } = await import('../../../../ccloader/js/ccloader.js')
    const { Filemanager } = await import('../../../../ccloader/js/filemanager.js')

    const { Mod } = await import('../../../../ccloader/js/mod.js')

    return { Loader, UI, ModLoader, Filemanager, Mod }
}

import * as patchSteps from '../../simplify/lib/patch-steps-lib/src/patchsteps.js'
import stripJsonComments from '../../simplify/lib/strip-json-comments'
import CustomDebugState from '../../simplify/lib/custom-debug-state.js'

export async function importSimplifyPostloadMoudleLibs() {
    return { patchSteps, stripJsonComments, CustomDebugState }
}
