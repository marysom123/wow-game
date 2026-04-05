export default class HUD {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // ── HP Bar ──
        const hpX = 15, hpY = 15;
        this.hpBarBg = scene.add.rectangle(hpX, hpY, 200, 22, 0x333333).setOrigin(0).setDepth(100);
        this.hpBar = scene.add.rectangle(hpX, hpY, 200, 22, 0xff3333).setOrigin(0).setDepth(101);
        this.hpText = scene.add.text(hpX + 5, hpY + 4, 'HP 100/100', {
            fontSize: '13px', fill: '#fff', fontFamily: 'Arial'
        }).setDepth(102);
        
        // ── MP Bar ──
        const mpX = 15, mpY = 40;
        this.mpBarBg = scene.add.rectangle(mpX, mpY, 150, 16, 0x333333).setOrigin(0).setDepth(100);
        this.mpBar = scene.add.rectangle(mpX, mpY, 150, 16, 0x3366ff).setOrigin(0).setDepth(101);
        this.mpText = scene.add.text(mpX + 5, mpY + 2, 'MP 50/50', {
            fontSize: '11px', fill: '#fff', fontFamily: 'Arial'
        }).setDepth(102);
        
        // ── Skill Bar ──
        const sbX = GAME_WIDTH - 130, sbY = GAME_HEIGHT - 80;
        
        // K skill (Fireball)
        this.skillKBg = scene.add.rectangle(sbX, sbY, 50, 50, 0x222222).setOrigin(0).setDepth(100).setStrokeStyle(2, 0x444444);
        this.skillKText = scene.add.text(sbX + 25, sbY + 10, 'K\n火球', {
            fontSize: '11px', fill: '#4488ff', fontFamily: 'Arial', align: 'center'
        }).setOrigin(0.5, 0).setDepth(102);
        this.skillKCooldown = scene.add.rectangle(sbX, sbY, 50, 50, 0x000000, 0.7).setOrigin(0).setDepth(101);
        
        // L skill (Lightning)
        this.skillLBg = scene.add.rectangle(sbX + 58, sbY, 50, 50, 0x222222).setOrigin(0).setDepth(100).setStrokeStyle(2, 0x444444);
        this.skillLText = scene.add.text(sbX + 58 + 25, sbY + 10, 'L\n闪电', {
            fontSize: '11px', fill: '#ffff00', fontFamily: 'Arial', align: 'center'
        }).setOrigin(0.5, 0).setDepth(102);
        this.skillLCooldown = scene.add.rectangle(sbX + 58, sbY, 50, 50, 0x000000, 0.7).setOrigin(0).setDepth(101);
        
        // ── Score ──
        this.scoreText = scene.add.text(GAME_WIDTH - 15, 15, '分数: 0', {
            fontSize: '16px', fill: '#ffcc00', fontFamily: 'Arial Black'
        }).setOrigin(1, 0).setDepth(102);
        
        // ── Kill count ──
        this.killText = scene.add.text(GAME_WIDTH - 15, 38, '击杀: 0', {
            fontSize: '13px', fill: '#aaaaaa', fontFamily: 'Arial'
        }).setOrigin(1, 0).setDepth(102);
        
        // ── Level indicator ──
        this.levelText = scene.add.text(GAME_WIDTH / 2, 15, '第 1 关: 黑暗森林', {
            fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial Black'
        }).setOrigin(0.5, 0).setDepth(102);
    }
    
    update(time) {
        if (!this.player || !this.player.active) return;
        
        // HP
        const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
        this.hpBar.width = 200 * hpRatio;
        this.hpText.setText(`HP ${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
        
        // Color shift when low HP
        if (hpRatio < 0.25) {
            this.hpBar.setFillStyle(0xff0000);
        } else if (hpRatio < 0.5) {
            this.hpBar.setFillStyle(0xff8800);
        } else {
            this.hpBar.setFillStyle(0xff3333);
        }
        
        // MP
        const mpRatio = Math.max(0, this.player.mp / this.player.maxMp);
        this.mpBar.width = 150 * mpRatio;
        this.mpText.setText(`MP ${Math.ceil(this.player.mp)}/${this.player.maxMp}`);
        
        // Skill K cooldown
        const fbSpell = this.player.spells.fireball;
        const fbElapsed = time - fbSpell.lastUsed;
        const fbCdRatio = Math.min(1, fbElapsed / fbSpell.cooldownMs);
        this.skillKCooldown.height = 50 * fbCdRatio;
        this.skillKCooldown.y = this.skillKBg.y + 50 * (1 - fbCdRatio);
        this.skillKCooldown.setAlpha(0.7);
        
        // Skill L cooldown
        const ltSpell = this.player.spells.lightning;
        const ltElapsed = time - ltSpell.lastUsed;
        const ltCdRatio = Math.min(1, ltElapsed / ltSpell.cooldownMs);
        this.skillLCooldown.height = 50 * ltCdRatio;
        this.skillLCooldown.y = this.skillLBg.y + 50 * (1 - ltCdRatio);
        this.skillLCooldown.setAlpha(0.7);
    }
    
    setScore(score, kills) {
        this.scoreText.setText(`分数: ${score}`);
        this.killText.setText(`击杀: ${kills}`);
    }
    
    setLevel(name) {
        this.levelText.setText(name);
    }
    
    setHpColor(color) {
        this.hpBar.setFillStyle(color);
    }
}
