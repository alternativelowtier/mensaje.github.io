const CharacterStatsBase = { 
    Yuji: { hp: 1000, speed: 4.5, suitColor: '#181f2f', redColor: '#eb1b31', hairColor: '#f0a3bb' }, 
    Gojo: { hp: 900, speed: 3.8, suitColor: '#080812', redColor: '#000000', hairColor: '#ffffff' }, 
    Yuta: { hp: 950, speed: 4.8, suitColor: '#e0e0e0', pantsColor: '#1a1a1a', hairColor: '#22222b'} 
};

class Fighter {
    constructor(characterName, spawnX, playerId) {
        this.charName = characterName; 
        this.x = spawnX; 
        this.y = GROUND_Y - 30; 
        this.playerId = playerId; 
        this.facingDir = (playerId === 1) ? -1 : 1; 
        this.isCpu = (playerId === 1);
        let stats = CharacterStatsBase[characterName]; 
        this.health = stats.hp; 
        this.maxHealth = stats.hp; 
        this.guardHp = 100; 
        this.spMeter = 0; 
        this.ultMeter = 0;
        this.parryMeter = 100; 
        this.stunTimer = 20; 
        this.velX = 0; 
        this.velY = 0; 
        this.currentState = 'idle'; 
        this.stateFrameTimer = 0; 
        this.cooldowns = {};
        this.isGuardBroken = false; 
        this.isInvulnerable = false; 
        this.isTransformed = false; 
        this.transformTimer = 0; 
        this.comboCounter = 0; 
        this.canContinueCombo = false;
        this.lastTap = { key: null, time: 0 }; 
        this.chargingKey = null; 
        this.mappedChargeKey = null; 
        this.chargeTimer = 0; 
        this.divergentFistTimer = 0; 
        this.blackFlashSuccess = false; 
        this.blackFlashBuff = 0; 
        this.bf_targetX = 0;
        this.comboHits = 0; 
        this.comboTimer = 0; 
        this.comboJustIncremented = false; 
        this.hasUsedDomain = false; 
        this.invulnTimer = 0; 
        this.sukunaDomainBar = 0;
        this.copiedTechnique = "NONE"; 
        this.copiedTechniqueName = "NONE";
        this.copyCharges = 0;
    }

    setState(newState) { 
        if (this.currentState !== newState) { 
            this.currentState = newState; 
            this.stateFrameTimer = 0; 
            if (newState !== 'atk_j') { 
                this.comboCounter = 0; 
                this.canContinueCombo = false; 
            } 
            this.blackFlashSuccess = false; 
        } 
    }

    isUltimateActive() { 
        return (this.charName === 'Yuta' && typeof domainExpansionSystem !== 'undefined' && domainExpansionSystem.isActive && domainExpansionSystem.casterPlayerId === this.playerId) || this.isTransformed; 
    }

    receiveDamage(damage, pushback, attacker, isUnblockable, noStun = false, isDomainTick = false, spGainModifier = 1.0) {
        if (this.currentState === 'dead') return; 
        if (this.isInvulnerable) return;

        if (typeof domainExpansionSystem !== 'undefined' && domainExpansionSystem.isActive && domainExpansionSystem.casterPlayerId === this.playerId) {
            if(this.charName === 'Yuta') return; // Yuta is immune inside his own domain
            let threshold = domainExpansionSystem.getShatterTime() - 120;
            if (domainExpansionSystem.timer < threshold) { 
                domainExpansionSystem.isActive = false; 
                domainExpansionSystem.timer = 0; 
                if(typeof soundManager !== 'undefined') soundManager.play('hitHeavy'); 
                domainExpansionSystem.galaxyLines = null; 
                domainExpansionSystem.splats = null; 
                domainExpansionSystem.voidStreaks = null; 
                domainExpansionSystem.floatingMathSymbols =[];
            }
        }

        if (this.charName === 'Yuji' && this.currentState === 'ability_o' && this.stateFrameTimer < 40 && !isUnblockable) { 
            this.setState('counter_attack'); 
            this.isInvulnerable = true; 
            this.invulnTimer = 25; 
            gameEngine.hitStopFrames = 15; 
            gameEngine.impactFrame = 2; 
            gameEngine.cameraShake = 20; 
            attacker.receiveDamage(attacker.maxHealth * 0.20, 15, this, true); 
            attacker.velY = -8; 
            spawnHitSparks(this.x + 20*this.facingDir, this.y, '#fff', true); 
            return; 
        }

        if (this.currentState === 'guarding' && !isUnblockable && pushback >= 0) { 
            this.guardHp -= (damage * 1.5); 
            this.parryMeter = Math.min(100, this.parryMeter + damage * 1.5); 
            if (pushback > 0) this.velX = (pushback * 0.3) * attacker.facingDir; 
            spawnHitSparks(this.x, this.y, '#ffd000', false); 
            if (this.guardHp <= 0 && !this.isGuardBroken) { 
                this.isGuardBroken = true; 
                this.setState('guard_broken'); 
                this.velX = -5 * this.facingDir; 
                gameEngine.cameraShake += 8; 
                spawnHitSparks(this.x, this.y, '#ffd000', true); 
            } 
            return; 
        }

        if(typeof soundManager !== 'undefined') soundManager.play('jojo_punch'); 
        if (attacker && attacker.blackFlashBuff > 0) { damage *= (1 + attacker.blackFlashBuff * 0.15); } 
        this.health -= damage; 
        this.parryMeter = Math.min(100, this.parryMeter + damage * 0.8);
        if (!noStun) { 
            this.setState('hit_stun'); 
            if (pushback > 0 || this.y < GROUND_Y - 30) this.velY = -3.5; 
        } 
        this.velX = pushback * attacker.facingDir; 

        if (!isDomainTick) {
            this.spMeter = Math.min(100, this.spMeter + (damage * 0.3 * spGainModifier)); 
            if (!this.isUltimateActive()) { this.ultMeter = Math.min(100, this.ultMeter + (damage * 0.1 * spGainModifier)); }
        }

        if (attacker && attacker.spMeter !== undefined && !isDomainTick) { 
            attacker.spMeter = Math.min(100, attacker.spMeter + (damage * 0.2 * spGainModifier)); 
            attacker.parryMeter = Math.min(100, attacker.parryMeter + (damage * 0.3 * spGainModifier)); 
            if (!attacker.isUltimateActive()) { 
                attacker.ultMeter = Math.min(100, attacker.ultMeter + (damage * 0.08 * spGainModifier)); 
            } 
            attacker.comboHits++; 
            attacker.comboTimer = 90; 
            attacker.comboJustIncremented = true; 
            
            if (attacker.charName === 'Yuji' && attacker.isTransformed) { 
                if (typeof domainExpansionSystem !== 'undefined' && !domainExpansionSystem.isActive) {
                    attacker.sukunaDomainBar = Math.min(100, attacker.sukunaDomainBar + damage * 0.4 * spGainModifier); 
                }
            } 
        }

        if (this.health <= 0) { 
            this.health = 0; 
            if (this.currentState !== 'dead') { 
                this.setState('dead'); 
                this.velX = 0; 
                for (let i = 0; i < 60; i++) { 
                    let col = Math.random() > 0.5 ? CharacterStatsBase[this.charName].suitColor : CharacterStatsBase[this.charName].hairColor; 
                    gameEngine.particles.push(new ParticleEffect(this.x + (Math.random()-0.5)*20, this.y - 15 + (Math.random()-0.5)*30, (Math.random()-0.5)*6, (Math.random()-0.5)*6 - 2, col, 'dust')); 
                } 
                if(typeof triggerMatchEnd !== 'undefined') triggerMatchEnd(attacker); 
            } 
        } 
    }

