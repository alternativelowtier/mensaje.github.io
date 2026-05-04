class ParticleEffect {
constructor(x, y, vx, vy, color, behavior = 'normal') {
this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.color = color; this.behavior = behavior; this.initialLife = Math.floor(Math.random() * 15) + 10;
if (this.behavior === 'slash') { this.angle = Math.random() * Math.PI * 2; this.scale = 0.8 + Math.random() * 0.5; this.initialLife = 12; }
else if (this.behavior === 'yuta_slash') { this.angle = Math.random() * Math.PI * 2; this.scale = 0.9 + Math.random() * 0.6; this.initialLife = 12; }
else if (this.behavior === 'dash_trail') { this.initialLife = 10; }
else if (this.behavior === 'dust') { this.initialLife = 30 + Math.random() * 20; }
else if (this.behavior === 'rct_heal') { this.initialLife = 40 + Math.random() * 20; }
else if (this.behavior === 'black_flash_lightning') {
this.initialLife = 20; this.points =[]; for(let branch=0; branch<4; branch++) { let pts =[]; let cx = 0, cy = 0; pts.push({x: cx, y: cy}); for(let i=0; i<4; i++) { cx += (Math.random()-0.5)*50; cy += (Math.random()-0.5)*50; pts.push({x: cx, y: cy}); } this.points.push(pts); } } this.life = this.initialLife;
}
update() { this.x += this.vx; if (this.behavior === 'normal' || this.behavior === 'black_flash' || this.behavior === 'dust') this.vy += GRAVITY * (this.behavior === 'dust' ? 0.2 : 1); if (this.behavior === 'rct_heal') { this.vy -= 0.05; } this.y += this.vy; this.life--; }
draw(ctx) {
let pScale = this.life / this.initialLife; ctx.globalAlpha = Math.max(0, pScale);
if (this.behavior === 'slash') { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.scale(this.scale, this.scale * pScale); ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(0, -15, 20, 0); ctx.quadraticCurveTo(0, -3, -20, 0); ctx.fill(); ctx.stroke(); ctx.restore(); } 
else if (this.behavior === 'yuta_slash') { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.scale(this.scale, this.scale * pScale); ctx.fillStyle = '#000'; ctx.strokeStyle = '#ff00aa'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-25, 0); ctx.quadraticCurveTo(0, -18, 25, 0); ctx.quadraticCurveTo(0, -5, -25, 0); ctx.fill(); ctx.stroke(); ctx.restore(); }
else if (this.behavior === 'black_flash') { ctx.fillStyle = '#000'; ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1; let size = (this.life > 10 ? 6 : 4) * pScale; ctx.fillRect(this.x, this.y, size, size); ctx.strokeRect(this.x, this.y, size, size); } 
else if (this.behavior === 'dash_trail') { ctx.fillStyle = this.color; ctx.globalAlpha = pScale * 0.4; ctx.fillRect(this.x - 8, this.y - 22, 16, 22); } 
else if (this.behavior === 'dust') { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, 2, 2); } 
else if (this.behavior === 'rct_heal') { let size = 1 + pScale*3; ctx.fillStyle = Math.random() > 0.5 ? '#ff85a1' : '#ffcad4'; ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(this.x
