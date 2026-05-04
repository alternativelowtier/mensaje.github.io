let isRebinding = null; 
const keybinds = { p1: { up: 'w', down: 's', left: 'a', right: 'd', light: 'j', heavy: 'k', grab: 'l', ab1: 'u', ab2: 'i', ab3: 'o', ult: 'p' }, p2: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', light: 'm', heavy: 'n', grab: 'b', ab1: 'v', ab2: 'c', ab3: 'x', ult: 'z' } };

function buildKeybinds() {
    const keys =['up', 'down', 'left', 'right', 'light', 'heavy', 'grab', 'ab1', 'ab2', 'ab3', 'ult']; const labels =['Jump', 'Guard', 'Move Left', 'Move Right', 'Light Atk', 'Heavy Atk', 'Grab', 'Ability 1', 'Ability 2', 'Ability 3', 'Ultimate']; const container = document.getElementById('keybinds-container'); container.innerHTML = '';
    for (let p = 1; p <= 2; p++) {
        let div = document.createElement('div'); div.innerHTML = `<h3 style="color:${p===1?'#00ddff':'#ff8800'};">Player ${p} Controls</h3>`;
        keys.forEach((k, i) => { div.innerHTML += `<div class="settings-row"><span>${labels[i]}:</span><button id="p${p}_${k}" class="keybind-btn" onclick="startKeyRebind(${p}, '${k}')">${keybinds[`p${p}`][k].replace('arrow','')}</button></div>`; }); container.appendChild(div);
    }
} 
buildKeybinds();

function startKeyRebind(player, action) { if (isRebinding) return; const btn = document.getElementById(`p${player}_${action}`); isRebinding = { player, action, element: btn }; btn.textContent = '...'; btn.classList.add('listening'); }

window.addEventListener('keydown', (e) => {
    if (isRebinding) { e.preventDefault(); const { player, action, element } = isRebinding; const key = e.key.toLowerCase(); if(key === 'escape') { element.textContent = keybinds[`p${player}`][action].replace('arrow',''); } else { keybinds[`p${player}`][action] = key; element.textContent = key.replace('arrow',''); } element.classList.remove('listening'); isRebinding = null; }
});

const inputs = { keys: {}, holdDuration: {} };

window.addEventListener("keydown", function(e) {
    if (isRebinding) return; let key = e.key.toLowerCase();
    if (key === "escape" && gameEngine.isRunning) { gameEngine.isRunning = false; soundManager.stopLoop(); menuSystem.switchScreen('menu-main'); }
    if (key === ' ' && typeof domainClashSystem !== 'undefined' && domainClashSystem.isActive) { domainClashSystem.scoreP1 += 4; }
    if (key === 'enter' && typeof domainClashSystem !== 'undefined' && domainClashSystem.isActive && gameMode === 'local') { domainClashSystem.scoreP2 += 4; }
    if (key === 'h' && gameMode === 'training' && gameEngine.isRunning && gameEngine.roster[0]) { gameEngine.roster[0].spMeter = 100; gameEngine.roster[0].ultMeter = 100; gameEngine.roster[0].parryMeter = 100; }
    
    if (!inputs.keys[key]) {
        inputs.keys[key] = true; inputs.holdDuration[key] = 1;
        gameEngine.roster.forEach(p => {
            let uKey = p.playerId === 0 ? keybinds.p1.ab1 : keybinds.p2.ab1;
            if (p.charName === 'Gojo' && key === uKey) {
                const detonatableBlue = gameEngine.projectiles.find(proj => (proj.type === 'blue_orb' || proj.type === 'blue_orb_max') && proj.owner === p && proj.active);
                if (detonatableBlue) {
                    detonatableBlue.active = false; gameEngine.cameraShake += 6; gameEngine.projectiles.push(new CombatProjectile('blue_explosion', detonatableBlue.x, detonatableBlue.y, 1, p, false)); let opponent = gameEngine.roster[p.playerId === 0 ? 1 : 0]; if (Math.abs(detonatableBlue.x - opponent.x) < 45) { opponent.receiveDamage(35, 4, p, false); } p.cooldowns['u'] = 20;
                }
            }
        });
    }
});

window.addEventListener("keyup", function(e) {
    if (isRebinding) return; let key = e.key.toLowerCase(); inputs.keys[key] = false; inputs.holdDuration[key] = 0;
});
