const domainExpansionSystem = { isActive: false, timer: 0, casterPlayerId: -1, currentStep: 0, domainType: 'void', floatingMathSymbols: [], shards:[], galaxyLines: null, splats: null, voidStreaks: null,
getShatterTime: function() {
    if(this.domainType === 'void') return 1160;
    if(this.domainType === 'shrine') return 600;
    if(this.domainType === 'yuta') return 1200; 
    return 600;
},
getEndTime: function() {
    return this.getShatterTime() + 180;
}
};

const hollowPurpleSystem = { isActive: false, timer: 0, step: 0, owner: null };

const domainClashSystem = {
isActive: false, timer: 0, player1: null, player2: null, scoreP1: 50, scoreP2: 50,
startClash: function(p1, p2) { this.isActive = true; this.timer = 0; this.player1 = p1; this.player2 = p2; this.scoreP1 = 50; this.scoreP2 = 50; domainExpansionSystem.isActive = false; hollowPurpleSystem.isActive = false; },
update: function() { if (!this.isActive) return; this.timer++; if (this.player1.isCpu && Math.random() < 0.25) this.scoreP1 += 2; if (this.player2.isCpu && Math.random() < 0.25) this.scoreP2 += 2; if (this.timer >= 300) this.endClash(); },
endClash: function() {
this.isActive = false; let p1Wins = this.scoreP1 >= this.scoreP2; let winner = p1Wins ? this.player1 : this.player2; let loser = p1Wins ? this.player2 : this.player1;
domainExpansionSystem.casterPlayerId = winner.playerId; domainExpansionSystem.domainType = winner.charName === 'Gojo' ? 'void' : (winner.charName === 'Yuta' ? 'yuta' : 'shrine'); domainExpansionSystem.isActive = true; domainExpansionSystem.timer = 125; domainExpansionSystem.currentStep = 3;
loser.setState('hit_stun'); loser.receiveDamage(30, 0, winner, true); gameEngine.cameraShake = 30;
},
draw: function(ctx) {
if (!this.isActive) return; let ratio = this.scoreP1 / (this.scoreP1 + this.scoreP2); let splitX = LOG_W * ratio;
ctx.save(); ctx.beginPath(); ctx.rect(0, 0, splitX, LOG_H); ctx.clip(); drawDomainBackground(ctx, this.player1.charName === 'Gojo' ? 'void' : (this.player1.charName === 'Yuta' ? 'yuta' : 'shrine'), this.timer); this.player1.draw(ctx); ctx.restore();
ctx.save(); ctx.beginPath(); ctx.rect(splitX, 0, LOG_W - splitX, LOG_H); ctx.clip(); drawDomainBackground(ctx, this.player2.charName === 'Gojo' ? 'void' : (this.player2.charName === 'Yuta' ? 'yuta' : 'shrine'), this.timer); this.player2.draw(ctx); ctx.restore();
ctx.fillStyle = '#fff'; ctx.fillRect(splitX - 2, 0, 4, LOG_H); ctx.fillStyle = '#000'; ctx.fillRect(splitX - 1, 0, 2, LOG_H);
} };

function startHollowPurpleSequence(player) {
if (hollowPurpleSystem.isActive) return;
hollowPurpleSystem.isActive = true; hollowPurpleSystem.timer = 0; hollowPurpleSystem.step = 1; hollowPurpleSystem.owner = player; player.setState('hollow_purple_charge'); player.spMeter = 0; 
soundManager.play('hollow_purple'); soundManager.play('custom_voicemod');
let targetX = player.x + (40 * player.facingDir);
gameEngine.projectiles.push(new CombatProjectile('hp_blue_orb', targetX - (100 * player.facingDir), player.y - 15, 1 * player.facingDir, player)); 
gameEngine.projectiles.push(new CombatProjectile('hp_red_orb', targetX + (100 * player.facingDir), player.y - 15, -1 * player.facingDir, player));
}

function triggerUltimate(player) {
if (player.charName === 'Gojo' || player.charName === 'Yuta') { player.ultMeter = 0; triggerDomainExpansion(player);
} else { if (player.isTransformed) return; player.ultMeter = 0; player.sukunaDomainBar = 0; soundManager.play('sukunaTransform'); player.isTransformed = true; player.transformTimer = 40 * 60; document.getElementById(`hud-name-p${player.playerId+1}`).innerText = "SUKUNA"; showCinematicMessage("OVERTAKEN", "#ff003c", 150); }
}

