function drawHollowPurple(ctx, x, y, hRadius, age) {
    ctx.save(); ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter'; 
    let vgrad = ctx.createRadialGradient(0, 0, hRadius*0.3, 0, 0, hRadius * 2.2); 
    vgrad.addColorStop(0, "#ffffff"); vgrad.addColorStop(0.1, "rgba(255, 120, 255, 0.9)"); vgrad.addColorStop(0.3, "rgba(160, 0, 255, 0.7)"); vgrad.addColorStop(0.7, "rgba(80, 0, 180, 0.2)"); vgrad.addColorStop(1, "rgba(0,0,0,0)"); 
    ctx.fillStyle = vgrad; ctx.beginPath(); ctx.arc(0, 0, hRadius*2.2, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, hRadius * 0.45, 0, Math.PI * 2); ctx.fill();
    let egrad = ctx.createRadialGradient(0, 0, hRadius*0.35, 0, 0, hRadius * 0.55); 
    egrad.addColorStop(0, "rgba(255,255,255,0)"); egrad.addColorStop(1, "rgba(140, 0, 250, 1)"); 
    ctx.fillStyle = egrad; ctx.beginPath(); ctx.arc(0, 0, hRadius*0.55, 0, Math.PI*2); ctx.fill();
    if(age % 2 === 0) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for(let lb = 0; lb < 5; lb++){ ctx.beginPath(); ctx.strokeStyle = Math.random()>0.5 ? '#ffbbee' : '#c844ff'; ctx.lineWidth = Math.random()*4 + 2; let lang = Math.random()*Math.PI*2; ctx.moveTo(0,0); let px=0, py=0; for(let s = 0; s < 6; s++) { px += Math.cos(lang + (Math.random()-0.5)) * hRadius * 0.6; py += Math.sin(lang + (Math.random()-0.5)) * hRadius * 0.6; ctx.lineTo(px,py); } ctx.stroke(); } }
    ctx.restore();
}

