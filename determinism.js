let types = []

export function initDeterminism() {
    window.determinism = {
        setSeed(seed) {
            window.determinism.generalRand = new Math.seedrandomSeed(seed)
            window.determinism.sound = new Math.seedrandomSeed(seed)

            const visual = new Math.seedrandomSeed(seed)
            window.determinism.visual = function () {
                // console.log('visual')
                return visual()
            }

            const event = new Math.seedrandomSeed(seed)
            window.determinism.event = function () {
                // console.log(
                //     types.reduce((acc, v) => {
                //         acc[v] ??= 0
                //         acc[v]++
                //         return acc
                //     }, {})
                // )
                // console.log(types.last())
                return event()
            }
        },
    }
    determinism.setSeed('welcome')

    Math.random = function () {
        if (!window.determinism.generalRand) throw new Error('determinism: seed not set!')
        // console.log('Math.random()')
        return window.determinism.generalRand()
    }

    sound()
    visual()
    event()
}

// remember to do .random()
function sound() {
    ig.SoundWebAudio.inject({
        play(...args) {
            const back = Math.random
            Math.random = window.determinism.sound
            this.parent(...args)
            Math.random = back
        },
    })
    ig.MapSoundEntry.inject({
        _selectSegment() {
            const back = Math.random
            Math.random = window.determinism.sound
            this.parent()
            Math.random = back
        },
    })
    sc.ArenaCrowdCheerController.inject({
        play(...args) {
            const back = Math.random
            Math.random = window.determinism.sound
            this.parent(...args)
            Math.random = back
        },
    })
}