function triggerDomainExpansion(player) {
const isGojo = player.charName === 'Gojo'; const isSukuna = player.isTransformed; const isYuta = player.charName === 'Yuta';
if (!isGojo && !isSukuna && !isYuta) return;

if (domainExpansionSystem.isActive && domainExpansionSystem.casterPlayerId !== player.playerId) {
    let activeTimer = domainExpansionSystem.timer; let canClash = activeTimer < (domainExpansionSystem.getShatterTime() - 120);
    if (!canClash) return; 
    let p1 = gameEngine.roster[0]; let p2 = gameEngine.roster[1]; if (isSukuna || isYuta) player.hasUsedDomain = true; domainClashSystem.startClash(p1, p2); return;
}
domainExpansionSystem.isActive = true; domainExpansionSystem.timer = 0; domainExpansionSystem.casterPlayerId = player.playerId; domainExpansionSystem.domainType = isGojo ? 'void' : (isYuta ? 'yuta' : 'shrine'); domainExpansionSystem.floatingMathSymbols =[];
player.setState('domain_chant');
if (isSukuna || isYuta) player.hasUsedDomain = true;
if (isGojo) soundManager.play('gojo_domain_expansion'); else soundManager.play('domainExpansion');
}

function drawDomainBackground(ctx, type, timer) {
if (type === 'void') {
    let pulse = Math.sin(timer * 0.05) * 0.1; let bhR = 38 * (1 + pulse);
    ctx.fillStyle = "#030610"; ctx.fillRect(0,0,LOG_W,LOG_H);
    ctx.globalCompositeOperation = 'lighter';
    let nebula = ctx.createLinearGradient(40, 180, 380, 60); nebula.addColorStop(0, "rgba(50,100,160,0)"); nebula.addColorStop(0.3, "rgba(80,140,210,0.15)"); nebula.addColorStop(0.5, "rgba(200,240,255,0.4)"); nebula.addColorStop(0.7, "rgba(80,140,210,0.15)"); nebula.addColorStop(1, "rgba(50,100,160,0)");
    ctx.fillStyle = nebula; ctx.beginPath(); ctx.ellipse(210, 120, 200, 60, -Math.PI/6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(210, 120, 100, 30, -Math.PI/6, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (!domainExpansionSystem.voidStreaks) { domainExpansionSystem.voidStreaks =[]; for(let i=0; i<30; i++) { domainExpansionSystem.voidStreaks.push({ x: Math.random()*LOG_W, y: Math.random()*LOG_H, w: Math.random()*15+2, h: Math.random()*1.5+0.5, opacity: Math.random()*0.8 }); } }
    ctx.save(); ctx.fillStyle = "#ffffff"; for(let s of domainExpansionSystem.voidStreaks) { ctx.globalAlpha = s.opacity + Math.sin((timer+s.x)*0.05)*0.2; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w, s.h, -Math.PI/5.5, 0, Math.PI*2); ctx.fill(); } ctx.restore();

    let haloR = bhR * 1.3; let outerGlow = ctx.createRadialGradient(210, 120, bhR, 210, 120, haloR*4);
    outerGlow.addColorStop(0, "#ffffff"); outerGlow.addColorStop(0.2, "rgba(140, 205, 250, 0.9)"); outerGlow.addColorStop(0.5, "rgba(45, 95, 150, 0.4)"); outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = outerGlow; ctx.beginPath(); ctx.arc(210, 120, haloR*4, 0, Math.PI*2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    
    ctx.save(); ctx.translate(210, 120); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(170, 220, 255, 0.9)"; ctx.beginPath(); ctx.arc(0, 0, haloR*1.15, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(110, 180, 230, 0.7)"; ctx.beginPath(); ctx.arc(0, 0, haloR*1.6, -Math.PI/2, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, haloR*1.4, Math.PI/3, Math.PI*1.5); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(70, 130, 180, 0.4)"; ctx.beginPath(); ctx.arc(0, 0, haloR*2.1, 0, Math.PI*2); ctx.stroke();
    let ringShade = ctx.createRadialGradient(0,0, haloR*0.7, 0,0, haloR*1.5); ringShade.addColorStop(0, "rgba(10, 25, 50, 0.6)"); ringShade.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = ringShade; ctx.beginPath(); ctx.arc(0, 0, haloR*1.5, 0, Math.PI*2); ctx.fill(); ctx.restore();

    ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(210, 120, bhR, 0, Math.PI*2); ctx.fill();
    
    if(!domainExpansionSystem.splats) domainExpansionSystem.splats =[];
    while(domainExpansionSystem.splats.length < 6) { 
        let isBlack = domainExpansionSystem.splats.filter(s=>s.color === '#000').length < 3; let cx, cy, rad, c;
        if(isBlack) { let angle = Math.random() * Math.PI*2; let dist = bhR * 1.5 + (Math.random()*30); cx = 210 + Math.cos(angle) * dist; cy = 120 + Math.sin(angle) * dist; rad = 5 + Math.random()*8; c = '#000'; } 
        else { cx = (Math.random() < 0.5 ? -10 + Math.random()*100 : 320 + Math.random()*100); cy = Math.random()*240; if (Math.random()<0.2) { cx=100+Math.random()*220; cy=20+Math.random()*200;} rad = 8 + Math.random()*15; c = '#fff'; }
        let sats =[]; for(let d=0; d<(Math.random()*5+2); d++){ sats.push({ ox: (Math.random()-0.5)*(rad*3), oy: (Math.random()-0.5)*(rad*3), r: Math.max(1, rad*0.2 + Math.random()*(rad*0.3)) }); }
        for(let d=0; d<3; d++){ sats.push({ slash: true, ox: (Math.random()-0.5)*(rad*4), oy: (Math.random()-0.5)*(rad*4), r: rad*1.5, angle: -Math.PI/6 + (Math.random()-0.5)*0.2 }); } domainExpansionSystem.splats.push({ color: c, baseRad: rad, x: cx, y: cy, sats: sats, life: 0, maxLife: 120 + Math.random()*80 });
    }
    for(let i=domainExpansionSystem.splats.length-1; i>=0; i--) {
        let sp = domainExpansionSystem.splats[i]; sp.life++; let progress = sp.life / sp.maxLife; let currentOpacity = Math.sin(progress * Math.PI); 
        if(progress >= 1) { domainExpansionSystem.splats.splice(i,1); continue; } ctx.save(); ctx.globalAlpha = Math.max(0, currentOpacity * 1.5); 
        if (sp.color === '#fff') { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 15; } ctx.fillStyle = sp.color; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.baseRad, 0, Math.PI*2); ctx.fill();
        for(let drop of sp.sats) { if (drop.slash && sp.color==='#fff') { ctx.save(); ctx.translate(sp.x + drop.ox, sp.y + drop.oy); ctx.rotate(drop.angle); ctx.beginPath(); ctx.ellipse(0, 0, drop.r, drop.r*0.1, 0, 0, Math.PI*2); ctx.fill(); ctx.restore(); } 
        else if (!drop.slash) { ctx.beginPath(); ctx.arc(sp.x + drop.ox, sp.y + drop.oy, drop.r, 0, Math.PI*2); ctx.fill(); } } ctx.restore();
    }
} else if (type === 'shrine') {
    let topBg = ctx.createLinearGradient(0, 0, 0, 135); topBg.addColorStop(0, "#3a0000"); topBg.addColorStop(0.5, "#880000"); topBg.addColorStop(1, "#0a0000"); ctx.fillStyle = topBg; ctx.fillRect(0, 0, LOG_W, 135); ctx.fillStyle = "rgba(10, 0, 0, 0.4)"; for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc(Math.random()*LOG_W, Math.random()*135, Math.random()*60, 0, Math.PI*2); ctx.fill(); }
    let botBg = ctx.createLinearGradient(0, 135, 0, LOG_H); botBg.addColorStop(0, "#002b36"); botBg.addColorStop(0.5, "#005c6a"); botBg.addColorStop(1, "#001f29"); ctx.fillStyle = botBg; ctx.fillRect(0, 135, LOG_W, 105); ctx.fillStyle = "rgba(0, 20, 30, 0.6)"; for (let i = 0; i < 40; i++) { ctx.fillRect(Math.random()*LOG_W, 135 + Math.random()*105, Math.random()*40, 2); }
    let waveScale = Math.sin(timer*0.05)*3;
    const drawPillars = (mirrored) => {
        let alpha = mirrored ? 0.35 : 1.0; let mFlip = mirrored ? -1 : 1; ctx.globalAlpha = alpha; ctx.fillStyle = "#010f14"; ctx.fillRect(30, 135, 30, mFlip*100 + waveScale); ctx.fillStyle = "rgba(0, 200, 255, 0.1)"; ctx.fillRect(55, 135, 5, mFlip*100 + waveScale); ctx.fillStyle = "#010f14"; ctx.fillRect(LOG_W-60, 135, 30, mFlip*100 + waveScale); ctx.fillStyle = "rgba(0, 200, 255, 0.1)"; ctx.fillRect(LOG_W-60, 135, 5, mFlip*100 + waveScale); ctx.globalAlpha = 1.0;
    };
    const drawShrine = (mirrored) => {
        let mFlip = mirrored ? -1 : 1; let cX = 210, cY = 135; let gAlpha = mirrored ? 0.3 : 1.0; ctx.save(); ctx.translate(cX, cY); ctx.scale(1, mFlip); ctx.globalAlpha = gAlpha;
        ctx.fillStyle = "#080404"; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-40, -100); ctx.lineTo(40, -100); ctx.lineTo(60, 0); ctx.fill(); ctx.fillStyle = "#ff1100"; ctx.beginPath(); ctx.moveTo(-50, -50); ctx.quadraticCurveTo(0, -40, 50, -50); ctx.lineTo(45, -55); ctx.quadraticCurveTo(0, -45, -45, -55); ctx.fill(); ctx.beginPath(); ctx.moveTo(-45, -95); ctx.quadraticCurveTo(0, -85, 45, -95); ctx.lineTo(40, -100); ctx.quadraticCurveTo(0, -90, -40, -100); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.shadowColor="#fff"; ctx.shadowBlur = 5; ctx.fillRect(-15, -40, 30, 10); ctx.shadowBlur = 0; ctx.fillStyle="#000"; for(let i=-12; i<15; i+=5){ ctx.fillRect(i, -38, 2, 8); ctx.fillRect(i, -30, 2, 4); } ctx.fillRect(-20, -32, 10, 2); ctx.fillRect(10, -32, 10, 2); ctx.fillStyle = "#220000"; ctx.fillRect(-45, 0, 15, -90); ctx.fillRect(30, 0, 15, -90); ctx.fillStyle = "#660000"; ctx.fillRect(-42, 0, 5, -88); ctx.fillRect(33, 0, 5, -88); ctx.strokeStyle = "rgba(255, 200, 255, 0.4)"; ctx.beginPath(); ctx.arc(-25, -98, 15, 0, Math.PI, true); ctx.arc(25, -98, 15, 0, Math.PI, true); ctx.stroke();
        ctx.fillStyle = "#110a0a"; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.quadraticCurveTo(0, 15, 80, 0); ctx.lineTo(70, -10); ctx.lineTo(-70, -10); ctx.fill(); ctx.fillStyle = "#a82000"; ctx.beginPath(); ctx.moveTo(-75, -5); ctx.lineTo(75, -5); ctx.stroke(); ctx.fillStyle = "rgba(0, 255, 255, 0.4)"; ctx.beginPath(); ctx.arc(0, -92, 4, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }; drawPillars(false); drawShrine(false); drawPillars(true); drawShrine(true);
    let horGlow = ctx.createLinearGradient(0, 125, 0, 145); horGlow.addColorStop(0,"rgba(200,255,255,0)"); horGlow.addColorStop(0.5,"rgba(200,255,255,0.2)"); horGlow.addColorStop(1,"rgba(200,255,255,0)"); ctx.fillStyle = horGlow; ctx.fillRect(0, 125, LOG_W, 20);
} else if (type === 'yuta') {
    ctx.fillStyle = "#462255"; ctx.fillRect(0,0,LOG_W, LOG_H);
    let grad = ctx.createLinearGradient(0,0,0, LOG_H);
    grad.addColorStop(0, "rgba(255, 0, 179, 0.4)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = grad; ctx.fillRect(0,0,LOG_W,LOG_H);
    
    for(let i=0; i<30; i++) {
        let x = (i * 73 + timer*0.5) % LOG_W;
        let y = (i * 31) % LOG_H;
        let prog = (timer/600) * 1.5;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.quadraticCurveTo(x + 10*prog, y - 20, x, y-40);
        ctx.quadraticCurveTo(x - 10*prog, y-20, x, y);
        ctx.fill();
    }
    
    ctx.fillStyle = "rgba(255,100,200, 0.1)";
    for(let i=0; i<8; i++){
        ctx.beginPath();
        ctx.ellipse(LOG_W/2, LOG_H/2, (i*40 + timer*0.2) % 300, 20, Math.PI/4, 0, Math.PI*2);
        ctx.fill();
    }
    
    for(let i=0; i<15; i++) {
        let x = (i * 30) + 15;
        let y = GROUND_Y;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI + Math.PI/12);
        ctx.fillStyle = '#222'; ctx.fillRect(-2, -5, 4, 12);
        ctx.fillStyle = '#d4af37'; ctx.fillRect(-5, -6, 10, 3);
        ctx.fillStyle = '#999';
        ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-1, -45); ctx.lineTo(0, -48); ctx.lineTo(1, -45); ctx.lineTo(2, -6); ctx.fill();
        ctx.fillStyle = '#ccc';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -38); ctx.lineTo(1, -35); ctx.lineTo(1, -6); ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle="#1c0e21"; ctx.fillRect(0,GROUND_Y-2, LOG_W, 35);
}
}

