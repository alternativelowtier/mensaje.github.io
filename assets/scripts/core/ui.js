let gameMode = 'versus'; let lastPlayerChar = 'Yuji'; let lastCpuChar = 'Yuta'; let lastMap = 'rooftop';
let currentSelectionState = 1; 

const gameConfig = { useCRTEffect: false, toggleCRT: function() { this.useCRTEffect = document.getElementById("setting-crt-checkbox").checked; document.getElementById("crt-layer-overlay").style.display = this.useCRTEffect ? "block" : "none"; } };

const menuSystem = {
    switchScreen: function(targetId, data) {
        soundManager.play('menuClick'); 
        document.querySelectorAll('.screen-ui').forEach(el => el.classList.remove('active')); 
        document.getElementById('combat-hud').classList.remove('active'); 
        document.getElementById('game-canvas').classList.remove('active');
        if (targetId === 'start_gameplay') { 
            document.getElementById('combat-hud').classList.add('active'); 
            document.getElementById('game-canvas').classList.add('active'); 
        } else { 
            document.getElementById(targetId).classList.add('active'); 
        }
    }
};

function initSelectMenu(mode) {
    gameMode = mode; currentSelectionState = 1;
    document.getElementById('char-select-title').innerText = (mode === 'local') ? "PLAYER 1 SELECT" : "SELECT SORCERER";
    document.getElementById('char-select-title').style.color = "#00d4ff";
    menuSystem.switchScreen('menu-character-select');
}

function handleCharacterPick(charName) {
    soundManager.play('menuClick');
    if (currentSelectionState === 1) {
        lastPlayerChar = charName;
        if (gameMode === 'local') { currentSelectionState = 2; document.getElementById('char-select-title').innerText = "PLAYER 2 SELECT"; document.getElementById('char-select-title').style.color = "#ff3333";
        } else { menuSystem.switchScreen('menu-map-select'); }
    } else { lastCpuChar = charName; menuSystem.switchScreen('menu-map-select'); }
}

function updateHUD() { 
    for (let player of gameEngine.roster) { 
        let id = player.playerId + 1; 
        document.getElementById(`hud-hp-p${id}`).style.width = Math.max(0, (player.health / player.maxHealth) * 100) + '%'; 
        let guardBar = document.getElementById(`hud-guard-p${id}`); 
        guardBar.style.width = player.guardHp + '%'; 
        guardBar.style.background = player.isGuardBroken ? '#555' : '#ffcc00'; 
        document.getElementById(`hud-parry-p${id}`).style.width = player.parryMeter + '%'; 
        document.getElementById(`hud-sp-p${id}`).style.width = player.spMeter + '%'; 

        let domainContainer = document.getElementById(`hud-sukuna-domain-container-p${id}`);
        let domainFill = document.getElementById(`hud-sukuna-domain-p${id}`);
        let yutaContainer = document.getElementById(`hud-yuta-copy-container-p${id}`);
        let yutaText = document.getElementById(`hud-yuta-copy-text-p${id}`);
        let ultBar = document.getElementById(`hud-ult-p${id}`);

        if (player.charName === 'Yuji' && player.isTransformed) {
            domainContainer.style.display = 'block';
            domainFill.style.width = player.sukunaDomainBar + '%';
            yutaContainer.style.display = 'none';
            ultBar.style.width = '100%';
            ultBar.style.background = '#444';
        } else if (player.charName === 'Yuta') {
            domainContainer.style.display = 'none';
            yutaContainer.style.display = 'block';
            yutaText.innerText = "COPY: " + player.copiedTechniqueName.toUpperCase();
            
            let copyPct = player.isUltimateActive() ? 100 : ((player.copyCharges || 0) * 50);
            let copyFill = document.getElementById(`hud-yuta-copy-p${id}`);
            copyFill.style.width = copyPct + '%';
            copyFill.style.opacity = copyPct > 0 ? '1' : '0.3';

            ultBar.style.width = player.ultMeter + '%';
            ultBar.style.background = '#a200ff';
        } else {
            domainContainer.style.display = 'none';
            yutaContainer.style.display = 'none';
            ultBar.style.width = player.ultMeter + '%';
            ultBar.style.background = '#a200ff';
        }
    } 
}

function showCinematicMessage(text, color, duration, size = 40) { gameEngine.cinematicText = { text, color, duration, life: duration, size }; }