function visual() {
    /* only used in ig.TIMER_MODE.SINUS_RND, and that is used only for prop visuals */
    ig.WeightTimer.inject({
        set(a, b) {
            if (this.mode != ig.TIMER_MODE.SINUS_RND) return this.parent(a, b)

            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(a, b)
            Math.random = back
        },
    })
    ig.AnimationState.inject({
        shuffleTime(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    /* only used for visual dream stuff */
    ig.UniformRNG.inject({
        init(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        get(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    /* IS_IT_CUBAUM */
    ig.Game.inject({
        preloadLevel(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.Rumble.RumbleHandle.inject({
        _updatePosition(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ParticleHandle.inject({
        setData(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ENTITY.HomingParticle.inject({
        _initOffsetParticle(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.PLAY_ANIM_RANGE.inject({
        update(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.PLAY_ANIMS_OVER_ENTITY.inject({
        update(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.DEBRIS_OVER_ENTITY.inject({
        start(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.PARTICLE_BOX.inject({
        spawnBoxLine(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.OFFSET_PARTICLE_CIRCLE.inject({
        spawn(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        _spawnParticles(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.PARTICLE_CIRCLE.inject({
        spawn(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        _spawnParticles(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.DEBRIS_CIRCLE.inject({
        spawn(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        _spawnParticles(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        spawnVel(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.SHOOT_HOMING_PARTICLE.inject({
        _spawnParticles(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.PARTICLE_RHOMBUS.inject({
        update(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EFFECT_ENTRY.WIPE_PARTICLES.inject({
        update(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.Clouds.inject({
        addCloud(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.Rain.inject({
        spawnRain() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
        spawnRainDrop() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    ig.DreamSideGui.inject({
        spawnParticle() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    ig.DreamDotGui.inject({
        spawnParticle() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    ig.EnvParticleSpawner.inject({
        setQuantity(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        spawnParticle(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    sc.ItemGuiLayer.inject({
        addItem(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    sc.Combat.inject({
        showHitEffect(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    {
        const back1 = sc.HitNumberTools.placeHitNumber
        sc.HitNumberTools.placeHitNumber = function (...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            const ret = back1(...args)
            Math.random = back
            return ret
        }
    }
    sc.DropEntity.inject({
        init(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    {
        const back1 = sc.DropEntity.spawnGenericDrops
        sc.DropEntity.spawnGenericDrops = function (...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            back1(...args)
            Math.random = back
        }
    }
    sc.ItemDropEntity.inject({
        init(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    {
        const back1 = sc.ItemDropEntity.spawnDrops
        sc.ItemDropEntity.spawnDrops = function (...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            back1(...args)
            Math.random = back
        }
    }
    ig.ENTITY.Elevator.inject({
        moveToDestination(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    sc.NpcRunnerSpawner.inject({
        getRandomCharacter() {
            const back = Math.random
            Math.random = window.determinism.visual
            const ret = this.parent()
            Math.random = back
            return ret
        },
    })
    ig.EVENT_STEP.DO_THE_SHAKE.inject({
        start() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    sc.PlayerPetEntity.inject({
        resetIdleTimer(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        update() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    ig.ENTITY.Player.inject({
        update() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    sc.FerroEntity.inject({
        setState(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ENTITY.Destructible.inject({
        init(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        update() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ENTITY.ItemDestruct.inject({
        init(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        update() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
        destroy() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
        dropItem() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    ig.ENTITY.RegenDestruct.inject({
        init(...args) {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent(...args)
            Math.random = back
        },
        regenComplete() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
        update() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    ig.ENTITY.EnemyCounter.inject({
        updateSprites() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
    ig.EVENT_STEP.FIX_SHOCKWAVE_PLATFORMS.inject({
        start() {
            const back = Math.random
            Math.random = window.determinism.visual
            this.parent()
            Math.random = back
        },
    })
}

function event() {
    {
        const back1 = ig.Event.getNumberVary
        ig.Event.getNumberVary = function (b) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.Event.getNumberVary')
                return window.determinism.event()
            }
            const ret = back1(b)
            Math.random = back
            return ret
        }
    }
    ig.ACTION_STEP.SELECT_RANDOM.inject({
        getNext(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.SELECT_RANDOM')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.WAIT_RANDOM.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.WAIT_RANDOM')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ACTION_STEP.MOVE_TO_LINE.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.MOVE_TO_LINE')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ACTION_STEP.MOVE_RANDOM.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.MOVE_RANDOM')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        run(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.MOVE_RANDOM')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.ROTATE_FACE.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.ROTATE_FACE')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.SHOW_RANDOM_ANIMATION.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.SHOW_RANDOM_ANIMATION')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.SET_RANDOM_VAR_NUMBER.inject({
        run(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.SET_RANDOM_VAR_NUMBER')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.SET_ATTRIB_NUMBER_RANDOM.inject({
        run(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.SET_ATTRIB_NUMBER_RANDOM')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.EVENT_STEP.SELECT_RANDOM.inject({
        getNext(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.EVENT_STEP.SELECT_RANDOM')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.EVENT_STEP.WAIT_RANDOM.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.EVENT_STEP.WAIT_RANDOM')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.EVENT_STEP.MASS_AVATAR_JUMP.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.EVENT_STEP.MASS_AVATAR_JUMP')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.EVENT_STEP.SET_RANDOM_VAR_NUMBER.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.EVENT_STEP.SET_RANDOM_VAR_NUMBER')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })

    {
        const back1 = ig.NAV_CLOSE_POINT_SEARCH.RANDOM
        ig.NAV_CLOSE_POINT_SEARCH.RANDOM = function (...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.NAV_CLOSE_POINT_SEARCH.RANDOM')
                return window.determinism.event()
            }
            const ret = back1(...args)
            Math.random = back
            return ret
        }
    }
    ig.NavPath.inject({
        _moveCircle(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.NavPath#_moveCircle')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
        moveEntity() {
            const back = Math.random
            Math.random = () => {
                types.push('ig.NavPath#moveEntity')
                return window.determinism.event()
            }
            const ret = this.parent()
            Math.random = back
            return ret
        },
    })
    sc.CombatParams.inject({
        getDamage(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.CombatParams#getDamage')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
        getHealAmount(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.CombatParams#getHealAmount')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.BALL_BEHAVIOR.SLOW_DOWN.inject({
        onInit(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.BALL_BEHAVIOR.SLOW_DOWN#onInit')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.EnemyDisplayGui.inject({
        init(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyDisplayGui#init')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        update() {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyDisplayGui#update')
                return window.determinism.event()
            }
            this.parent()
            Math.random = back
        },
    })
    sc.Combat.inject({
        getEnemyTarget() {
            const back = Math.random
            Math.random = () => {
                types.push('sc.Combat#getEnemyTarget')
                return window.determinism.event()
            }
            const ret = this.parent()
            Math.random = back
            return ret
        },
        getPlayerTarget(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.Combat#getPlayerTarget')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
        getNearbyThreat(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.Combat#getNearbyThreat')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
        initFrequencyTimers(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.Combat#initFrequencyTimers')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        submitFrequency(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.Combat#submitFrequency')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    sc.SpawnHelper.inject({
        spawn(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.SpawnHelper#spawn')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    {
        const back1 = sc.AssaultTools.spawn
        sc.AssaultTools.spawn = function (...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.AssaultTools.spawn')
                return window.determinism.event()
            }
            const ret = back1(...args)
            Math.random = back
            return ret
        }
    }
    sc.EnemyType.inject({
        update(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyType#update')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        postActionUpdate(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyType#postActionUpdate')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        switchState(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyType#switchState')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        resolveDefeat(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyType#resolveDefeat')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        resolveItemDrops(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyType#resolveItemDrops')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    sc.EnemyState.inject({
        selectAction(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyState#selectAction')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    {
        const back1 = sc.EnemyAnno.doesRandomlyUnderstand.bind(sc.EnemyAnno)
        sc.EnemyAnno.doesRandomlyUnderstand = function (...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.EnemyAnno.doesRandomyUnderstand')
                return window.determinism.event()
            }
            const ret = back1(...args)
            Math.random = back
            return ret
        }
    }
    ig.ENTITY.Enemy.inject({
        onPreDamageModification(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ENTITY.Enemy#onPreDamageModification')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
        onInstantDamage(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ENTITY.Enemy#onInstantDamage')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ENTITY.EnemySpawner.inject({
        spawnEnemy(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ENTITY.EnemySpawner#spawnEnemy')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.ENEMY_REACTION.TARGET_DISTANCE.inject({
        check(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.ENEMY_REACTION.TARGET_DISTANCE#check')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.ENEMY_REACTION.COLLAB.inject({
        isReady(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.ENEMY_REACION.COLLAB#isReady')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.ENEMY_REACTION.GUARD_COUNTER.inject({
        onGuardCounterCheck(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.ENEMY_REACTION.GUARD_COUNTER#onGuardCounterCheck')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.ENEMY_REACTION.DODGE.inject({
        check(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.ENEMY_REACTION.DODGE#check')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.ENEMY_REACTION.COUNTER_COUNTER.inject({
        check(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.ENEMY_REACTION.COUNTER_COUNTER#check')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.ENEMY_TRACKER.TIME.inject({
        _initTimer(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.ENEMY_TRACKER.TIME#_initTimer')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        reset(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.ENEMY_TRACKER.TIME#reset')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ACTION_STEP.ESCAPE_FROM_TARGET.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.ESCAPE_FROM_TARGET#start')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        run(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.ESCAPE_FROM_TARGET#run')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.CIRCLE_TARGET.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.CIRCLE_TARGET#start')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ACTION_STEP.FANCY_AIM.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.FANCY_AIM#start')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    ig.ACTION_STEP.WAIT_UNTIL_COMBAT_TRUE.inject({
        run(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.WAIT_UNTIL_COMBAT_TRUE#run')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.COMBAT_IF.inject({
        getNext(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.COMBAT_IF#getNext')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.RELEASE_STORED_ENEMIES.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.RELEASE_STORED_ENEMIES#start')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EVENT_STEP.COMBAT_IF.inject({
        getNext() {
            const back = Math.random
            Math.random = () => {
                types.push('ig.EVENT_STEP.COMBAT_IF#getNext')
                return window.determinism.event()
            }
            const ret = this.parent()
            Math.random = back
            return ret
        },
    })
    sc.NPCRunnerEntity.inject({
        initAction(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.NPCRunnerEntity#initAction')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        getDestinationEntryAndPos(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.NPCRunnerEntity#getDestinationEntityAndPos')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    sc.NpcRunnerSpawner.inject({
        setGroup(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.NpcRunnerSpawner#setGroup')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        spawnNpcGroups(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.NpcRunnerSpawner#spawnNpcGroups')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        getRandomDestination(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.NpcRunnerSpawner#getRandomDestination')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
        onPreUpdate() {
            const back = Math.random
            Math.random = () => {
                types.push('sc.NpcRunnerSpawner#onPreUpdate')
                return window.determinism.event()
            }
            this.parent()
            Math.random = back
        },
    })
    ig.ENTITY.Crosshair.inject({
        getThrowDir(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ENTITY.Crosshair#getThrowDir')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
    ig.ACTION_STEP.RAIN_BOMB.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.RAIN_BOMB#start')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    ig.EVENT_STEP.SPAWN_BOMB.inject({
        start() {
            const back = Math.random
            Math.random = () => {
                types.push('ig.EVENT_Step.SPAWN_BOMB#start')
                return window.determinism.event()
            }
            this.parent()
            Math.random = back
        },
    })
    ig.ACTION_STEP.SET_PARTY_TEMP_TARGET.inject({
        start(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('ig.ACTION_STEP.SET_PARTY_TEMP_TARGET')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
    })
    sc.PartyMemberEntity.inject({
        init(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.PartyMemberEntity#init')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        changeState(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.PartyMemberEntity#changeState')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        update(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.PartyMemberEntity#update')
                return window.determinism.event()
            }
            this.parent(...args)
            Math.random = back
        },
        resetAttackTimer() {
            const back = Math.random
            Math.random = () => {
                types.push('sc.PartyMemberEntity#resetAttackTimer')
                return window.determinism.event()
            }
            this.parent()
            Math.random = back
        },
        startCombat() {
            const back = Math.random
            Math.random = () => {
                types.push('sc.PartyMemberEntity#startCombat')
                return window.determinism.event()
            }
            this.parent()
            Math.random = back
        },
        getBestElement() {
            const back = Math.random
            Math.random = () => {
                types.push('sc.PartyMemberEntity#getBestElement')
                return window.determinism.event()
            }
            const ret = this.parent()
            Math.random = back
            return ret
        },
        selectCombatArt() {
            const back = Math.random
            Math.random = () => {
                types.push('sc.PartyMemberEntity#selectComatArt')
                return window.determinism.event()
            }
            const ret = this.parent()
            Math.random = back
            return ret
        },
    })
    sc.CommonEvents.inject({
        startCallEvent(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.CommonEvents#startCallEvent')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
        selectEvent(...args) {
            const back = Math.random
            Math.random = () => {
                types.push('sc.CommonEvents#selectEvent')
                return window.determinism.event()
            }
            const ret = this.parent(...args)
            Math.random = back
            return ret
        },
    })
}