function drawCinematicIntros(ctx, t) {
    let p1 = gameEngine.roster[0]; let p2 = gameEngine.roster[1];
    
    if (t > 180) { 
        let prog = 1 - (t - 180)/180; 
        ctx.fillStyle = 'rgba(10, 10, 10, 0.9)'; ctx.fillRect(0, 0, LOG_W, LOG_H); ctx.save();
        if (p1.charName === 'Gojo') {
            let sunGrad = ctx.createLinearGradient(0,0,LOG_W,LOG_H); sunGrad.addColorStop(0, "#ffe87a"); sunGrad.addColorStop(0.5, "#cc9a00"); sunGrad.addColorStop(1, "#331100");
            ctx.globalAlpha = 0.5 + (0.5 * Math.sin(prog * Math.PI)); ctx.fillStyle = sunGrad; ctx.fillRect(0,0,LOG_W,LOG_H);
            ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); let rayL = LOG_W * 1.5; ctx.translate(150, 100); ctx.rotate(prog * 0.1);
            for(let a=0; a<Math.PI*2; a+=0.3){ ctx.fillStyle = "rgba(255, 250, 150, 0.2)"; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*rayL, Math.sin(a)*rayL); ctx.lineTo(Math.cos(a+0.1)*rayL, Math.sin(a+0.1)*rayL); } ctx.fill(); ctx.restore();
            
            ctx.save(); ctx.translate(150, 120 + Math.sin(prog*4)*10); ctx.scale(3.5, 3.5); 
            let oX = p1.x, oY = p1.y, oldS = p1.currentState, oF = p1.facingDir;
            p1.facingDir = 1; p1.currentState='idle'; p1.x=0; p1.y=0; 
            p1.draw(ctx); 
            p1.x = oX; p1.y = oY; p1.currentState = oldS; p1.facingDir = oF;
            ctx.restore();
            
            if (prog > 0.3) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(320, 80, 80, 50, Math.PI/12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "8px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("THROUGHOUT", 320, 70); ctx.fillText("HEAVEN & EARTH,", 320, 90); }
            if (prog > 0.6) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(120, 180, 60, 40, -Math.PI/12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "7px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("I ALONE AM", 120, 175); ctx.fillText("THE HONORED ONE", 120, 190); }
        } 
        else if (p1.charName === 'Yuji') {
            ctx.fillStyle = '#0a0005'; ctx.fillRect(0,0,LOG_W,LOG_H); if(Math.random()<0.1) { ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(0,0,LOG_W,LOG_H); }
            ctx.save(); ctx.translate(150, 160 + (prog*10)); ctx.scale(4,4); 
            let oX = p1.x, oY = p1.y, oldS = p1.currentState, oF = p1.facingDir;
            p1.facingDir = 1; p1.currentState='ability_i'; p1.x=0; p1.y=0; 
            p1.draw(ctx); 
            p1.x = oX; p1.y = oY; p1.currentState = oldS; p1.facingDir = oF;
            ctx.restore();
            if (prog > 0.4) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(300, 100, 70, 50, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "10px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("LET'S EXORCISE", 300, 95); ctx.fillText("THEM!", 300, 115); }
        }
        else {
            ctx.fillStyle = '#100515'; ctx.fillRect(0,0,LOG_W,LOG_H); for(let i=0; i<15; i++) { ctx.fillStyle="rgba(200, 100, 200, 0.2)"; ctx.fillRect((prog*1000 + i*50)%LOG_W, i*20, 40, 2); }
            ctx.save(); ctx.translate(150 + prog*20, 120); ctx.scale(3.5,3.5); 
            let oX = p1.x, oY = p1.y, oldS = p1.currentState, oF = p1.facingDir;
            p1.facingDir = 1; p1.currentState='idle'; p1.x=0; p1.y=0; 
            p1.draw(ctx); 
            p1.x = oX; p1.y = oY; p1.currentState = oldS; p1.facingDir = oF;
            ctx.restore();
            if (prog > 0.4) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(300, 100, 80, 50, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "8px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("COME,", 300, 95); ctx.fillText("RIKA!", 300, 110); }
        } ctx.restore();
    }
    else if (t > 0) {
        let prog = 1 - t/180;
        ctx.fillStyle = 'rgba(10, 10, 10, 0.9)'; ctx.fillRect(0, 0, LOG_W, LOG_H); ctx.save();
        if (p2.charName === 'Gojo') {
            let sunGrad = ctx.createLinearGradient(0,0,LOG_W,LOG_H); sunGrad.addColorStop(0, "#ffe87a"); sunGrad.addColorStop(0.5, "#cc9a00"); sunGrad.addColorStop(1, "#331100"); ctx.globalAlpha = 0.5 + (0.5 * Math.sin(prog * Math.PI)); ctx.fillStyle = sunGrad; ctx.fillRect(0,0,LOG_W,LOG_H);
            ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); let rayL = LOG_W * 1.5; ctx.translate(270, 100); ctx.rotate(prog * 0.1);
            for(let a=0; a<Math.PI*2; a+=0.3){ ctx.fillStyle = "rgba(255, 250, 150, 0.2)"; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*rayL, Math.sin(a)*rayL); ctx.lineTo(Math.cos(a+0.1)*rayL, Math.sin(a+0.1)*rayL); } ctx.fill(); ctx.restore();
            
            ctx.save(); ctx.translate(270, 120 + Math.sin(prog*4)*10); ctx.scale(3.5, 3.5); 
            let oX = p2.x, oY = p2.y, oldS = p2.currentState, oF = p2.facingDir;
            p2.facingDir = -1; p2.currentState='idle'; p2.x=0; p2.y=0; 
            p2.draw(ctx); 
            p2.x = oX; p2.y = oY; p2.currentState = oldS; p2.facingDir = oF;
            ctx.restore();
            
            if (prog > 0.3) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(100, 80, 80, 50, Math.PI/12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "8px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("THROUGHOUT", 100, 70); ctx.fillText("HEAVEN & EARTH,", 100, 90); }
            if (prog > 0.6) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(300, 180, 60, 40, -Math.PI/12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "7px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("I ALONE AM", 300, 175); ctx.fillText("THE HONORED ONE", 300, 190); }
        }
        else if (p2.charName === 'Yuji') {
            ctx.fillStyle = '#0a0005'; ctx.fillRect(0,0,LOG_W,LOG_H); if(Math.random()<0.1) { ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(0,0,LOG_W,LOG_H); }
            ctx.save(); ctx.translate(270, 160 + (prog*10)); ctx.scale(4,4); 
            let oX = p2.x, oY = p2.y, oldS = p2.currentState, oF = p2.facingDir;
            p2.facingDir = -1; p2.currentState='ability_i'; p2.x=0; p2.y=0; 
            p2.draw(ctx); 
            p2.x = oX; p2.y = oY; p2.currentState = oldS; p2.facingDir = oF;
            ctx.restore();
            if (prog > 0.4) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(120, 100, 70, 50, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "10px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("LET'S EXORCISE", 120, 95); ctx.fillText("THEM!", 120, 115); }
        }
        else {
            ctx.fillStyle = '#100515'; ctx.fillRect(0,0,LOG_W,LOG_H); for(let i=0; i<15; i++) { ctx.fillStyle="rgba(200, 100, 200, 0.2)"; ctx.fillRect((-prog*1000 + i*50 + 2000)%LOG_W, i*20, 40, 2); }
            ctx.save(); ctx.translate(270 - prog*20, 120); ctx.scale(3.5,3.5); 
            let oX = p2.x, oY = p2.y, oldS = p2.currentState, oF = p2.facingDir;
            p2.facingDir = -1; p2.currentState='idle'; p2.x=0; p2.y=0; 
            p2.draw(ctx); 
            p2.x = oX; p2.y = oY; p2.currentState = oldS; p2.facingDir = oF;
            ctx.restore();
            if (prog > 0.4) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(120, 100, 80, 50, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "8px 'Press Start 2P'"; ctx.textAlign="center"; ctx.fillText("COME,", 120, 95); ctx.fillText("RIKA!", 120, 110); }
        } ctx.restore();
    }
}