class CombatProjectile {
constructor(type, x, y, direction, owner, isMaximum = false) { 
    this.type = type; this.x = x; this.y = y; this.direction = direction; this.owner = owner; this.age = 0; this.isMaximum = isMaximum; this.active = true; 
    if (type === 'yuji_rock') { this.vx = direction * (Math.random() * 6 + 6); this.vy = -(Math.random() * 8 + 3); this.rot = Math.random() * Math.PI; this.vrot = (Math.random() - 0.5) * 0.4; }
    if (type === 'jacob_ladder_beam') { this.y = -20; this.vy = 20; this.initialHeight = GROUND_Y + 20; this.height = this.initialHeight; }
    if (type === 'true_love_beam_charge') { this.y = owner.y - 70; }
}
update() {
this.age++; let opponent = (this.owner.playerId === 0) ? gameEngine.roster[1] : gameEngine.roster[0];
switch(this.type) {
case 'blue_orb_max':
    this.angle = (this.angle || 0) + 0.15; this.x = this.owner.x + 10 + Math.cos(this.angle) * 45; this.y = this.owner.y + 15 + Math.sin(this.angle) * 45;
    let distMax = Math.abs(this.x - opponent.x); if (distMax < 140 && opponent.guardHp > 0 && opponent.currentState !== 'hit_stun' && opponent.currentState !== 'dead') { opponent.x += ((this.x - opponent.x) > 0 ? 3 : -3); }
    if (this.age % 10 === 0 && Math.abs(this.x - opponent.x) < 55 && Math.abs(this.y - opponent.y) < 55) { opponent.receiveDamage(15, 2, this.owner, false); spawnHitSparks(this.x, this.y, '#0044ff', false); }
    if (this.age > 150) this.active = false; break;

case 'lapse_blue_pull':
    if (this.age === 1) { 
        let d = opponent.x - this.owner.x; 
        if (d * this.direction > 0 && Math.abs(d) < 180 && Math.abs(this.y - opponent.y) < 60 && opponent.currentState !== 'dead') {
            opponent.x = this.owner.x + (35 * this.direction); opponent.velX = 0; 
            opponent.receiveDamage(10, 0, this.owner, false, false); spawnHitSparks(opponent.x, opponent.y, '#0088ff', true);
        }
    } if (this.age > 12) this.active = false; break;

case 'max_red_orb':
    if (this.age === 1) gameEngine.cameraShake = 20; 
    let travelSpeed = 15; this.x += travelSpeed * this.direction; 
    if (Math.abs(this.x - opponent.x) < 40 && Math.abs(this.y - opponent.y) < 60) {
        opponent.receiveDamage(75, 15, this.owner, false); spawnHitSparks(this.x, this.y, '#ff0000', true); gameEngine.projectiles.push(new CombatProjectile('red_explosion', this.x, this.y, this.direction, this.owner, false));
        this.active = false;
    } if (this.age > 45) { this.active = false; } break;

case 'rika_punch':
    if (this.age === 15) {
        if (Math.abs(this.x + (40 * this.direction) - opponent.x) < 50 && Math.abs(this.y - opponent.y) < 60 && opponent.currentState !== 'dead') {
            opponent.receiveDamage(35, 10, this.owner, false);
            spawnHitSparks(opponent.x, opponent.y, '#ff00aa', true);
            gameEngine.cameraShake += 10;
            gameEngine.hitStopFrames = 8;
            soundManager.play('hitHeavy');
            
            if (opponent.charName !== 'Yuji' && opponent.charName !== 'Yuta') {
                this.owner.copiedTechnique = opponent.charName + '_U';
                this.owner.copiedTechniqueName = opponent.charName === 'Gojo' ? 'LAPSE BLUE' : 'UNKNOWN';
                this.owner.copyCharges = 2;
            } else if (opponent.charName === 'Yuji' && opponent.isTransformed) {
                this.owner.copiedTechnique = 'Sukuna_U';
                this.owner.copiedTechniqueName = 'DISMANTLE';
                this.owner.copyCharges = 2;
            }
        }
    }
    if (this.age > 45) this.active = false;
    break;

case 'sukuna_dismantle': this.x += 15 * this.direction; if (Math.abs(this.x - opponent.x) < 40) { opponent.receiveDamage(15, 4, this.owner, false, false, false, 0.3); spawnHitSparks(opponent.x, opponent.y, '', true, true); this.active = false; } if (this.age > 50) this.active = false; break;
case 'sukuna_fire_arrow': this.x += 12 * this.direction; if (this.age > 80) this.active = false; if (Math.abs(this.x - opponent.x) < 40 && opponent.y > this.y - 60) { this.active = false; gameEngine.projectiles.push(new CombatProjectile('fire_arrow_explosion', this.x, opponent.y, 1, this.owner)); gameEngine.cameraShake = 35; gameEngine.hitStopFrames = 10; } break;
case 'fire_arrow_explosion': 
    if (this.age === 1) { 
        opponent.receiveDamage(200, 25, this.owner, false, false, false, 0); 
        spawnHitSparks(this.x, this.y, '#ff4400', true); 
        this.streaks =[];
        for(let i=0; i<15; i++) {
            this.streaks.push({
                angle: Math.random() * Math.PI * 2,
                curve: (Math.random() - 0.5) * 1.5,
                speed: 15 + Math.random() * 20,
                color: Math.random() > 0.5 ? '#ff2200' : (Math.random() > 0.5 ? '#ff88ff' : '#ffffff'),
                width: 15 + Math.random() * 25
            });
        }
    } 
    if (this.age > 40) this.active = false; 
    break;
case 'hp_blue_orb': case 'hp_red_orb': if(this.age > 120) this.active = false; break;
case 'hollow_purple_blast': this.x += 8 * this.direction; if (this.age % 3 === 0 && Math.abs(this.x - opponent.x) < 90) { opponent.receiveDamage(35, 1, this.owner, false); spawnHitSparks(opponent.x, opponent.y, '#d400ff', true); } if (this.age > 160) this.active = false; break;
case 'infinity_shield': this.x = this.owner.x; this.y = this.owner.y - 10; if (this.age > 300) this.active = false; break;
case 'blue_explosion': if (this.age > 16) this.active = false; break;
case 'red_explosion': if (this.age > 25) this.active = false; break;
case 'yuji_rock':
    this.vy += GRAVITY; this.x += this.vx; this.y += this.vy; this.rot += this.vrot; if (this.y > GROUND_Y) { this.y = GROUND_Y; this.vy *= -0.4; this.vx *= 0.8; } if (this.age > 80) this.active = false;
    if (this.age < 20 && Math.abs(this.x - opponent.x) < 20 && Math.abs(this.y - opponent.y) < 30 && opponent.currentState !== 'hit_stun' && opponent.currentState !== 'dead') { opponent.receiveDamage(8, 1, this.owner, false); spawnHitSparks(opponent.x, opponent.y, '#777', false); this.active = false; } break;

case 'jacob_ladder_beam':
    if(this.age < 5) { 
        this.y = -20 + (this.age/5) * (opponent.y+30 - (-20)); 
        this.x = opponent.x;
    } else {
        if(this.age === 5){
             if(Math.abs(this.x - opponent.x) < 30) {
                opponent.receiveDamage(10, 2, this.owner, true);
                opponent.spMeter = Math.max(0, opponent.spMeter - 50);
                opponent.ultMeter = Math.max(0, opponent.ultMeter - 30);
                gameEngine.cameraShake = 15;
                spawnHitSparks(this.x, this.y, '#fff0a0', true);
            }
        }
        this.y += this.initialHeight / 20;
        this.height -= this.initialHeight / 20;
    }
    if (this.height <= 0) this.active = false;
    break;
case 'true_love_beam_charge':
    this.x = this.owner.x + (20 * this.direction);
    if(this.age > 120) {
        gameEngine.projectiles.push(new CombatProjectile('true_love_beam', this.x + (10*this.direction), this.y, this.direction, this.owner));
        this.active = false;
    }
    break;
case 'true_love_beam':
    this.x += 12 * this.direction;
    if (this.age % 2 === 0 && Math.abs(this.x - opponent.x) < 90) { 
        opponent.receiveDamage(40, 1, this.owner, false); 
        spawnHitSparks(opponent.x, opponent.y, '#ffabe1', true); 
    }
    if (this.age > 80) this.active = false;
    break;
}
}
drawEnergyAura(ctx, r, age, color1, color2, coreColor) {
    ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(0,0,0, 0,0,r*2.5);
    g.addColorStop(0, coreColor); g.addColorStop(0.2, color1); g.addColorStop(0.6, color2); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,r*2.5, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    let drawLayer = (color, spikes, speed, base, vary) => {
        ctx.fillStyle = color; ctx.beginPath();
        for(let i=0; i<=spikes; i++) {
            let a = (i/spikes)*Math.PI*2 + age*speed;
            let d = r * (base + Math.abs(Math.sin(age*0.3 + i*vary))*0.6);
            if(i===0) ctx.moveTo(Math.cos(a)*d, Math.sin(a)*d); else ctx.lineTo(Math.cos(a)*d, Math.sin(a)*d);
        } ctx.fill();
    };
    drawLayer('rgba(0, 150, 255, 0.5)', 16, 0.1, 0.6, 2.1);
    drawLayer(color2, 12, -0.15, 0.4, 1.7);
    drawLayer(color1, 9, 0.2, 0.2, 1.3);
    
    ctx.fillStyle = coreColor; ctx.beginPath(); ctx.arc(0,0, r*0.4, 0, Math.PI*2); ctx.fill();
}

draw(ctx) {
let r = 1;
switch(this.type) {
case 'lapse_blue_pull':
    let bAge = this.age / 12; ctx.save(); ctx.translate(this.owner.x + (50 * this.direction), this.owner.y); let pullScale = 1 - bAge; ctx.globalAlpha = 1 - bAge; ctx.fillStyle = `rgba(0, 150, 255, ${0.4 + 0.6 * (1 - bAge)})`; ctx.beginPath(); ctx.arc(0, 0, 100 * pullScale, 0, Math.PI * 2); ctx.fill();
    for(let i=0; i<5; i++) { let a = Math.random() * Math.PI * 2; let len = 30 + Math.random() * 50 * pullScale; ctx.strokeStyle = '#e6f7ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * len * 0.2, Math.sin(a) * len * 0.2); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke(); } ctx.restore(); break;

case 'blue_orb_max':
    let rM = 30 * Math.min(1, this.age / 15); if (this.age > 135) rM *= (150 - this.age) / 15;
    ctx.save(); ctx.translate(this.x, this.y);
    
    this.drawEnergyAura(ctx, rM, this.age, 'rgba(0, 150, 255, 0.8)', '#0044ff', '#ffffff');
    
    ctx.globalCompositeOperation = 'lighter';
    for(let i=0; i<3; i++) {
        ctx.save();
        ctx.rotate(this.age * 0.1 + (i * Math.PI/1.5));
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, rM * 1.5, rM * 0.3, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }
    ctx.restore(); 
    
    if(this.age % 2 === 0) { 
        for(let p=0; p<3; p++) {
            let ang = Math.random() * Math.PI * 2;
            let dist = rM * 2.5;
            gameEngine.particles.push(new ParticleEffect(this.x + Math.cos(ang)*dist, this.y + Math.sin(ang)*dist, -Math.cos(ang)*5, -Math.sin(ang)*5, '#00ffff', 'dust')); 
        }
    } 
    break;

case 'max_red_orb':
    let roR = 25 + Math.sin(this.age * 0.4) * 5; 
    ctx.save(); ctx.translate(this.x, this.y);
    
    this.drawEnergyAura(ctx, roR, this.age, 'rgba(255, 50, 50, 0.8)', '#aa0000', '#ffffff');
    
    ctx.globalCompositeOperation = 'lighter';
    for(let z=0; z<4; z++) { 
        ctx.save(); 
        let pulse = Math.sin(this.age * 0.5 + z) * 5;
        ctx.rotate(this.age*0.15 * (z%2===0?1:-1) + z*(Math.PI/2)); 
        ctx.beginPath(); ctx.strokeStyle = `rgba(255, 50, 50, 0.9)`; ctx.lineWidth = 6 + Math.random() * 2; 
        ctx.ellipse(0, 0, roR*1.8 + pulse, roR*0.3, Math.PI/4 + z*10, 0, Math.PI*2); ctx.stroke(); 
        ctx.beginPath(); ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`; ctx.lineWidth = 2; 
        ctx.ellipse(0, 0, roR*1.8 + pulse, roR*0.3, Math.PI/4 + z*10, 0, Math.PI*2); ctx.stroke(); 
        ctx.restore(); 
    }
    ctx.restore(); break;

case 'rika_punch':
    let rAlpha = 1.0;
    if (this.age < 10) rAlpha = this.age / 10;
    if (this.age > 35) rAlpha = (45 - this.age) / 10;
    ctx.save();
    ctx.globalAlpha = Math.max(0, rAlpha);
    ctx.translate(this.x - (20 * this.direction), this.y + 20);
    ctx.scale(this.direction, 1);
    
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.beginPath(); ctx.ellipse(0, 0, 40, 15, 0, 0, Math.PI*2); ctx.fill();
    
    let bodyGrad = ctx.createLinearGradient(0, 0, 0, -80);
    bodyGrad.addColorStop(0, "#000000");
    bodyGrad.addColorStop(0.5, "#111111");
    bodyGrad.addColorStop(1, "#e6e6e6");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.quadraticCurveTo(-30, -50, -10, -90);
    ctx.lineTo(20, -90);
    ctx.quadraticCurveTo(10, -40, 15, 0);
    ctx.fill();

    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, -70); ctx.lineTo(10, -65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -60); ctx.lineTo(8, -55); ctx.stroke();
    
    ctx.translate(5, -100);
    
    ctx.strokeStyle = "#111";
    for(let t=0; t<4; t++) {
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.quadraticCurveTo(-20 - t*10, -20 + Math.sin(this.age*0.2+t)*10, -30 - t*5, 20);
        ctx.lineWidth = 4; ctx.stroke();
    }
    
    ctx.fillStyle = "#e0e0e0";
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 24, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#444"; ctx.lineWidth=1.5;
    for(let x=-10; x<=10; x+=4) { ctx.beginPath(); ctx.moveTo(x, -22); ctx.lineTo(x, 5); ctx.stroke(); }
    
    ctx.fillStyle = "#220000";
    ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(15, 28); ctx.lineTo(-15, 22); ctx.fill();
    
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-10, 5); ctx.lineTo(-5, 15); ctx.lineTo(0, 8); ctx.lineTo(5, 18); ctx.lineTo(10, 10); ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = Math.max(0, rAlpha);
    ctx.translate(this.x - (20 * this.direction), this.y - 70);
    ctx.scale(this.direction, 1);
    
    let punchExt = 0;
    if (this.age > 10 && this.age < 20) punchExt = (this.age - 10) * 8;
    if (this.age >= 20) punchExt = 80;

    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20 + punchExt*0.5, -20);
    ctx.lineTo(40 + punchExt, 20);
    ctx.stroke();

    ctx.fillStyle = "#d4d4d4";
    ctx.translate(40 + punchExt, 20);
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(35, -15); ctx.lineTo(5, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(40, 5); ctx.lineTo(5, 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,5); ctx.lineTo(30, 20); ctx.lineTo(0, 10); ctx.fill();
    
    ctx.restore();
    break;

case 'blue_explosion': case 'red_explosion': let maxAge = this.type === 'blue_explosion' ? 16 : 25; let maxRadius = this.type === 'blue_explosion' ? 45 : 75; let progress = this.age / maxAge; let currentRadius = maxRadius * Math.sin(progress * Math.PI); ctx.globalAlpha = 1 - progress; ctx.fillStyle = this.type === 'blue_explosion' ? '#008cff' : '#ff0000'; ctx.beginPath(); ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0; break;
case 'sukuna_dismantle': ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.direction, 1); ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, -25); ctx.quadraticCurveTo(15, 0, -15, 25); ctx.quadraticCurveTo(-5, 0, -15, -25); ctx.fill(); ctx.stroke(); ctx.restore(); break;
case 'sukuna_fire_arrow': 
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.direction, 1);
    ctx.globalCompositeOperation = 'lighter';
    let p_glow = ctx.createRadialGradient(20, 0, 0, 10, 0, 60);
    p_glow.addColorStop(0, "rgba(255, 255, 200, 1)"); p_glow.addColorStop(0.3, "rgba(255, 100, 0, 0.8)"); p_glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = p_glow; ctx.fillRect(-60, -60, 120, 120);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(10, -20); ctx.lineTo(20, 0); ctx.lineTo(10, 20); ctx.fill();
    ctx.fillStyle = '#ff4400'; ctx.beginPath();
    ctx.moveTo(25, 0); ctx.lineTo(-10, -30); ctx.quadraticCurveTo(-5, -15, -40, -20); ctx.lineTo(-25, 0); ctx.lineTo(-40, 20); ctx.quadraticCurveTo(-5, 15, -10, 30); ctx.fill();
    ctx.fillStyle = '#ffaa00'; ctx.beginPath();
    ctx.moveTo(30, 0); ctx.lineTo(0, -15); ctx.lineTo(-20, -5); ctx.lineTo(-10, 0); ctx.lineTo(-20, 5); ctx.lineTo(0, 15); ctx.fill();

    for(let i=0; i<8; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#ff2200' : '#ff8800';
        ctx.beginPath(); ctx.arc(-20 - Math.random()*50, (Math.random()-0.5)*30, Math.random()*6 + 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore(); 
    break;

case 'fire_arrow_explosion': 
    let faMaxAge = 40;
    let faProgress = this.age / faMaxAge;
    let faRadius = 200 * Math.sin(faProgress * Math.PI);

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - faProgress);

    ctx.globalCompositeOperation = 'lighter';
    let bglow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, faRadius * 1.5);
    bglow.addColorStop(0, "rgba(255, 255, 255, 1)");
    bglow.addColorStop(0.2, "rgba(255, 200, 50, 0.8)");
    bglow.addColorStop(0.5, "rgba(255, 50, 0, 0.4)");
    bglow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bglow;
    ctx.fillRect(this.x - faRadius*1.5, this.y - faRadius*1.5, faRadius*3, faRadius*3);

    if (this.streaks) {
        for(let s of this.streaks) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            let endX = this.x + Math.cos(s.angle) * s.speed * this.age;
            let endY = this.y + Math.sin(s.angle) * s.speed * this.age;
            let cpX = this.x + Math.cos(s.angle + s.curve) * s.speed * this.age * 0.5;
            let cpY = this.y + Math.sin(s.angle + s.curve) * s.speed * this.age * 0.5;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width * (1 - faProgress);
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = s.width * 0.3 * (1 - faProgress);
            ctx.stroke();
        }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, faRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    break;

case 'hp_blue_orb': case 'hp_red_orb': 
    let tMax = 15; let pIn = Math.min(1, this.age / 10); let rP = tMax * pIn; let isBlue = this.type === 'hp_blue_orb';
    let owner = this.owner; let targetX = owner.x + (30 * owner.facingDir);
    let distToTarget = Math.abs(this.x - targetX);
    let alpha = Math.min(1, distToTarget / 50); 
    ctx.save(); ctx.translate(this.x, this.y); ctx.globalAlpha = alpha;
    if(isBlue) this.drawEnergyAura(ctx, rP, this.age, 'rgba(0, 150, 255, 0.6)', '#0022dd', '#ffffff');
    else this.drawEnergyAura(ctx, rP, this.age, 'rgba(255, 100, 100, 0.6)', '#ff0000', '#ffffff');
    ctx.restore(); ctx.globalAlpha = 1.0; break;

case 'hollow_purple_blast':
    let hpProgressP = Math.min(this.age / 20, 1); let hRadius = 80 * hpProgressP; ctx.globalAlpha = this.age > 140 ? (160 - this.age)/20 : 1.0; 
    drawHollowPurple(ctx, this.x, this.y, hRadius, this.age);
    if (this.age % 2 === 0) { gameEngine.particles.push(new ParticleEffect(this.x - (hRadius * this.direction), this.y + (Math.random()-0.5)*hRadius, (Math.random()-0.5)*15, (Math.random()-0.5)*10, '#aa22ff', 'dust')); } 
    ctx.globalAlpha = 1.0; break;

case 'infinity_shield': let fade = 1.0; if (this.age < 15) fade = this.age / 15; else if (this.age > 285) fade = (300 - this.age) / 15; let pulse = Math.sin(this.age * 0.1) * 2; ctx.globalAlpha = fade * 0.6; ctx.fillStyle = 'rgba(50, 150, 255, 0.2)'; ctx.beginPath(); ctx.arc(this.x, this.y, 38 + pulse, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(200, 240, 255, 0.8)'; ctx.lineWidth = 2 + Math.random(); ctx.stroke(); ctx.globalAlpha = fade * 0.3; ctx.fillStyle = '#fff'; for(let i=0; i<3; i++) { ctx.beginPath(); ctx.arc(this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30, Math.random()*3, 0, Math.PI*2); ctx.fill(); } ctx.globalAlpha = 1.0; break;
case 'yuji_rock': ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot); let scale = this.age > 60 ? 1.0 - (this.age - 60)/20 : 1.0; ctx.scale(scale, scale); ctx.fillStyle = '#555'; ctx.fillRect(-6, -6, 12, 12); ctx.strokeStyle = '#333'; ctx.strokeRect(-6, -6, 12, 12); ctx.restore(); break;
case 'jacob_ladder_beam':
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.height / this.initialHeight);
    ctx.fillStyle = '#fffee0';
    ctx.fillRect(this.x - 15, this.y, 30, this.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x-17, this.y, 34, this.height);
    ctx.restore();
    break;

case 'true_love_beam_charge':
    let chargeProg = this.age / 120;
    let chargeRadius = 5 + 40 * Math.sin(chargeProg * Math.PI / 2);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = 'lighter';
    let tl_grad = ctx.createRadialGradient(0, 0, 0, 0, 0, chargeRadius);
    tl_grad.addColorStop(0, `rgba(255,255,255,${chargeProg})`);
    tl_grad.addColorStop(0.5, `rgba(255, 171, 225, ${chargeProg})`);
    tl_grad.addColorStop(1, 'transparent');
    ctx.fillStyle = tl_grad;
    ctx.beginPath(); ctx.arc(0, 0, chargeRadius, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    break;

case 'true_love_beam':
    ctx.save();
    let b_width = 80;
    ctx.globalAlpha = this.age > 70 ? (80 - this.age)/10 : 1.0;
    ctx.translate(this.x, this.y);
    ctx.scale(this.direction, 1);
    
    ctx.fillStyle = '#ffabe1';
    ctx.beginPath();
    ctx.moveTo(0, -b_width/2);
    ctx.lineTo(LOG_W*2, -b_width/2 + 20);
    ctx.lineTo(LOG_W*2, b_width/2 - 20);
    ctx.lineTo(0, b_width/2);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -b_width/4);
    ctx.lineTo(LOG_W*2, -b_width/4 + 10);
    ctx.lineTo(LOG_W*2, b_width/4 - 10);
    ctx.lineTo(0, b_width/4);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    break;
}
}
}
