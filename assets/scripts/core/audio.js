const canvas = document.getElementById('game-canvas'); 
const ctx = canvas.getContext('2d'); 
const LOG_W = 420; 
const LOG_H = 240; 
const UI_UPSCALE = Math.max(window.devicePixelRatio || 2, 2.5);
canvas.width = LOG_W * UI_UPSCALE; 
canvas.height = LOG_H * UI_UPSCALE; 
ctx.imageSmoothingEnabled = false;

const GRAVITY = 0.5; 
const GROUND_Y = 210;
let gameEngine = { isRunning: false, matchOver: false, frameCount: 0, introTimer: 0, roundStartTimer: 0, vsScreenTimer: 0, cameraShake: 0, hitStopFrames: 0, impactFrame: 0, roster: [], projectiles:[], particles:[], screenFlash: null, cinematicText: null };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.getElementById('init-screen').addEventListener('click', function() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); osc.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.01);
    this.style.display = 'none'; 
}, { once: true });

const synth = {
    volume: 0.7,
    play: function(type) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain(); gainNode.gain.setValueAtTime(this.volume, audioCtx.currentTime);
        switch(type) {
            case 'menuClick': osc.type = 'triangle'; osc.frequency.setValueAtTime(440, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2); break;
            case 'jojo_punch': case 'hitLight': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); break;
            case 'hitHeavy': osc.type = 'square'; osc.frequency.setValueAtTime(100, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); break;
            case 'hollow_purple': case 'custom_voicemod': osc.type = 'square'; osc.frequency.setValueAtTime(50, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1.5); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5); break;
            case 'gojoBlue': case 'gojoRed': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5); break;
            case 'sukunaSlash': osc.type = 'sine'; osc.frequency.setValueAtTime(1000, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); break;
            case 'gojo_domain_expansion': case 'domainExpansion': case 'sukunaTransform': osc.type = 'square'; osc.frequency.setValueAtTime(50, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 2.0); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0); break;
            case 'gojo_domain_made_with_voicemod': osc.type = 'sine'; osc.frequency.setValueAtTime(60, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(70, audioCtx.currentTime + 2.0); gainNode.gain.setValueAtTime(this.volume*0.4, audioCtx.currentTime); break;
            default: osc.disconnect(); gainNode.disconnect(); return;
        } osc.connect(gainNode); gainNode.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + (type === 'gojo_domain_made_with_voicemod' ? 10 : 2.1));
    }
};

const soundManager = {
    sounds: {}, currentLoop: null, volume: 0.7,
    init: function() {
        const soundFiles = {
            menuClick: './sounds/menu_click.mp3', jojo_punch: './sounds/jojo-sound-punch.mp3', hitHeavy: './sounds/hit_heavy.mp3', gojoBlue: './sounds/gojo_blue.mp3', gojoRed: './sounds/gojo_red.mp3', sukunaSlash: './sounds/sukuna_slash.mp3',
            sukunaTransform: './sounds/sukuna_transform.mp3', domainExpansion: './sounds/domain_expansion.mp3', gojo_domain_expansion: './sounds/gojo-domain-expansion.mp3', gojo_domain_made_with_voicemod: './sounds/gojo-domain-made-with-voicemod.mp3', hollow_purple: './sounds/hollow-purple.mp3',
            custom_voicemod: 'https://tuna.voicemod.net/sound/287ad26d-7d0c-494b-9a3c-d1d1620ef561'
        }; 
        for (const key in soundFiles) { 
            const audio = new Audio(soundFiles[key]); 
            // iPad Debugger for sounds
            audio.onerror = function() {
                const errorText = document.createElement('div');
                errorText.style = "position:absolute; top:10px; left:10px; color:red; font-size:10px; z-index:99999; background:rgba(0,0,0,0.8); padding:5px; border:1px solid red;";
                errorText.innerText = "ERROR LOADING: " + soundFiles[key];
                document.body.appendChild(errorText);
            };
            this.sounds[key] = audio; 
        }
    },
    play: function(soundName) { 
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(e=>{});
        if (soundName === 'menuClick') { synth.play('menuClick'); return; } if (!this.sounds[soundName]) return;
        const sound = this.sounds[soundName]; const newAudio = sound.cloneNode(); newAudio.currentTime = 0; newAudio.volume = this.volume; newAudio.play().catch(e => { synth.play(soundName); }); 
    },
    playLoop: function(soundName) {
        this.stopLoop(); if (audioCtx.state === 'suspended') audioCtx.resume().catch(e=>{});
        if (!this.sounds[soundName]) return; this.currentLoop = this.sounds[soundName]; this.currentLoop.loop = true; this.currentLoop.volume = this.volume * 0.7; this.currentLoop.play().catch(e => { this.currentLoop = null; synth.play(soundName); });
    },
    stopLoop: function() { if (this.currentLoop) { this.currentLoop.pause(); this.currentLoop.currentTime = 0; this.currentLoop.loop = false; this.currentLoop = null; } },
    setVolume: function(value) { this.volume = value; synth.volume = value; if(this.currentLoop) this.currentLoop.volume = value * 0.7; }
}; soundManager.init();