    update() {
        if (this.currentState === 'dead') { this.velX = 0; return; }
        if (gameEngine.hitStopFrames > 0 || (typeof hollowPurpleSystem !== 'undefined' && hollowPurpleSystem.isActive) || (typeof domainClashSystem !== 'undefined' && domainClashSystem.isActive) || gameEngine.vsScreenTimer > 0) return;
        if (gameEngine.introTimer > 0 || gameEngine.roundStartTimer > 60) return; 

        if (this.isTransformed) { 
            this.transformTimer--; 
            if (this.transformTimer <= 0) { 
                this.isTransformed = false; 
                if(this.charName === 'Yuji') { 
                    let el = document.getElementById(`hud-name-p${this.playerId+1}`); 
                    if(el) el.innerText = this.charName.toUpperCase(); 
                } 
            } 
        }
        
        if (this.invulnTimer > 0) { 
            this.invulnTimer--; 
            this.isInvulnerable = true; 
        } else if (this.currentState !== 'counter_attack') { 
            this.isInvulnerable = false; 
        }

        if (typeof domainExpansionSystem !== 'undefined' && domainExpansionSystem.isActive && domainExpansionSystem.casterPlayerId !== this.playerId && domainExpansionSystem.timer < domainExpansionSystem.getShatterTime()) {
            if (domainExpansionSystem.domainType === 'void') {
                if (domainExpansionSystem.timer >= 210) { 
                    this.setState('hit_stun'); this.velX = 0; 
                    if (domainExpansionSystem.timer >= 390 && gameEngine.frameCount % 5 === 0) { 
                        let mathSymbols = ["π", "∞", "cos()", "%", "E=MC²"]; 
                        domainExpansionSystem.floatingMathSymbols.push({ text: mathSymbols[Math.floor(Math.random() * mathSymbols.length)], x: this.x + (Math.random() * 40) - 20, y: this.y - 15, life: 0 }); 
                    } 
                    return; 
                } 
            } 
            else if (domainExpansionSystem.domainType === 'shrine' && domainExpansionSystem.timer >= 160) { 
                if (gameEngine.frameCount % 4 === 0) { 
                    if (this.currentState === 'guarding' || this.currentState === 'parry_stance') { 
                        this.guardHp -= 1.5; 
                        if (this.guardHp <= 0 && !this.isGuardBroken) { 
                            this.isGuardBroken = true; 
                            this.setState('guard_broken'); 
                            this.velX = -5 * this.facingDir; 
                            gameEngine.cameraShake += 8; 
                        } 
                        spawnHitSparks(this.x, this.y, '#ffd000', false); 
                    } else { 
                        this.receiveDamage(10, 0, gameEngine.roster[domainExpansionSystem.casterPlayerId], true, true, true, 0.2); 
                        spawnHitSparks(this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30, '', true, true); 
                    } 
                } 
            } 
        }

        this.stateFrameTimer++; this.velY += GRAVITY; this.x += this.velX; this.y += this.velY;
        if (this.y >= GROUND_Y - 30) { this.y = GROUND_Y - 30; this.velY = 0; this.velX *= 0.7; }
        this.x = Math.max(15, Math.min(this.x, LOG_W - 15)); 
        if (this.x <= 15) { this.x = 15; if (this.velX < 0) this.velX = 0; } 
        if (this.x >= LOG_W - 15) { this.x = LOG_W - 15; if (this.velX > 0) this.velX = 0; }

        if (this.currentState === 'domain_chant') {
            let threshold = typeof domainExpansionSystem !== 'undefined' ? domainExpansionSystem.getShatterTime() - 120 : 0;
            if (typeof domainExpansionSystem === 'undefined' || !domainExpansionSystem.isActive || domainExpansionSystem.casterPlayerId !== this.playerId || domainExpansionSystem.timer >= threshold) {
                this.setState('idle');
            } else {
                this.velX = 0; return;
            }
        }

        for (let key in this.cooldowns) { if (this.cooldowns[key] > 0) this.cooldowns[key]--; } 
        if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer <= 0) this.comboHits = 0; }
        
        if (this.isGuardBroken) { 
            this.guardHp += 0.5; 
            if (this.guardHp >= 100) { 
                this.guardHp = 100; 
                this.isGuardBroken = false; 
                if (this.currentState === 'guard_broken') this.setState('idle'); 
            } 
        } else if (this.currentState !== 'guarding' && this.guardHp < 100) { 
            this.guardHp += 0.2; 
        }

        if (this.currentState === 'hit_stun') { 
            if(this.charName === 'Yuta' && this.isUltimateActive()){ this.setState('idle'); }
            else if (this.stateFrameTimer > this.stunTimer) { this.setState('idle'); }
            return; 
        }
        
        if (this.currentState === 'dash') { 
            if (this.stateFrameTimer > 15) this.setState('idle'); 
            else this.velX = 14 * this.facingDir; 
            if (gameEngine.frameCount % 3 === 0) { gameEngine.particles.push(new ParticleEffect(this.x, this.y, 0, 0, CharacterStatsBase[this.charName].suitColor, 'dash_trail')); } 
            return; 
        }

        if (this.currentState === 'bf_dash_teleport') {
            let dist = this.bf_targetX - this.x;
            this.x += dist * 0.35;
            if (this.stateFrameTimer % 2 === 0) { gameEngine.particles.push(new ParticleEffect(this.x, this.y, 0, 0, '#000', 'dash_trail')); gameEngine.particles.push(new ParticleEffect(this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*10, 0, 0, '#ff0000', 'dash_trail')); }
            let opponent = gameEngine.roster[this.playerId === 0 ? 1 : 0]; 
            if (opponent.currentState === 'hit_stun') opponent.stateFrameTimer = 0; 
            if (Math.abs(dist) <= 5 || this.stateFrameTimer > 10) { 
                this.x = this.bf_targetX; this.velX = 0; this.facingDir = (opponent.x - this.x) > 0 ? 1 : -1; opponent.facingDir = -this.facingDir; this.setState('bf_slow_punch'); 
            } 
            return; 
        }

        if (this.currentState === 'bf_slow_punch') { 
            let opponent = gameEngine.roster[this.playerId === 0 ? 1 : 0]; 
            if (opponent.currentState === 'hit_stun') opponent.stateFrameTimer = 0; 
            if (this.stateFrameTimer > 30) { 
                if (bfMinigame.chainCount >= 4) { this.executeBlackFlashHit(true); } 
                else { this.executeBlackFlashHit(false); bfMinigame.resume(this); } 
            } 
            return; 
        }

        if (this.currentState === 'ability_u_pull' && this.stateFrameTimer >= 14) { gameEngine.projectiles.push(new CombatProjectile('lapse_blue_pull', this.x + (15*this.facingDir), this.y - 15, this.facingDir, this, false)); this.cooldowns['j'] = 0; this.cooldowns['k'] = 0; this.cooldowns['l'] = 0; this.setState('idle'); return; }
        if (this.currentState === 'ability_i_tap' && this.stateFrameTimer >= 6) { gameEngine.cameraShake = 12; gameEngine.screenFlash = { color: '#ff0000', duration: 8, life: 8 }; gameEngine.projectiles.push(new CombatProjectile('red_explosion', this.x, this.y, this.facingDir, this, false)); let opponent = gameEngine.roster[this.playerId === 0 ? 1 : 0]; if (Math.abs(this.x - opponent.x) < 70 && Math.abs(this.y - opponent.y) < 70) { opponent.receiveDamage(35, 12, this, false); gameEngine.hitStopFrames = 5; } this.setState('idle'); return; }
        if (this.currentState === 'ability_o_rct_heal') { if(this.stateFrameTimer % 3 === 0) { gameEngine.particles.push(new ParticleEffect(this.x + (Math.random()-0.5)*30, this.y + 20, 0, -0.5, '', 'rct_heal')); } }
        
        if(this.currentState === 'yuta_rearm' && this.stateFrameTimer === 30) {
            const techniques = ['HOLLOW_PURPLE', 'LAPSE_BLUE', 'REVERSAL_RED', 'DISMANTLE'];
            const chosen = techniques[Math.floor(Math.random() * techniques.length)];
            this.copiedTechniqueName = chosen;
            this.copiedTechnique = chosen;
            this.copyCharges = 1;
            this.setState('idle');
        }

        if (this.currentState === 'charging_pose') {
            this.chargeTimer++; let handX = this.x + 10 + (12 * this.facingDir); let handY = this.y + 18;
            if (this.chargingKey === 'u' && gameEngine.frameCount % 2 === 0) { gameEngine.particles.push(new ParticleEffect(handX, handY, (Math.random()-0.5)*6, (Math.random()-0.5)*6, '#0044ff', 'outward')); }
            else if (this.chargingKey === 'i' && gameEngine.frameCount % 2 === 0) { let angle = Math.random() * Math.PI * 2; let dist = 30; let px = handX + Math.cos(angle)*dist; let py = handY + Math.sin(angle)*dist; gameEngine.particles.push(new ParticleEffect(px, py, -Math.cos(angle)*3, -Math.sin(angle)*3, '#ff0000', 'inward')); }
            
            let maxChargeTime = 40;
            if (this.chargeTimer >= maxChargeTime) { this.fireChargedAbility(true); } 
            else if (!inputs.keys[this.mappedChargeKey]) { this.fireChargedAbility(false); }
            return;
        }

        if (this.currentState === 'ability_hp_fire') {
            if (this.stateFrameTimer > 40) this.setState('idle');
        }

        const attackStates =['atk_j', 'atk_k', 'grab_l', 'ability_u_pull', 'ability_i_tap', 'ability_u', 'ability_u_max', 'ability_u_flurry', 'ability_u_sukuna', 'ability_u_rika', 'ability_u_yuta_domain', 'ability_i', 'ability_i_max', 'ability_i_sukuna', 'ability_i_yuta_iai', 'ability_i_yuta_domain', 'ability_o', 'ability_o_sukuna', 'ability_o_rct_heal', 'ability_o_yuta_domain', 'ability_ult', 'hollow_purple_charge', 'ability_hp_fire', 'counter_attack', 'parry_stance', 'dash', 'dead', 'bf_dash_teleport', 'bf_slow_punch', 'yuta_rearm'];
        if (this.currentState === 'atk_j') { if (this.stateFrameTimer > 10 && this.stateFrameTimer < 40) this.canContinueCombo = (this.comboCounter < 4); else this.canContinueCombo = false; if (this.stateFrameTimer > 40) { this.setState('idle'); this.cooldowns['j'] = 15; }
        } else if (this.currentState === 'grab_l') { if (this.stateFrameTimer > 30) this.setState('idle');
        } else if (!['idle', 'run', 'guarding', 'charging_pose', 'hollow_purple_charge', 'guard_broken'].includes(this.currentState)) {
        let animLimit = (this.currentState === 'ability_ult') ? 540 : (this.currentState === 'ability_u_max' ? 40 : (this.currentState === 'ability_i_max' ? 40 : (this.currentState === 'ability_u_flurry' ? 55 : (this.currentState === 'ability_u' ? 45 : (this.currentState === 'ability_u_rika' ? 45 : (this.currentState === 'ability_o_sukuna' ? 40 : (this.currentState === 'ability_u_sukuna' ? 35 : (this.currentState === 'ability_i_sukuna' ? 35 : (this.currentState === 'ability_o' ? 40 : (this.currentState === 'counter_attack' ? 25 : (this.currentState === 'parry_stance' ? 12 : (this.currentState === 'ability_i_yuta_iai' ? 30 : (this.currentState === 'ability_o_rct_heal' ? 60 : (this.currentState === 'ability_o_yuta_domain' ? 120 : (this.currentState === 'ability_i_yuta_domain' ? 30 : (this.currentState === 'ability_u_yuta_domain' ? 40 : (this.currentState === 'yuta_rearm' ? 40 : 24)))))))))))))))));
        if (this.stateFrameTimer > animLimit) { this.setState('idle'); } }

        if (this.divergentFistTimer > 0) { this.divergentFistTimer--; if (this.divergentFistTimer === 0) { let attacker = gameEngine.roster[this.playerId === 0 ? 1 : 0]; this.receiveDamage(40, 4, attacker, true); spawnHitSparks(this.x, this.y, '#0044ff', true); gameEngine.cameraShake += 6; gameEngine.hitStopFrames = 5; } }
        if (this.health > 0 && this.ultMeter < 100 && !this.isUltimateActive()) { this.ultMeter += 0.05; }
        
        this.processHitDetection(); 
        this.handleInputAndAI(); 
        this.x = Math.max(15, Math.min(this.x, LOG_W - 15));
    }

    fireChargedAbility(isMax) {
        if (!this.chargingKey) return;
        if (this.chargingKey === 'u') { 
            let cost = isMax ? 50 : 20; this.spMeter -= cost; this.cooldowns['u'] = 30; if(typeof soundManager !== 'undefined') soundManager.play('gojoBlue'); 
            if (isMax) { this.setState('ability_u_max'); } else { this.setState('ability_u_pull'); } 
        } else if (this.chargingKey === 'i') { 
            let cost = isMax ? 50 : 30; this.spMeter -= cost; if(typeof soundManager !== 'undefined') soundManager.play('gojoRed'); 
            if (isMax) { this.setState('ability_i_max'); this.cooldowns['i'] = 50; } else { this.setState('ability_i_tap'); this.cooldowns['i'] = 50; } 
        } 
        this.chargingKey = null; this.mappedChargeKey = null; this.chargeTimer = 0;
    }

    handleInputAndAI() {
        const ctrl = this.playerId === 0 ? { w: typeof keybinds !== 'undefined' ? keybinds.p1.up : 'w', a: typeof keybinds !== 'undefined' ? keybinds.p1.left : 'a', s: typeof keybinds !== 'undefined' ? keybinds.p1.down : 's', d: typeof keybinds !== 'undefined' ? keybinds.p1.right : 'd', j: typeof keybinds !== 'undefined' ? keybinds.p1.light : 'j', k: typeof keybinds !== 'undefined' ? keybinds.p1.heavy : 'k', l: typeof keybinds !== 'undefined' ? keybinds.p1.grab : 'l', u: typeof keybinds !== 'undefined' ? keybinds.p1.ab1 : 'u', i: typeof keybinds !== 'undefined' ? keybinds.p1.ab2 : 'i', o: typeof keybinds !== 'undefined' ? keybinds.p1.ab3 : 'o', p: typeof keybinds !== 'undefined' ? keybinds.p1.ult : 'p' } : { w: typeof keybinds !== 'undefined' ? keybinds.p2.up : 'arrowup', a: typeof keybinds !== 'undefined' ? keybinds.p2.left : 'arrowleft', s: typeof keybinds !== 'undefined' ? keybinds.p2.down : 'arrowdown', d: typeof keybinds !== 'undefined' ? keybinds.p2.right : 'arrowright', j: typeof keybinds !== 'undefined' ? keybinds.p2.light : 'm', k: typeof keybinds !== 'undefined' ? keybinds.p2.heavy : 'n', l: typeof keybinds !== 'undefined' ? keybinds.p2.grab : 'b', u: typeof keybinds !== 'undefined' ? keybinds.p2.ab1 : 'v', i: typeof keybinds !== 'undefined' ? keybinds.p2.ab2 : 'c', o: typeof keybinds !== 'undefined' ? keybinds.p2.ab3 : 'x', p: typeof keybinds !== 'undefined' ? keybinds.p2.ult : 'z' };
        if (typeof bfMinigame !== 'undefined' && bfMinigame.isActive && bfMinigame.player === this) { return; }

        if (this.isCpu) {
            if (typeof gameMode !== 'undefined' && gameMode === 'training') { this.setState('idle'); if (this.health < this.maxHealth && this.currentState !== 'hit_stun' && !(typeof domainExpansionSystem !== 'undefined' && domainExpansionSystem.isActive)) this.health += 2; this.guardHp = 100; return; }
            this.aiTick = (this.aiTick || 0) + 1; if (this.aiTick % 4 !== 0) return;
            const attackStates =['atk_j', 'atk_k', 'grab_l', 'ability_u_pull', 'ability_i_tap', 'ability_u', 'ability_u_max', 'ability_u_flurry', 'ability_u_sukuna', 'ability_u_rika', 'ability_u_yuta_domain', 'ability_i', 'ability_i_max', 'ability_i_sukuna', 'ability_i_yuta_iai', 'ability_i_yuta_domain', 'ability_o', 'ability_o_sukuna', 'ability_o_rct_heal', 'ability_o_yuta_domain', 'ability_ult', 'hollow_purple_charge', 'ability_hp_fire', 'counter_attack', 'charging_pose', 'guard_broken', 'hit_stun', 'parry_stance', 'dash', 'dead', 'bf_dash_teleport', 'bf_slow_punch', 'domain_chant'];
            let isCombable = (this.currentState === 'atk_j' && this.canContinueCombo) || (this.currentState === 'ability_u_pull'); if (attackStates.includes(this.currentState) && !isCombable) return;
            let opponent = gameEngine.roster[0]; let distanceX = opponent.x - this.x; this.facingDir = distanceX > 0 ? 1 : -1; let absDist = Math.abs(distanceX);
            let incomingProjectile = gameEngine.projectiles.find(p => p.owner !== this && p.active && p.y > GROUND_Y-60 && Math.abs(p.x - this.x) < 100 && (p.x-this.x) * p.direction * this.facingDir < 0);
            if(incomingProjectile && this.y >= GROUND_Y - 30 && Math.random() < 0.35) { this.velY = -10.5; return; }
            let ultChance = (this.health < this.maxHealth * 0.4) ? 0.02 : 0.005; if (opponent.currentState === 'hit_stun' || opponent.currentState.startsWith('ability')) ultChance += 0.08; 
            if (this.ultMeter >= 100 && (!this.isTransformed && this.charName !== 'Gojo') && Math.random() < ultChance) { if(typeof triggerUltimate !== 'undefined') triggerUltimate(this); return; }
            if (this.ultMeter >= 100 && (this.charName === 'Gojo' || this.charName === 'Yuta') && Math.random() < ultChance) { this.ultMeter = 0; if(typeof triggerDomainExpansion !== 'undefined') triggerDomainExpansion(this); return; }
            if (this.isTransformed && this.sukunaDomainBar >= 100 && Math.random() < ultChance) { this.sukunaDomainBar = 0; if(typeof triggerDomainExpansion !== 'undefined') triggerDomainExpansion(this); return; }
            let opponentIsAttacking = opponent.currentState.startsWith('atk');
            if (opponentIsAttacking && absDist < 60) { if (Math.random() < 0.2 && (this.cooldowns['parry']||0)<=0 && this.parryMeter >= 50) { this.setState('parry_stance'); this.parryMeter -= 50; this.cooldowns['parry'] = 90; return; } }
            if ((incomingProjectile || (opponentIsAttacking && absDist < 60)) && this.guardHp > 20 && Math.random() < 0.8) { this.setState('guarding'); this.guardHp -= 0.15; this.velX = 0; return; }

            let possibleActions =[]; let choice = null;
            if (isCombable && absDist <= 45) { choice = (Math.random() < 0.85) ? 'atk_j' : 'idle'; } else {
                if (absDist <= 35) { if ((this.cooldowns['j'] || 0) <= 0) { possibleActions.push('atk_j', 'atk_j', 'atk_j', 'atk_j'); } if ((this.cooldowns['k'] || 0) <= 0) possibleActions.push('atk_k'); if ((this.cooldowns['l'] || 0) <= 0 && opponent.currentState === 'guarding') possibleActions.push('grab_l', 'grab_l'); } 
                else if (absDist <= 120) { possibleActions.push('run', 'run'); if ((this.cooldowns['k'] || 0) <= 0) possibleActions.push('atk_k'); if (!this.isTransformed && this.charName === 'Yuji' && this.spMeter >= 20 && (this.cooldowns['u'] || 0) <= 0 && Math.random() < 0.2) possibleActions.push('ability_u'); if (!this.isTransformed && this.charName === 'Yuji' && this.spMeter >= 40 && (this.cooldowns['i'] || 0) <= 0 && Math.random() < 0.2) possibleActions.push('ability_i'); if (this.isTransformed && this.spMeter >= 40 && (this.cooldowns['i'] || 0) <= 0 && Math.random() < 0.2) possibleActions.push('ability_i_sukuna'); if (this.charName === 'Yuta' && this.spMeter >= 40 && (this.cooldowns['i']||0)<=0 && Math.random() < 0.25) possibleActions.push('ability_i_yuta_iai'); } 
                else { possibleActions.push('run', 'run', 'run'); if (Math.random() < 0.05 && !this.isGuardBroken && (this.cooldowns['dash']||0)<=0) { this.setState('dash'); this.velX = 12 * this.facingDir; this.cooldowns['dash'] = 45; return; }
                    if (this.charName === 'Gojo') { if (this.spMeter >= 30 && (this.cooldowns['i'] || 0) <= 0 && Math.random() < 0.1) possibleActions.push('ability_i'); if (this.spMeter >= 20 && (this.cooldowns['u'] || 0) <= 0 && Math.random() < 0.1) possibleActions.push('ability_u_pull'); }
                    if (!this.isTransformed && this.charName === 'Yuji' && this.spMeter >= 40 && (this.cooldowns['i'] || 0) <= 0 && Math.random() < 0.1 && absDist < 150) possibleActions.push('ability_i');
                    if (this.isTransformed) { if (this.spMeter >= 30 && (this.cooldowns['u'] || 0) <= 0 && Math.random() < 0.1) possibleActions.push('ability_u_sukuna'); if (this.spMeter >= 40 && (this.cooldowns['i'] || 0) <= 0 && Math.random() < 0.1 && absDist < 120) possibleActions.push('ability_i_sukuna'); }
                    if (this.charName === 'Yuta' && !this.isUltimateActive()) {
                        if (this.copyCharges > 0 && this.spMeter >= 20 && (this.cooldowns['u'] || 0) <= 0 && Math.random() < 0.2) possibleActions.push('ability_u');
                        else if (this.copyCharges <= 0 && this.spMeter >= 30 && (this.cooldowns['u'] || 0) <= 0 && Math.random() < 0.2 && absDist < 100) possibleActions.push('ability_u_rika');
                    }
                }
                if ((incomingProjectile || (opponentIsAttacking && absDist < 50))) { if (this.charName === 'Gojo' && this.spMeter >= 40 && (this.cooldowns['o'] || 0) <= 0) possibleActions.push('ability_o'); if (!this.isTransformed && this.charName === 'Yuji' && this.spMeter >= 30 && (this.cooldowns['o'] || 0) <= 0) possibleActions.push('ability_o'); if (this.isTransformed && this.spMeter >= 50 && (this.cooldowns['o'] || 0) <= 0) possibleActions.push('ability_o_sukuna'); }
                if (this.charName === 'Yuta' && this.health < this.maxHealth * 0.5 && this.spMeter >= 100 && (this.cooldowns['o']||0)<=0) possibleActions.push('ability_o_rct_heal');
                if (possibleActions.length === 0) { this.setState('idle'); return; } choice = possibleActions[Math.floor(Math.random() * possibleActions.length)];
            }

            switch(choice) {
            case 'atk_j': if (this.currentState === 'atk_j' && this.canContinueCombo) { this.comboCounter++; } else { this.comboCounter = 1; } this.currentState = 'atk_j'; this.stateFrameTimer = 0; this.blackFlashSuccess = false; this.canContinueCombo = false; if (this.comboCounter >= 4) this.cooldowns['j'] = 45; break;
            case 'atk_k': this.setState('atk_k'); this.cooldowns['k'] = 30; break;
            case 'grab_l': this.setState('grab_l'); this.cooldowns['l'] = 40; break;
            case 'ability_u': 
                if (this.charName === 'Gojo') { if (this.spMeter >= 50 && Math.random() < 0.5) { this.spMeter -= 50; this.setState('ability_u_max'); this.cooldowns['u'] = 50; if(typeof soundManager !== 'undefined') soundManager.play('gojoBlue'); } else { this.spMeter -= 20; this.setState('ability_u_pull'); this.cooldowns['u'] = 50; if(typeof soundManager !== 'undefined') soundManager.play('gojoBlue'); } } 
                else if (this.charName === 'Yuta') { 
                    this.spMeter -= 20;
                    if(this.isUltimateActive()) { this.setState('ability_u_yuta_domain'); }
                    else if (this.copiedTechnique === 'Gojo_U') { this.setState('ability_u_pull'); if(typeof soundManager !== 'undefined') soundManager.play('gojoBlue'); }
                    else if (this.copiedTechnique === 'Sukuna_U') { this.setState('ability_u_sukuna'); if(typeof soundManager !== 'undefined') soundManager.play('sukunaSlash'); }
                    this.copyCharges--; if(this.copyCharges<=0) { this.copiedTechnique = 'NONE'; this.copiedTechniqueName = 'NONE'; } this.cooldowns['u'] = 50;
                }
                else { this.spMeter -= 20; this.setState('ability_u'); this.cooldowns['u'] = 80; this.velX = 0; } break;
            case 'ability_u_rika': this.spMeter -= 30; this.setState('ability_u_rika'); this.cooldowns['u'] = 60; break;
            case 'ability_u_pull': if(this.charName === 'Gojo') { this.spMeter -= 20; this.setState('ability_u_pull'); this.cooldowns['u'] = 50; if(typeof soundManager !== 'undefined') soundManager.play('gojoBlue'); } break;
            case 'ability_i': if (this.charName === 'Gojo') { if (this.spMeter >= 50 && Math.random() < 0.5) { this.spMeter -= 50; this.setState('ability_i_max'); this.cooldowns['i'] = 60; if(typeof soundManager !== 'undefined') soundManager.play('gojoRed'); } else { this.spMeter -= 30; this.setState('ability_i_tap'); this.cooldowns['i'] = 60; if(typeof soundManager !== 'undefined') soundManager.play('gojoRed'); } } else { this.spMeter -= 40; this.setState('ability_i'); this.cooldowns['i'] = 80; this.blackFlashSuccess = Math.random() < 0.3; } break;
            case 'ability_i_yuta_iai': if(!this.isUltimateActive()) { this.spMeter -= 35; this.setState('ability_i_yuta_iai'); this.cooldowns['i'] = 45;} break;
            case 'ability_o': if (this.charName === 'Gojo') { this.spMeter -= 40; this.setState('ability_o'); this.invulnTimer = 300; this.cooldowns['o'] = 450; gameEngine.projectiles.push(new CombatProjectile('infinity_shield', this.x, this.y, 1, this, false)); } else { this.spMeter -= 30; this.setState('ability_o'); this.cooldowns['o'] = 60; } break;
            case 'ability_o_rct_heal': if(this.charName === 'Yuta' && !this.isUltimateActive()){ this.spMeter = 0; this.setState('ability_o_rct_heal'); this.cooldowns['o'] = 120; this.health = Math.min(this.maxHealth, this.health + 250); } break;
            case 'ability_i_sukuna': this.spMeter -= 40; this.setState('ability_i_sukuna'); this.cooldowns['i'] = 80; if(typeof soundManager !== 'undefined') soundManager.play('sukunaSlash'); break;
            case 'ability_u_sukuna': this.spMeter -= 30; this.setState('ability_u_sukuna'); this.cooldowns['u'] = 80; break;
            case 'ability_o_sukuna': this.spMeter -= 50; this.setState('ability_o_sukuna'); this.cooldowns['o'] = 120; break;
            case 'run': this.setState('run'); this.velX = 2.0 * this.facingDir; break; default: this.setState('idle'); break;
            } return;
        }

        let keyA = ctrl.a; let keyD = ctrl.d; let justPressedA = inputs.keys[keyA] && inputs.holdDuration[keyA] === 1; let justPressedD = inputs.keys[keyD] && inputs.holdDuration[keyD] === 1;

        if (['idle', 'run', 'guarding'].includes(this.currentState) && !this.isGuardBroken) {
            if (justPressedA) { if (this.lastTap.key === keyA && gameEngine.frameCount - this.lastTap.time < 15 && (this.cooldowns['dash']||0)<=0) { this.setState('dash'); this.facingDir = -1; this.velX = -12; this.cooldowns['dash'] = 45; } this.lastTap = { key: keyA, time: gameEngine.frameCount }; }
            if (justPressedD) { if (this.lastTap.key === keyD && gameEngine.frameCount - this.lastTap.time < 15 && (this.cooldowns['dash']||0)<=0) { this.setState('dash'); this.facingDir = 1; this.velX = 12; this.cooldowns['dash'] = 45; } this.lastTap = { key: keyD, time: gameEngine.frameCount }; }
        }

        if (!this.isGuardBroken && inputs.keys[ctrl.s] && inputs.keys[ctrl.j] && (this.cooldowns['parry'] || 0) <= 0 && this.parryMeter >= 50 && ['idle','run','guarding'].includes(this.currentState)) {
            this.setState('parry_stance'); this.parryMeter -= 50; this.cooldowns['parry'] = 45; return;
        }

        if (this.currentState === 'ability_i' && this.charName === 'Yuji') { if (inputs.keys[ctrl.i] && inputs.holdDuration[ctrl.i] === 1 && this.stateFrameTimer >= 5 && this.stateFrameTimer <= 12) { this.blackFlashSuccess = true; gameEngine.particles.push(new ParticleEffect(this.x + 10*this.facingDir, this.y, 0, 0, '#000')); } }

        const canMelee =['idle', 'run', 'ability_u_pull'].includes(this.currentState) || this.canContinueCombo;

        if (canMelee) {
            if (inputs.keys[ctrl.j] && inputs.holdDuration[ctrl.j] === 1 && ((this.cooldowns['j'] || 0) <= 0 || this.canContinueCombo)) { 
                if (this.currentState === 'atk_j' && this.canContinueCombo) { this.comboCounter++; } else { this.comboCounter = 1; } this.currentState = 'atk_j'; this.stateFrameTimer = 0; this.blackFlashSuccess = false; this.canContinueCombo = false; if (this.comboCounter >= 4) this.cooldowns['j'] = 45; return; 
            }
            if (inputs.keys[ctrl.k] && inputs.holdDuration[ctrl.k] === 1 && (this.cooldowns['k'] || 0) <= 0) { this.setState('atk_k'); this.cooldowns['k'] = 15; return; }
            if (inputs.keys[ctrl.l] && inputs.holdDuration[ctrl.l] === 1 && (this.cooldowns['l'] || 0) <= 0) { this.setState('grab_l'); this.cooldowns['l'] = 40; return; }

            if (this.isTransformed && this.charName === 'Yuji') {
                if (inputs.keys[ctrl.u] && this.spMeter >= 30 && (this.cooldowns['u'] || 0) <= 0) { this.spMeter -= 30; this.setState('ability_u_sukuna'); this.cooldowns['u'] = 40; return; }
                if (inputs.keys[ctrl.i] && this.spMeter >= 40 && (this.cooldowns['i'] || 0) <= 0) { this.spMeter -= 40; this.setState('ability_i_sukuna'); this.cooldowns['i'] = 60; if(typeof soundManager !== 'undefined') soundManager.play('sukunaSlash'); return; }
                if (inputs.keys[ctrl.o] && this.spMeter >= 50 && (this.cooldowns['o'] || 0) <= 0) { this.spMeter -= 50; this.setState('ability_o_sukuna'); this.cooldowns['o'] = 120; return; }
                if (inputs.keys[ctrl.p] && inputs.holdDuration[ctrl.p] === 1) {
                    if (this.sukunaDomainBar >= 100) { this.sukunaDomainBar = 0; if(typeof triggerDomainExpansion !== 'undefined') triggerDomainExpansion(this); return; }
                } 
            } else if (this.charName === 'Gojo') {
                const activeBlue = gameEngine.projectiles.find(p => (p.type === 'blue_orb' || p.type === 'blue_orb_max') && p.owner === this && p.active);
                if (inputs.keys[ctrl.u] && !activeBlue && (this.cooldowns['u'] || 0) <= 0) { 
                    if (this.spMeter >= 50 && this.currentState !== 'charging_pose') { this.chargingKey = 'u'; this.mappedChargeKey = ctrl.u; this.chargeTimer = 0; this.setState('charging_pose'); this.velX = 0; return; } 
                }
                if (inputs.keys[ctrl.i] && (this.cooldowns['i'] || 0) <= 0) { 
                    if (this.spMeter >= 50 && this.currentState !== 'charging_pose') { this.chargingKey = 'i'; this.mappedChargeKey = ctrl.i; this.chargeTimer = 0; this.setState('charging_pose'); this.velX = 0; return; } 
                }
                if (inputs.keys[ctrl.o] && (this.cooldowns['o'] || 0) <= 0) { if (this.spMeter >= 100) { if(typeof startHollowPurpleSequence !== 'undefined') startHollowPurpleSequence(this); } else if (this.spMeter >= 40) { this.spMeter -= 40; this.setState('ability_o'); this.invulnTimer = 300; this.cooldowns['o'] = 450; gameEngine.projectiles.push(new CombatProjectile('infinity_shield', this.x, this.y, 1, this, false)); } return; }
            } else if (this.charName === 'Yuji') {
                if (inputs.keys[ctrl.u] && this.spMeter >= 20 && (this.cooldowns['u'] || 0) <= 0) { this.spMeter -= 20; this.setState('ability_u'); this.cooldowns['u'] = 80; this.velX = 0; return; }
                if (inputs.keys[ctrl.i] && this.spMeter >= 40 && (this.cooldowns['i'] || 0) <= 0) { this.spMeter -= 40; this.setState('ability_i'); this.cooldowns['i'] = 60; return; }
                if (inputs.keys[ctrl.o] && this.spMeter >= 30 && (this.cooldowns['o'] || 0) <= 0) { this.spMeter -= 30; this.setState('ability_o'); this.cooldowns['o'] = 60; return; }
            } else if (this.charName === 'Yuta') {
                if (this.isUltimateActive()) {
                    if (inputs.keys[ctrl.u] && this.copyCharges > 0 && this.spMeter >= 40 && (this.cooldowns['u'] || 0) <= 0) {
                        this.spMeter -= 40; this.setState('ability_u_yuta_domain'); this.cooldowns['u'] = 80; return;
                    }
                    if (inputs.keys[ctrl.i] && this.spMeter >= 30 && (this.cooldowns['i'] || 0) <= 0) {
                        this.spMeter -= 30; this.setState('ability_i_yuta_domain'); this.cooldowns['i'] = 60; return;
                    }
                    if (inputs.keys[ctrl.o] && this.spMeter >= 60 && (this.cooldowns['o'] || 0) <= 0) {
                        this.spMeter -= 60; this.setState('ability_o_yuta_domain'); this.cooldowns['o'] = 150; return;
                    }
                    if(inputs.keys[ctrl.p] && inputs.holdDuration[ctrl.p] === 1 && (this.cooldowns['rearm'] || 0) <= 0) {
                        this.setState('yuta_rearm'); this.cooldowns['rearm'] = 120; return;
                    }
                } else {
                    if (inputs.keys[ctrl.u] && (this.cooldowns['u'] || 0) <= 0) {
                        if (this.copyCharges > 0 && this.spMeter >= 20) {
                            this.spMeter -= 20;
                            if (this.copiedTechnique === 'Gojo_U') { this.setState('ability_u_pull'); if(typeof soundManager !== 'undefined') soundManager.play('gojoBlue'); } 
                            else if (this.copiedTechnique === 'Sukuna_U') { this.setState('ability_u_sukuna'); if(typeof soundManager !== 'undefined') soundManager.play('sukunaSlash'); }
                            this.cooldowns['u'] = 50; this.copyCharges--; 
                            if (this.copyCharges <= 0) { this.copiedTechnique = 'NONE'; this.copiedTechniqueName = 'NONE';}
                            return;
                        } else if (this.copyCharges <= 0 && this.spMeter >= 30) {
                            this.spMeter -= 30; this.setState('ability_u_rika'); this.cooldowns['u'] = 60;
                            return;
                        }
                    }
                    if (inputs.keys[ctrl.i] && this.spMeter >= 35 && (this.cooldowns['i'] || 0) <= 0) {
                        this.spMeter -= 35; this.setState('ability_i_yuta_iai'); this.cooldowns['i'] = 45; return;
                    }
                    if (inputs.keys[ctrl.o] && this.spMeter >= 100 && (this.cooldowns['o'] || 0) <= 0) {
                        this.spMeter = 0; this.setState('ability_o_rct_heal'); this.cooldowns['o'] = 120;
                        this.health = Math.min(this.maxHealth, this.health + 250); return;
                    }
                }
            }
        }

        const attackStates =['atk_j', 'atk_k', 'grab_l', 'ability_u_pull', 'ability_i_tap', 'ability_u', 'ability_u_max', 'ability_u_flurry', 'ability_u_sukuna', 'ability_u_rika', 'ability_u_yuta_domain', 'ability_i', 'ability_i_max', 'ability_i_sukuna', 'ability_i_yuta_iai', 'ability_i_yuta_domain', 'ability_o', 'ability_o_sukuna', 'ability_o_rct_heal', 'ability_o_yuta_domain', 'ability_ult', 'hollow_purple_charge', 'ability_hp_fire', 'counter_attack', 'parry_stance', 'dash', 'dead', 'bf_dash_teleport', 'bf_slow_punch', 'yuta_rearm'];
        if (attackStates.includes(this.currentState)) return;

        let isMoving = false, isGuarding = false;
        if (!this.isGuardBroken && inputs.keys[ctrl.s]) { isGuarding = true; this.guardHp -= 0.15; this.velX = 0; }
        else {
            if (inputs.keys[ctrl.w] && this.velY === 0 && this.y >= GROUND_Y - 30) this.velY = -10.5; let speed = CharacterStatsBase[this.charName].speed;
            if (inputs.keys[ctrl.a]) { this.velX = -speed; this.facingDir = -1; isMoving = true; } 
            if (inputs.keys[ctrl.d]) { this.velX = speed; this.facingDir = 1; isMoving = true; }
        }

        this.setState(isMoving ? 'run' : (isGuarding ? 'guarding' : 'idle'));

        if (inputs.keys[ctrl.p] && inputs.holdDuration[ctrl.p] === 1 && this.ultMeter >= 100) { 
            if (this.charName === 'Gojo' || this.charName === 'Yuta') {
                this.ultMeter = 0; if(typeof triggerUltimate !== 'undefined') triggerUltimate(this); 
            } else if (this.charName === 'Yuji' && !this.isTransformed) {
                this.setState('idle'); if(typeof triggerUltimate !== 'undefined') triggerUltimate(this);
            } 
        }
    }

    processHitDetection() {
        if (!['atk_j', 'atk_k', 'grab_l', 'ability_u', 'ability_u_flurry', 'ability_u_max', 'ability_u_sukuna', 'ability_u_rika', 'ability_u_yuta_domain', 'ability_i', 'ability_i_max', 'ability_i_sukuna', 'ability_o', 'ability_o_sukuna', 'ability_i_yuta_iai', 'ability_i_yuta_domain', 'ability_o_yuta_domain'].includes(this.currentState)) return; 
        
        let attackConfig = null;
        let opponent = gameEngine.roster[this.playerId === 0 ? 1 : 0];

        if(this.isTransformed && (this.currentState === 'atk_j' || this.currentState === 'atk_k')){ if (this.stateFrameTimer === 5) { attackConfig = { range: 65, damage: this.currentState === 'atk_k' ? 30 : 15, pushback: 5, isSukunaSlash: true, stunDuration: 40 }; } }

        if (!this.isTransformed && this.currentState === 'atk_j' && this.stateFrameTimer === 5) { this.performLightComboHit(); }
        if (!this.isTransformed && this.currentState === 'atk_k') { 
            if (this.charName === 'Yuta' && this.stateFrameTimer === 6) this.performComboHit();
            else if (this.charName !== 'Yuta' && this.stateFrameTimer === 5) this.performComboHit();
        }
        if (this.currentState === 'grab_l' && this.stateFrameTimer === 6) { attackConfig = { range: 25, damage: 20, pushback: 20, hitStop: 8, isUnblockable: true, isGrab: true }; }

        if (this.currentState === 'ability_u_max' && this.charName === 'Gojo') {
            if (this.stateFrameTimer === 15) { gameEngine.projectiles.push(new CombatProjectile('blue_orb_max', this.x, this.y, this.facingDir, this, true)); gameEngine.cameraShake += 5; }
        }
        if (this.currentState === 'ability_i_max' && this.charName === 'Gojo') {
            if (this.stateFrameTimer === 2) { 
                gameEngine.projectiles.push(new CombatProjectile('max_red_orb', this.x + (30*this.facingDir), this.y, this.facingDir, this, true)); 
                gameEngine.cameraShake += 10; 
            }
        }

        if (this.currentState === 'ability_u_yuta_domain') {
            if(this.stateFrameTimer === 10){
                switch(this.copiedTechnique){
                    case 'HOLLOW_PURPLE': if(typeof startHollowPurpleSequence !== 'undefined') startHollowPurpleSequence(this); break;
                    case 'LAPSE_BLUE': this.setState('ability_u_pull'); break;
                    case 'REVERSAL_RED': this.setState('ability_i_max'); break;
                    case 'DISMANTLE': this.setState('ability_u_sukuna'); break;
                }
                this.copyCharges = 0;
                this.copiedTechnique = "NONE";
                this.copiedTechniqueName = "NONE";
            }
        }

        if (this.currentState === 'ability_u_sukuna') { if (this.stateFrameTimer % 5 === 0 && this.stateFrameTimer <= 25) { gameEngine.projectiles.push(new CombatProjectile('sukuna_dismantle', this.x + 20*this.facingDir, this.y - 10 + (Math.random()*20), this.facingDir, this)); if(typeof soundManager !== 'undefined') soundManager.play('sukunaSlash'); } }
        if (this.currentState === 'ability_i_sukuna') { if (this.stateFrameTimer >= 5 && this.stateFrameTimer <= 30) { attackConfig = { range: 60, damage: 2, pushback: 0.1, hitStop: 1, isSukunaSlash: true, isMultiSlash: true, stunDuration: 40, spGainMod: 0.1 }; } if (this.stateFrameTimer === 31) { attackConfig = { range: 65, damage: 15, pushback: 10, hitStop: 6, isSukunaSlash: true, isBigSlash: true, stunDuration: 40, spGainMod: 0.5 }; } }
        if (this.currentState === 'ability_o_sukuna') { 
            if (this.stateFrameTimer === 30) { gameEngine.projectiles.push(new CombatProjectile('sukuna_fire_arrow', this.x + (30 * this.facingDir), this.y, this.facingDir, this)); } 
        }

        if (this.currentState === 'ability_u_rika') {
            if (this.stateFrameTimer === 10) {
                gameEngine.projectiles.push(new CombatProjectile('rika_punch', this.x, this.y, this.facingDir, this));
                gameEngine.cameraShake += 5;
            }
        }
        if (this.currentState === 'ability_i_yuta_iai') {
            if(this.stateFrameTimer === 4) { this.velX = 15 * this.facingDir; }
            if (this.stateFrameTimer >= 5 && this.stateFrameTimer <= 9) {
                attackConfig = { range: 60, damage: 4, pushback: 1, hitStop: 1, isYutaSlash: true, isMultiSlash: true };
            }
            if (this.stateFrameTimer === 10) { this.velX = 0; }
        }
        if(this.currentState === 'ability_i_yuta_domain') {
            if (this.stateFrameTimer === 10) {
                gameEngine.projectiles.push(new CombatProjectile('jacob_ladder_beam', opponent.x, 0, this.facingDir, this));
            }
        }
        if(this.currentState === 'ability_o_yuta_domain') {
            if (this.stateFrameTimer === 10) {
                gameEngine.projectiles.push(new CombatProjectile('true_love_beam_charge', this.x, this.y, this.facingDir, this));
            }
        }

        if (this.currentState === 'ability_u' && this.charName === 'Yuji') {
            if (this.stateFrameTimer < 25) {
                if (this.stateFrameTimer % 2 === 0) {
                    gameEngine.particles.push(new ParticleEffect(this.x + 10 * this.facingDir, this.y - 10, (Math.random()-0.5)*2, -Math.random()*4, '#0088ff', 'normal'));
                    gameEngine.particles.push(new ParticleEffect(this.x + 10 * this.facingDir, this.y - 10, (Math.random()-0.5)*2, -Math.random()*4, '#00ccff', 'normal'));
                }
            } else if (this.stateFrameTimer === 25) {
                gameEngine.cameraShake = 20; if(typeof soundManager !== 'undefined') soundManager.play('hitHeavy');
                for (let i = 0; i < 5; i++) { gameEngine.projectiles.push(new CombatProjectile('yuji_rock', this.x + 20 * this.facingDir, this.y + 30, this.facingDir, this)); }
                for (let i = 0; i < 8; i++) { gameEngine.particles.push(new ParticleEffect(this.x + 20*this.facingDir, this.y+35, (Math.random()-0.5)*15, (Math.random()-1)*7, '#777')); }
                attackConfig = { range: 45, damage: 25, pushback: 15, hitStop: 8, isLauncher: true, stunDuration: 40 };
            }
        }

        if (this.currentState === 'ability_u_flurry' && this.charName === 'Yuji') {
            let opponent = gameEngine.roster[this.playerId === 0 ? 1 : 0]; opponent.x = this.x + (30 * this.facingDir); opponent.setState('hit_stun');
            if (this.stateFrameTimer % 8 === 0 && this.stateFrameTimer < 48) { opponent.receiveDamage(5, 0, this, false); spawnHitSparks(opponent.x, opponent.y, '#fff', false); gameEngine.cameraShake = 3; }
            if (this.stateFrameTimer === 50) { opponent.receiveDamage(20, 15, this, false); spawnHitSparks(opponent.x, opponent.y, '#ff003c', true); gameEngine.cameraShake = 10; gameEngine.hitStopFrames = 8; }
        }

        if (this.currentState === 'ability_i' && this.charName === 'Yuji') {
            if (this.stateFrameTimer === 1) this.velX = 0;
            if (this.stateFrameTimer === 8) this.velX = 15 * this.facingDir;
            if (this.stateFrameTimer === 10 && (typeof bfMinigame === 'undefined' || !bfMinigame.isActive)) {
                if (this.blackFlashSuccess) { attackConfig = { range: 35, damage: 20, pushback: 0, hitStop: 5, isBlackFlash: true }; }
                else { attackConfig = { range: 30, damage: 15, pushback: 5, hitStop: 4, applyDivergent: true, stunDuration: 40 }; }
            }
        }

        if(attackConfig) this.performMeleeHit(attackConfig);
    }

    performMeleeHit(config) {
        let opponent = gameEngine.roster[this.playerId === 0 ? 1 : 0];
        if (opponent.currentState === 'parry_stance') { 
            if (this.currentState === 'atk_j' || this.currentState === 'atk_k') { 
                opponent.setState('idle'); 
                opponent.spMeter = Math.min(100, opponent.spMeter + 10); 
                gameEngine.hitStopFrames = 15; 
                gameEngine.cameraShake += 10; 
                spawnHitSparks(opponent.x + 10*opponent.facingDir, opponent.y, '#00ff55', true); 
                if(typeof soundManager !== 'undefined') soundManager.play('hitHeavy'); 
                this.setState('hit_stun'); 
                this.stateFrameTimer = -40; 
                return false; 
            } 
        }

        let hitboxX = (this.facingDir > 0) ? this.x : this.x - config.range;
        if(this.currentState === 'ability_i_yuta_iai') hitboxX = this.x - (config.range/2);

        let hitDetected = (opponent.x > hitboxX && opponent.x < hitboxX + config.range);

        if (hitDetected && Math.abs(this.y - opponent.y) < 45) {
            if (config.isGrab) { opponent.velY = -6; gameEngine.cameraShake += 5; }
            if (config.isUnblockable && opponent.currentState === 'guarding') { 
                gameEngine.hitStopFrames = 15; 
                gameEngine.cameraShake += 8; 
                opponent.guardHp -= 20; 
                opponent.receiveDamage(25, 6, this, true);
            } else {
                if (config.isBlackFlash && (typeof bfMinigame === 'undefined' || !bfMinigame.isActive)) { 
                    if(this.charName === 'Yuji'){ 
                        if(typeof bfMinigame !== 'undefined') bfMinigame.start(this); 
                        this.executeBlackFlashHit(false); return true; 
                    } 
                }

                gameEngine.hitStopFrames = config.hitStop || 3; opponent.stunTimer = config.stunDuration || 40;
                
                if (config.isBlackFlash) { 
                    gameEngine.screenFlash = { color: '#000', duration: 8, life: 8 }; gameEngine.impactFrame = 2; gameEngine.cameraShake += 15; spawnHitSparks(opponent.x, opponent.y, '', false, false, true); 
                } else if (config.isSukunaSlash) { 
                    if(!config.isMultiSlash) gameEngine.cameraShake += 2; spawnHitSparks(opponent.x, opponent.y, '', config.isBigSlash, true); 
                } else if (config.isYutaSlash) {
                    gameEngine.cameraShake += 3; spawnHitSparks(opponent.x, opponent.y, '#fff', config.isLauncher, false, false, true);
                } else { 
                    gameEngine.cameraShake += 2; spawnHitSparks(opponent.x, opponent.y + 5, '#fff', false); 
                }

                opponent.receiveDamage(config.damage, config.pushback, this, false, false, false, config.spGainMod || 1.0); 
                if (config.isLauncher) opponent.velY = -8; 
                if (config.applyDivergent) opponent.divergentFistTimer = 30; 
            } 
            return true; 
        } 
        return false; 
    }

    executeBlackFlashHit(isFinal) {
        let opponent = gameEngine.roster[this.playerId === 0 ? 1 : 0]; let dmg = 25 * (1 + (this.blackFlashBuff || 0) * 0.15); 
        if (isFinal) { 
            gameEngine.screenFlash = { color: '#000', duration: 15, life: 15 }; gameEngine.impactFrame = 4; gameEngine.cameraShake += 25; gameEngine.hitStopFrames = 45; 
            if(typeof showCinematicMessage !== 'undefined') showCinematicMessage("BLACK FLASH", "#ff0000", 60, 50); 
            spawnHitSparks(opponent.x, opponent.y, '', false, false, true); 
            opponent.receiveDamage(dmg * 2, 25, this, false); 
            opponent.velY = -8; this.setState('idle');
        } else { 
            gameEngine.screenFlash = { color: '#000', duration: 8, life: 8 }; gameEngine.impactFrame = 2; gameEngine.cameraShake += 10; gameEngine.hitStopFrames = 5; 
            spawnHitSparks(opponent.x, opponent.y, '', false, false, true); 
            opponent.receiveDamage(dmg, 0, this, false); 
            this.setState('ability_i'); this.stateFrameTimer = 11; this.velX = 0; 
        }
    }

    performLightComboHit() { 
        let isFinalHit = this.comboCounter >= 4; 
        let config = { range: 22, damage: isFinalHit ? 30 : 15, pushback: isFinalHit ? 18 : 0, hitStop: isFinalHit ? 12 : 3, isLauncher: isFinalHit, stunDuration: 40 }; 
        if (this.charName === 'Yuta') {
            config.range = 35; config.damage = isFinalHit ? 35 : 18; config.pushback = isFinalHit ? 20 : 0; config.isYutaSlash = true; this.velX = 6 * this.facingDir;
        } else {
            this.velX = 4 * this.facingDir;
        }
        let hitConnected = this.performMeleeHit(config); 
        if (hitConnected) this.velX = 0; 
    }

    performComboHit() { 
        let config = { range: 28, damage: 20, pushback: 5, hitStop: 3, stunDuration: 40 }; 
        if (this.charName === 'Yuta') {
            config.range = 50; config.damage = 30; config.pushback = 10; config.hitStop = 6; config.isYutaSlash = true; this.velX = 8 * this.facingDir;
        }
        
        if(this.charName === 'Yuji' && Math.random() < 0.10) { 
            let blackFlashConfig = { range: 35, damage: 90, pushback: 20, hitStop: 20, isBlackFlash: true, stunDuration: 40 }; 
            this.performMeleeHit(blackFlashConfig); 
        } else { 
            let hitC = this.performMeleeHit(config); 
            if (this.charName === 'Yuta' && hitC) this.velX = 0;
        } 
    }

    draw(ctx) {
        if (this.currentState === 'dead') return;

        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(this.x + 10, this.y + 30, 16, 4, 0, 0, Math.PI*2); ctx.fill();

        let centerX = Math.floor(this.x + 10); let centerY = Math.floor(this.y + 30); 

        if (this.charName === 'Gojo' && this.currentState === 'charging_pose') {
            let cp = Math.min(1, this.chargeTimer / 40); 
            let barX = centerX - 15;
            let barY = centerY - 75;
            ctx.fillStyle = '#222'; ctx.fillRect(barX, barY, 30, 6);
            ctx.fillStyle = this.chargingKey === 'u' ? '#00c3ff' : '#ff0033';
            ctx.fillRect(barX, barY, 30 * cp, 6);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, 30, 6);
        }

        ctx.translate(centerX, centerY); ctx.scale(this.facingDir, 1);
        let fArmX = 4, fArmY = 4, bArmX = -4, bArmY = 4; let fLegX = 4, fLegY = 0, bLegX = -6, bLegY = 0; let torsoLean = 0, headY = -24, bodyBounce = 0; const frame = this.stateFrameTimer;

        let swordAngle = -Math.PI / 6;

        if (this.charName === 'Yuta' && this.currentState === 'idle') {
            fArmX = 12; fArmY = 0; bArmX = -6; bArmY = 4; swordAngle = -Math.PI / 4;
        }

        if (this.currentState === 'run') { 
            bodyBounce = (gameEngine.frameCount % 12 < 6 ? -2 : 0); const isForwardSwing = (gameEngine.frameCount % 16 < 8); 
            fArmX = isForwardSwing ? -6 : 8; bArmX = isForwardSwing ? 6 : -6; fLegX = isForwardSwing ? -6 : 8; bLegX = isForwardSwing ? 8 : -8; headY += bodyBounce; 
            swordAngle = -Math.PI / 4 + Math.sin(gameEngine.frameCount*0.2)*0.1;
            if (this.charName === 'Yuta') { fArmX = 14; fArmY = 4; swordAngle = -Math.PI / 5 + Math.sin(gameEngine.frameCount*0.2)*0.1; }
        }
        else if (this.currentState === 'dash' || this.currentState === 'bf_dash_teleport' || this.currentState === 'ability_i_yuta_iai') { torsoLean = 15; headY += 4; fArmX = -10; bArmX = 15; fLegX = 10; bLegX = -10; swordAngle = 0; }
        else if (this.currentState === 'guarding') { fArmX = -5; fArmY = -12; bArmX = -2; bArmY = -10; torsoLean = -1; headY += 2; swordAngle = -Math.PI / 1.5; }
        else if (this.currentState === 'guard_broken' || this.currentState === 'hit_stun') { torsoLean = 4; headY -= 5; fArmX = -12; bArmX = -12; fArmY -= 4; bArmY -= 4; if (this.currentState === 'guard_broken') bLegX = -14; swordAngle = -Math.PI; }
        else if (this.currentState === 'atk_j' && frame > 2 && frame < 15) { 
            if(this.charName === 'Yuji') { if (this.comboCounter === 1) { fArmX = 20; fArmY = -4; torsoLean = 2; } else if (this.comboCounter === 2) { fArmX = 18; fArmY = -10; torsoLean = -4; } else if (this.comboCounter === 3) { fLegX = 22; fLegY = 0; torsoLean = -5; headY += 4; } else if (this.comboCounter >= 4) { torsoLean = -8; bArmX = 25; bArmY = -10; fArmY = 0; bLegX = -10; fLegX = 10; } 
            } else if (this.charName === 'Gojo') { if (this.comboCounter === 1) { fArmX = 22; fArmY = -6; torsoLean = 1; } else if (this.comboCounter === 2) { bArmX = 20; bArmY = -4; torsoLean = -1; } else if (this.comboCounter === 3) { fLegX = 18; fLegY = -2; torsoLean = -2; headY += 2; } else if (this.comboCounter >= 4) { torsoLean = -4; fArmX = 25; fArmY = -8; fLegX = 5; } 
            } else if (this.charName === 'Yuta') { 
                if (this.comboCounter === 1) { fArmX = 15; fArmY = -5; torsoLean = 4; swordAngle = Math.PI / 4; } 
                else if (this.comboCounter === 2) { fArmX = 20; fArmY = 10; torsoLean = 6; swordAngle = Math.PI / 1.5; } 
                else if (this.comboCounter === 3) { fArmX = 5; fArmY = -15; torsoLean = -2; headY -= 2; swordAngle = -Math.PI / 4; } 
                else if (this.comboCounter >= 4) { torsoLean = -4; bArmX = -8; bArmY = -5; fArmX = 10; fArmY = -25; fLegX = 10; swordAngle = -Math.PI / 1.2; } 
            } else { if (this.comboCounter === 1) { fArmX = 20; fArmY = -4; torsoLean = 2; } else if (this.comboCounter === 2) { bArmX = 20; bArmY = -4; torsoLean = -2; } else if (this.comboCounter === 3) { fLegX = 22; torsoLean = -5; headY += 4; } else if (this.comboCounter >= 4) { torsoLean = -8; bArmX = 25; bArmY = -2; bLegX = -10; fLegX = 10; } } }
        else if (this.currentState === 'atk_k') { 
            if (this.charName === 'Yuta') {
                if (frame < 6) { fArmX = -10; fArmY = -20; torsoLean = -8; swordAngle = -Math.PI / 1.2; }
                else { fArmX = 25; fArmY = 5; fLegX = 15; torsoLean = 10; headY += 2; swordAngle = Math.PI / 3; }
            } else {
                if (this.comboCounter % 2 === 1 && frame > 2 && frame < 8) { fArmX = 20; fArmY = -4; torsoLean = 2; } else if (frame > 2 && frame < 14) { fArmX = -6; fArmY = -8; fLegX = 22; torsoLean = -5; headY += 4; } 
            }
        }
        else if (this.currentState === 'grab_l') { if (frame < 6) { fArmX = 15; fArmY = -5; torsoLean = 3; } else { fArmX = 4; fArmY = 15; torsoLean = -5; swordAngle = -Math.PI/4; } }
        else if (this.currentState === 'ability_u' && this.charName === 'Yuji') { if (frame < 25) { torsoLean = 5; fArmX = 15; fArmY = 0; bArmX = 10; bArmY = -5; headY += 2; bodyBounce = 2; } else { torsoLean = 15; fArmX = 15; fArmY = 20; bArmX = 10; bArmY = 20; headY += 8; bodyBounce = 4; } }
        else if (this.currentState === 'ability_u' && this.charName === 'Gojo') { fArmX = 18; fArmY = -10; bArmX = -2; bArmY = 0; torsoLean = 8; headY -= 2; bodyBounce = -6; fLegX = 6; bLegX = -2; }
        else if (this.currentState === 'ability_u_max' && this.charName === 'Gojo') { fArmX = 18; fArmY = -25; bArmX = 5; bArmY = -20; torsoLean = -8; headY -= 4; bodyBounce = -4; fLegX = 8; bLegX = -4; }
        else if (this.currentState === 'ability_i_max' && this.charName === 'Gojo') { if(frame<15) { fArmX = 25; fArmY = -5; bArmX = -10; bArmY = 5; torsoLean = 12; bodyBounce = 2; headY += 2; fLegX = 12; bLegX = -10; } }
        else if (this.currentState === 'ability_hp_fire' && this.charName === 'Gojo') { fArmX = 35; fArmY = -5; bArmX = -8; bArmY = -2; torsoLean = 10; headY += 4; bodyBounce = 4; fLegX = 15; bLegX = -10; }
        else if (this.currentState === 'ability_u_flurry' && this.charName === 'Yuji') { torsoLean = 4; if (frame % 6 < 3) { fArmX = 20; fArmY = -4; bArmX = -4; bArmY = 4; } else { fArmX = 4; fArmY = 4; bArmX = 20; bArmY = -4; } }
        else if (this.currentState === 'ability_u_rika') { fArmX = 20; fArmY = -10; bArmX = -5; bArmY = 5; torsoLean = 5; swordAngle = Math.PI/6; }
        else if (this.currentState === 'ability_i' && this.charName === 'Yuji') { if (frame < 8) { fArmX = -4; fArmY = 8; torsoLean = -5; } else { fArmX = 16; fArmY = -4; torsoLean = 5; } }
        else if (this.currentState === 'bf_slow_punch') { let progress = frame/30; fArmX = -4 + progress * 20; fArmY = 8 - progress * 12; torsoLean = -5 + progress * 10; }
        else if (this.currentState === 'ability_o' && this.charName === 'Yuji') { fArmX = -8; fArmY = -12; bArmX = -2; bArmY = -14; torsoLean = 2; headY += 2; }
        else if (this.currentState === 'counter_attack') { fArmX = 25; fArmY = -8; bArmX = -10; bArmY = 10; torsoLean = 8; headY += 2; }
        else if (this.currentState === 'ability_i_sukuna') { if (frame > 2 && frame < 30) { fArmX = 22 + Math.random()*5; fArmY = Math.random()*10 - 5; bArmX = 20; bArmY = 8; torsoLean = 4; } }
        else if (this.currentState === 'ability_u_sukuna') { fArmX = 16; fArmY = -15 + (Math.random()*10); bArmX = 10; bArmY = -5; torsoLean = 2; }
        else if (this.currentState === 'ability_o_sukuna') { 
            if (frame < 30) {
                fArmX = 16; fArmY = -12; bArmX = -10; bArmY = -12; torsoLean = 2; 
                let chargeR = frame / 30;
                
                ctx.save(); ctx.translate(fArmX + torsoLean, fArmY + bodyBounce);
                ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(20*chargeR, 0, 0, 40); ctx.strokeStyle = `rgba(255, 68, 0, ${chargeR})`; ctx.lineWidth = 4; ctx.stroke();
                ctx.translate(-20 * chargeR, 0);
                
                ctx.globalCompositeOperation = 'lighter';
                let fA_glow = ctx.createRadialGradient(20, 0, 0, 10, 0, 30 + 20*chargeR);
                fA_glow.addColorStop(0, `rgba(255, 255, 200, ${chargeR})`);
                fA_glow.addColorStop(0.3, `rgba(255, 150, 0, ${chargeR*0.8})`);
                fA_glow.addColorStop(1, "rgba(0, 0, 0, 0)");
                ctx.fillStyle = fA_glow; ctx.fillRect(-40, -50, 100, 100);
                ctx.globalCompositeOperation = 'source-over';
                let scaleArr = 0.5 + 0.5*chargeR; ctx.scale(scaleArr, scaleArr);
                
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(15, -15); ctx.lineTo(20, 0); ctx.lineTo(15, 15); ctx.fill();
                ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(5, -25); ctx.lineTo(-10, -10); ctx.lineTo(-30, -15); ctx.lineTo(-20, 0); ctx.lineTo(-30, 15); ctx.lineTo(-10, 10); ctx.lineTo(5, 25); ctx.fill();
                ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(10, -10); ctx.lineTo(-15, 0); ctx.lineTo(10, 10); ctx.fill();
                ctx.restore();
            } else {
                fArmX = 25; fArmY = -5; torsoLean = 6;
            }
        }
        else if (this.currentState === 'ability_i_tap' && this.charName === 'Gojo') { fArmX = 8; fArmY = -12; bArmX = -2; bArmY = 2; torsoLean = 6; headY += 4; }
        else if (this.currentState === 'ability_u_pull' && (this.charName === 'Gojo' || this.charName === 'Yuta')) { fArmX = 12; fArmY = -5; bArmX = -2; bArmY = -8; torsoLean = 3; headY+=1; swordAngle = -Math.PI/4; }
        else if (this.currentState === 'ability_i_yuta_iai') { if(frame < 5){ torsoLean = -10; fArmX = -5; fArmY = 5; bArmX = 0; bArmY = 5; swordAngle = -Math.PI/2;} else if(frame > 10){ torsoLean = 10; fArmX = 20; fArmY = 0; swordAngle = Math.PI/2;} }
        else if (this.currentState === 'ability_o_rct_heal') { fArmX = 0; fArmY = -10; bArmX = 0; bArmY = -10; torsoLean = 0; headY -= 2; }
        else if (this.currentState === 'ability_i_yuta_domain') { fArmX = 15; fArmY = -25; torsoLean = -5; headY -= 5; swordAngle = -Math.PI / 1.5; }
        else if (this.currentState === 'ability_o_yuta_domain') { if (frame < 100) { fArmX = 10; fArmY = -15; bArmX = 10; bArmY = -15; torsoLean = 0; } else { fArmX=25; fArmY=-5; torsoLean=5; }}
        else if (this.currentState === 'yuta_rearm') { if (frame < 20) { fArmX = 10; fArmY = 15; torsoLean=5; swordAngle = -Math.PI/2; } else { fArmX = 10; fArmY = 0; torsoLean = 0; swordAngle = -Math.PI/4; }}
        else if (this.currentState === 'parry_stance') { fArmX = 15; fArmY = -12; bArmX = -5; bArmY = 15; torsoLean = -5; headY += 2; }
        else if (this.currentState === 'domain_chant') { fArmX = 4; fArmY = -12; bArmX = 10; bArmY = -12; torsoLean = -2; headY += 2; }

        if (this.currentState === 'charging_pose' || this.currentState === 'hollow_purple_charge') { fArmX = 8; fArmY = -12; bArmX = 8; bArmY = -12; torsoLean = -1; bodyBounce = (gameEngine.frameCount % 4 < 2 ? -1 : 0); }

        if (gameEngine.introTimer > 0) {
            if (this.charName === 'Gojo') {
                torsoLean = -10; fArmX = 15; fArmY = -25; bArmX = -15; bArmY = 25; headY -= 2;
            } else if (this.charName === 'Yuta') {
                torsoLean = 5; fArmX = -10; fArmY = -5; bArmX = 15; bArmY = 10; swordAngle = -Math.PI/1.2;
            }
        }

        const stats = CharacterStatsBase[this.charName]; 
        const drawWithOutline = (color, x, y, w, h) => { ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

        if (this.charName === 'Yuta') { 
            drawWithOutline(stats.pantsColor, bLegX - 4, -4 + bodyBounce + bLegY, 7, 16); 
        } else { 
            drawWithOutline(stats.suitColor, bLegX - 4, -4 + bodyBounce + bLegY, 7, 16); 
            if (this.charName === 'Yuji') { ctx.fillStyle = '#ff254a'; ctx.fillRect(bLegX - 4, 9 + bodyBounce + bLegY, 7, 5); } 
            else { ctx.fillStyle = '#000'; ctx.fillRect(bLegX - 4, 9 + bodyBounce + bLegY, 7, 5); } 
        }

        ctx.strokeStyle = this.charName === 'Yuta' ? '#ffffff' : stats.suitColor; ctx.lineWidth = 4; ctx.beginPath(); 
        ctx.moveTo(-6, -4 + bodyBounce); ctx.lineTo(bArmX, bArmY + bodyBounce); ctx.stroke(); 
        ctx.fillStyle = '#ffcca6'; ctx.fillRect(bArmX - 2, bArmY + bodyBounce - 2, 4, 4);

        if (this.charName === 'Yuta') { 
            drawWithOutline('#ffffff', -7 + torsoLean, -22 + bodyBounce, 15, 20); 
        } else if (this.charName === 'Yuji') { 
            drawWithOutline(stats.suitColor, -7 + torsoLean, -22 + bodyBounce, 15, 20); ctx.fillStyle = '#ff254a'; ctx.fillRect(-6 + torsoLean, -22 + bodyBounce, 13, 6); ctx.fillRect(-2 + torsoLean, -20 + bodyBounce, 5, 8); 
        } else { 
            drawWithOutline(stats.suitColor, -7 + torsoLean, -22 + bodyBounce, 15, 20); drawWithOutline('#14141e', -7 + torsoLean, -25 + bodyBounce, 14, 6); 
        }

        if (this.charName === 'Yuta') { 
            drawWithOutline(stats.pantsColor, fLegX - 3, -2 + bodyBounce + fLegY, 7, 16); 
        } else { 
            drawWithOutline(stats.suitColor, fLegX - 3, -2 + bodyBounce + fLegY, 7, 16); 
            if (this.charName === 'Yuji') { ctx.fillStyle = '#ff254a'; ctx.fillRect(fLegX - 3, 11 + bodyBounce + fLegY, 7, 5); } 
            else { ctx.fillStyle = '#000'; ctx.fillRect(fLegX - 3, 11 + bodyBounce + fLegY, 7, 5); } 
        }

        ctx.strokeStyle = this.charName === 'Yuta' ? '#ffffff' : stats.suitColor; ctx.lineWidth = 5; ctx.beginPath(); 
        ctx.moveTo(2 + torsoLean, -4 + bodyBounce); ctx.lineTo(fArmX + torsoLean, fArmY + bodyBounce); ctx.stroke(); 

        let fistX = fArmX + torsoLean; let fistY = fArmY + bodyBounce; 
        ctx.fillStyle = '#ffcca6'; ctx.fillRect(fistX - 2, fistY - 2, 5, 5);

        if (this.charName === 'Yuta') {
            ctx.save();
            ctx.translate(fistX, fistY);
            ctx.rotate(swordAngle);
            ctx.fillStyle = '#222'; ctx.fillRect(-2, -5, 4, 12);
            ctx.fillStyle = '#d4af37'; ctx.fillRect(-5, -6, 10, 3);
            ctx.fillStyle = '#e0e0e0';
            ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-1, -45); ctx.lineTo(0, -48); ctx.lineTo(1, -45); ctx.lineTo(2, -6); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -48); ctx.lineTo(1, -45); ctx.lineTo(1, -6); ctx.fill();
            ctx.restore();
        }

        if (this.currentState === 'ability_u_pull' && (this.charName === 'Gojo' || this.charName === 'Yuta')) {
            let chargeP = Math.min(1, frame / 15); ctx.save(); ctx.globalCompositeOperation = 'lighter';
            let pullGrad = ctx.createRadialGradient(fistX, fistY, 0, fistX, fistY, 30*chargeP); pullGrad.addColorStop(0,"#fff"); pullGrad.addColorStop(0.3, "#00c3ff"); pullGrad.addColorStop(1, "transparent");
            ctx.fillStyle = pullGrad; ctx.beginPath(); ctx.arc(fistX, fistY, 30*chargeP, 0, Math.PI*2); ctx.fill();
            for(let w=0; w<5; w++){ let px = fistX + (Math.random()-0.5)*40; let py = fistY + (Math.random()-0.5)*40; ctx.strokeStyle="#e6f7ff"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(fistX,fistY); ctx.stroke(); } ctx.restore();
        }

        if (this.currentState === 'charging_pose' && this.charName === 'Gojo' && this.chargingKey === 'i') {
            let chargeP = Math.min(1, this.chargeTimer / 40); ctx.save(); ctx.globalCompositeOperation = 'lighter';
            let cgGrad = ctx.createRadialGradient(fistX, fistY, 0, fistX, fistY, 50 * chargeP); cgGrad.addColorStop(0, '#fff'); cgGrad.addColorStop(0.2, '#ff0033'); cgGrad.addColorStop(1, 'transparent'); ctx.fillStyle = cgGrad; ctx.beginPath(); ctx.arc(fistX, fistY, 50*chargeP, 0, Math.PI*2); ctx.fill();
            
            ctx.translate(fistX, fistY);
            for(let z=0; z<3; z++) { 
                ctx.save(); 
                let pulse = Math.sin(gameEngine.frameCount * 0.5 + z) * 4 * chargeP;
                ctx.rotate(gameEngine.frameCount*0.15 * (z%2===0?1:-1) + z*(Math.PI/2)); 
                
                ctx.beginPath(); ctx.strokeStyle = `rgba(255, 50, 50, ${0.8*chargeP})`; ctx.lineWidth = 5 * chargeP; 
                ctx.ellipse(0, 0, (70 * chargeP) + pulse, 15 * chargeP, Math.PI/4 + z, 0, Math.PI*2); ctx.stroke(); 
                
                ctx.beginPath(); ctx.strokeStyle = `rgba(255, 255, 255, ${0.9*chargeP})`; ctx.lineWidth = 1.5 * chargeP; 
                ctx.ellipse(0, 0, (70 * chargeP) + pulse, 15 * chargeP, Math.PI/4 + z, 0, Math.PI*2); ctx.stroke(); 
                ctx.restore(); 
            } 
            ctx.restore();
        }

        if ((this.currentState === 'ability_i' || this.currentState === 'bf_slow_punch') && this.charName === 'Yuji') {
            let bfAura = this.blackFlashSuccess || this.currentState === 'bf_slow_punch'; let slowPunchProgress = this.currentState === 'bf_slow_punch' ? (this.stateFrameTimer / 30) : 1;
            if (bfAura && (this.currentState !== 'bf_slow_punch' || this.stateFrameTimer > 5)) {
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath(); ctx.moveTo(2 + torsoLean, -4 + bodyBounce); 
                    for(let j=0; j<4; j++) { let p = (j+1)/4; let armX = (2 + torsoLean) * (1-p) + fistX * p; let armY = (-4 + bodyBounce) * (1-p) + fistY * p; let boltX = armX + (Math.random() - 0.5) * 15 * slowPunchProgress; let boltY = armY + (Math.random() - 0.5) * 15 * slowPunchProgress; ctx.lineTo(boltX, boltY); }
                    ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 4 * slowPunchProgress; ctx.stroke(); ctx.strokeStyle = '#000000'; ctx.lineWidth = 2 * slowPunchProgress; ctx.stroke();
                }
            } else if (!bfAura) {
                ctx.globalAlpha = 0.6; let flicker = Math.sin(gameEngine.frameCount * 0.5) * 3; let fWidth = 14 + flicker; let fHeight = 22 + flicker * 1.5; ctx.fillStyle = '#00c3ff';
                ctx.beginPath(); ctx.moveTo(fistX, fistY + 4); ctx.quadraticCurveTo(fistX + fWidth, fistY + 4, fistX + fWidth/2, fistY - fHeight/2); ctx.quadraticCurveTo(fistX, fistY - fHeight, fistX - fWidth/2, fistY - fHeight/2); ctx.quadraticCurveTo(fistX - fWidth, fistY + 4, fistX, fistY + 4); ctx.fill(); ctx.fillStyle = '#e6f7ff';
                ctx.beginPath(); ctx.moveTo(fistX, fistY + 2); ctx.quadraticCurveTo(fistX + fWidth/2, fistY + 2, ctx.fistX + fWidth/4, fistY - fHeight/3); ctx.quadraticCurveTo(fistX, fistY - fHeight/1.5, fistX - fWidth/4, fistY - fHeight/3); ctx.quadraticCurveTo(fistX - fWidth/2, fistY + 2, fistX, fistY + 2); ctx.fill(); if (gameEngine.frameCount % 3 === 0) { gameEngine.particles.push(new ParticleEffect(fistX + (Math.random()-0.5)*8, fistY - 5, 0, -2, '#00c3ff')); } ctx.globalAlpha = 1;
            }
        }
        drawWithOutline('#ffcca6', -7 + torsoLean, headY, 14, 14);

        if (this.charName === 'Yuji') { ctx.fillStyle = stats.hairColor; ctx.fillRect(-9 + torsoLean, headY - 4, 18, 6); ctx.fillRect(-8 + torsoLean, headY - 8, 4, 4); ctx.fillRect(-2 + torsoLean, headY - 7, 5, 3); ctx.fillRect(5 + torsoLean, headY - 8, 4, 4); if (this.isTransformed) { ctx.fillStyle = '#111'; ctx.fillRect(-7 + torsoLean, headY + 2, 14, 2); ctx.fillRect(-5 + torsoLean, headY - 2, 3, 3); ctx.fillRect(2 + torsoLean, headY - 2, 3, 3); ctx.fillRect(-8 + torsoLean, headY + 6, 4, 2); ctx.fillRect(4 + torsoLean, headY + 6, 4, 2); } else { ctx.fillStyle = '#223042'; ctx.fillRect(torsoLean, headY + 2, 3, 3); ctx.fillRect(torsoLean + 6, headY + 2, 3, 3); } } 
        else if (this.charName === 'Yuta') { ctx.fillStyle = stats.hairColor; ctx.fillRect(-9 + torsoLean, headY - 6, 18, 8); ctx.fillRect(-10 + torsoLean, headY - 10, 6, 6); drawWithOutline('#04040a', -9 + torsoLean, headY + 1, 18, 6); } 
        else { ctx.fillStyle = stats.hairColor; ctx.fillRect(-9 + torsoLean, headY - 10, 18, 12); ctx.fillRect(-10 + torsoLean, headY - 14, 6, 6); ctx.fillRect(-2 + torsoLean, headY - 16, 6, 8); ctx.fillRect(6 + torsoLean, headY - 13, 5, 5); drawWithOutline('#04040a', -9 + torsoLean, headY + 1, 18, 6); }

        if (this.currentState === 'guarding' || this.currentState === 'parry_stance') { ctx.fillStyle = this.currentState === 'parry_stance' ? 'rgba(0, 255, 100, 0.6)' : 'rgba(255, 200, 0, 0.5)'; for (let xOffset = -10; xOffset < 15; xOffset += 5) { for (let yOffset = -30; yOffset < 10; yOffset += 5) { if (Math.random() > 0.3) { ctx.fillRect(xOffset, yOffset, 3, 3); } } } }
        ctx.restore();
    }
}
