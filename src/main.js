// wow-game/src/main.js
import Player from './entities/Player.js';
import Enemy from './entities/Enemy.js';
import HUD from './ui/HUD.js';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const COLORS = {
    hp: 0xff3333,
    mp: 0x3366ff,
    ui: 0x222222
};

class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    preload() {
        // Create placeholder textures using graphics
        const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        playerGraphics.fillStyle(0x00ff88, 1);
        playerGraphics.fillRect(0, 0, 32, 48);
        playerGraphics.generateTexture('player_idle', 32, 48);

        playerGraphics.clear();
        playerGraphics.fillStyle(0xff6600, 1);
        playerGraphics.fillRect(0, 0, 32, 48);
        playerGraphics.generateTexture('player_attack', 48, 48);

        playerGraphics.clear();
        playerGraphics.fillStyle(0x4488ff, 1);
        playerGraphics.fillCircle(16, 16, 16);
        playerGraphics.generateTexture('fireball', 32, 32);

        playerGraphics.clear();
        playerGraphics.fillStyle(0xffff00, 1);
        playerGraphics.fillCircle(40, 40, 40);
        playerGraphics.generateTexture('lightning', 80, 80);

        playerGraphics.clear();
        playerGraphics.fillStyle(0x888888, 1);
        playerGraphics.fillRect(0, 0, 32, 16);
        playerGraphics.generateTexture('platform', 32, 16);

        // Placeholder for goblin (not used yet)
        this.load.image('goblin', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8CwDwADlQGPb8aO9gAAAABJRU5ErkJggg==');
    }
    create() { this.scene.start('MenuScene'); }
}

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }
    create() {
        this.add.text(GAME_WIDTH/2, 150, '黑暗征途', { fontSize: '52px', fill: '#ffcc00', fontFamily: 'Arial Black' }).setOrigin(0.5);
        this.add.text(GAME_WIDTH/2, 220, 'WoW Style Side-Scroller', { fontSize: '18px', fill: '#aaaaaa' }).setOrigin(0.5);
        
        const startBtn = this.add.text(GAME_WIDTH/2, 350, '[ 开始游戏 ]', { fontSize: '36px', fill: '#ffffff', fontFamily: 'Arial' }).setOrigin(0.5).setInteractive();
        startBtn.on('pointerover', () => startBtn.setFill('#ffcc00'));
        startBtn.on('pointerout', () => startBtn.setFill('#ffffff'));
        startBtn.on('pointerdown', () => this.scene.start('GameScene'));
        
        const infoText = this.add.text(GAME_WIDTH/2, 480, '操作: WASD移动 | J普攻 | K火球 | L闪电 | 空格跳跃', { fontSize: '14px', fill: '#888888' }).setOrigin(0.5);
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    
    create() {
        // Background color
        this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);
        
        // Ground platform
        const ground = this.physics.add.staticGroup();
        const groundSprite = ground.create(GAME_WIDTH/2, GAME_HEIGHT - 15, 'platform');
        groundSprite.setScale(GAME_WIDTH / 32, 1).refreshBody();
        groundSprite.setVisible(false);
        this.platforms = ground;
        
        // Score tracking
        this.score = 0;
        this.killCount = 0;
        
        // Create player at center-bottom
        this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 100);
        this.physics.add.collider(this.player, ground);
        
        // HUD
        this.hud = new HUD(this, this.player);
        
        // ── Skill Projectiles ──
        this.projectiles = this.physics.add.group();
        
        // ── Screen shake utility ──
        this.screenShake = (intensity = 5) => {
            this.cameras.main.shake(200, intensity / 1000);
        };

        // ── Boss HP Bar ──
        this.bossHPBar = null;
        this.bossHPBarBg = null;
        this.bossNameText = null;

        this.showBossHP = (enemy) => {
            if (this.bossHPBar) return;
            const bw = 400, bh = 24, bx = (GAME_WIDTH - bw) / 2, by = 60;
            this.bossHPBarBg = this.add.rectangle(bx, by, bw, bh, 0x333333).setOrigin(0).setDepth(150);
            this.bossHPBar = this.add.rectangle(bx, by, bw, bh, 0xff0000).setOrigin(0).setDepth(151);
            this.bossNameText = this.add.text(GAME_WIDTH/2, by - 18, '黑暗骑士', {
                fontSize: '18px', fill: '#ff3333', fontFamily: 'Arial Black'
            }).setOrigin(0.5).setDepth(152);
            enemy.on('bossDamaged', (hp, maxHp) => {
                if (this.bossHPBar) this.bossHPBar.width = bw * (hp / maxHp);
            });
        };

        this.hideBossHP = () => {
            if (this.bossHPBar) { this.bossHPBar.destroy(); this.bossHPBar = null; }
            if (this.bossHPBarBg) { this.bossHPBarBg.destroy(); this.bossHPBarBg = null; }
            if (this.bossNameText) { this.bossNameText.destroy(); this.bossNameText = null; }
        };

        // ── Enemy group ──
        this.enemies = this.physics.add.group();
        
        // ── Handle playerAttack event ──
        this.player.on('playerAttack', (data) => {
            // Visual slash effect
            const slash = this.add.rectangle(data.x, data.y - 5, 40, 20, 0xffffff, 0.8);
            slash.setRotation(data.direction > 0 ? 0.3 : -0.3);
            this.time.delayedCall(150, () => slash.destroy());
            
            // Check damage to enemies in range
            this.enemies.getChildren().forEach(enemy => {
                if (enemy && enemy.active && Math.abs(enemy.x - data.x) < 50 && Math.abs(enemy.y - data.y) < 40) {
                    enemy.takeDamage(data.damage);
                }
            });
        });
        
        // ── Handle playerCastSpell ──
        this.player.on('playerCastSpell', (data) => {
            if (data.spellName === 'fireball') {
                const fb = this.physics.add.sprite(data.x, data.y, 'fireball');
                fb.damage = data.damage;
                fb.direction = data.direction;
                fb.setVelocityX(data.direction * 250);
                fb.setCircle(16, 0, 0);
                this.projectiles.add(fb);
                
                // Trail effect
                this.time.addEvent({
                    delay: 50,
                    repeat: 10,
                    callback: () => {
                        if (fb.active) {
                            const trail = this.add.circle(fb.x, fb.y, 8, 0xff6600, 0.5);
                            this.time.delayedCall(100, () => trail.destroy());
                        }
                    }
                });
                
                // Destroy after 2s or leaving screen
                this.time.delayedCall(2000, () => { if (fb.active) fb.destroy(); });
            }
            else if (data.spellName === 'lightning') {
                // AOE visual effect
                const aoe = this.add.circle(data.x, data.y, 100, 0xffff00, 0.3);
                const ring = this.add.circle(data.x, data.y, 100, 0xffff00, 0.8);
                ring.setStrokeStyle(4, 0xffff00);
                
                let radius = 0;
                const expand = this.time.addEvent({
                    delay: 50,
                    repeat: 10,
                    callback: () => {
                        radius += 10;
                        aoe.setRadius(radius);
                        // Damage enemies in range
                        this.enemies.getChildren().forEach(enemy => {
                            if (enemy && enemy.active && Phaser.Math.Distance.Between(data.x, data.y, enemy.x, enemy.y) < radius) {
                                enemy.takeDamage(Math.floor(data.damage / 3));
                            }
                        });
                    }
                });
                
                this.time.delayedCall(600, () => { aoe.destroy(); ring.destroy(); });
            }
        });
        
        // ── Handle playerNoMp ──
        this.player.on('playerNoMp', () => {
            const txt = this.add.text(this.player.x, this.player.y - 60, 'MP不足!', {
                fontSize: '16px', fill: '#ff3333', fontFamily: 'Arial Black'
            }).setOrigin(0.5);
            this.time.delayedCall(500, () => txt.destroy());
        });
        
        // ── Level System ──
        this.currentLevel = 1;
        this.enemiesRemaining = 0;
        this.totalKills = 0;
        
        // Level configs
        this.levelConfigs = {
            1: {
                name: '第 1 关: 黑暗森林',
                waves: [
                    { enemies: [{ type: 'goblin', count: 2 }], delay: 1000 },
                    { enemies: [{ type: 'goblin', count: 3 }], delay: 4000 }
                ],
                goalKills: 5
            },
            2: {
                name: '第 2 关: 废弃矿坑',
                waves: [
                    { enemies: [{ type: 'skeleton', count: 3 }], delay: 1000 },
                    { enemies: [{ type: 'skeleton', count: 3 }], delay: 4000 },
                    { enemies: [{ type: 'skeleton', count: 2 }], delay: 7000 }
                ],
                goalKills: 8
            },
            3: {
                name: '第 3 关: 兽人营地',
                waves: [
                    { enemies: [{ type: 'goblin', count: 3 }], delay: 1000 },
                    { enemies: [{ type: 'ogre', count: 2 }], delay: 4000 }
                ],
                goalKills: 5
            },
            4: {
                name: 'BOSS: 黑暗骑士',
                waves: [
                    { enemies: [{ type: 'darkknight', count: 1 }], delay: 2000 }
                ],
                goalKills: 1,
                isBoss: true
            }
        };
        
        this.levelEnemyTypes = {
            goblin: { hp: 30, atk: 5, spd: 80, score: 10 },
            skeleton: { hp: 50, atk: 8, spd: 60, score: 20 },
            ogre: { hp: 150, atk: 15, spd: 40, score: 50 },
            darkknight: { hp: 500, atk: 20, spd: 100, score: 200 }
        };
        
        this.events.on('enemyKilled', (type, x, y, score) => {
            this.totalKills++;
            this.score = (this.score || 0) + (score || 10);
            if (this.hud) this.hud.setScore(this.score, this.totalKills);
            
            const txt = this.add.text(x, y - 40, `+${score || 10}`, {
                fontSize: '16px', fill: '#00ff00', fontFamily: 'Arial Black'
            }).setOrigin(0.5).setDepth(200);
            this.time.delayedCall(600, () => txt.destroy());
            
            // Check if level complete
            this.checkLevelComplete();
        });
        
        // Check level complete
        this.checkLevelComplete = () => {
            const config = this.levelConfigs[this.currentLevel];
            if (!config) return;
            
            const alive = this.enemies.getChildren().filter(e => e.active).length;
            if (this.totalKills >= config.goalKills && alive === 0) {
                this.onLevelComplete();
            }
        };
        
        this.onLevelComplete = () => {
            const config = this.levelConfigs[this.currentLevel];
            this.hideBossHP();
            
            if (this.currentLevel >= 4) {
                // Victory!
                this.time.delayedCall(1500, () => {
                    this.scene.start('GameOverScene', { victory: true, score: this.score });
                });
                return;
            }
            
            // Next level
            this.currentLevel++;
            const nextConfig = this.levelConfigs[this.currentLevel];
            
            const overlay = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, 400, 200, 0x000000, 0.85)
                .setDepth(300).setOrigin(0.5);
            const completeText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 40, `第 ${this.currentLevel - 1} 关完成!`, {
                fontSize: '28px', fill: '#ffcc00', fontFamily: 'Arial Black'
            }).setOrigin(0.5).setDepth(301);
            const nextText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 20, nextConfig.name, {
                fontSize: '18px', fill: '#ffffff', fontFamily: 'Arial'
            }).setOrigin(0.5).setDepth(301);
            
            this.time.delayedCall(2500, () => {
                overlay.destroy();
                completeText.destroy();
                nextText.destroy();
                if (this.hud) this.hud.setLevel(nextConfig.name);
                this.spawnLevelWaves();
            });
        };
        
        // Spawn enemies for current level
        this.spawnLevelWaves = () => {
            const config = this.levelConfigs[this.currentLevel];
            if (!config) return;
            
            // Generate enemy textures
            if (!this.textures.exists('goblin')) {
                const g = this.make.graphics({ x: 0, y: 0, add: false });
                g.fillStyle(0x00cc44, 1); g.fillRect(0, 0, 24, 24);
                g.fillStyle(0x000000, 1); g.fillRect(6, 6, 4, 4); g.fillRect(14, 6, 4, 4);
                g.generateTexture('goblin', 24, 24);
            }
            if (!this.textures.exists('skeleton')) {
                const s = this.make.graphics({ x: 0, y: 0, add: false });
                s.fillStyle(0xcccccc, 1); s.fillRect(0, 0, 24, 32);
                s.fillStyle(0x000000, 1); s.fillRect(6, 6, 4, 4); s.fillRect(14, 6, 4, 4);
                s.generateTexture('skeleton', 24, 32);
            }
            if (!this.textures.exists('ogre')) {
                const o = this.make.graphics({ x: 0, y: 0, add: false });
                o.fillStyle(0x8B4513, 1); o.fillRect(0, 0, 40, 48);
                o.fillStyle(0xff0000, 1); o.fillRect(14, 8, 12, 8);
                o.generateTexture('ogre', 40, 48);
            }
            if (!this.textures.exists('darkknight')) {
                const d = this.make.graphics({ x: 0, y: 0, add: false });
                d.fillStyle(0x333333, 1); d.fillRect(0, 0, 32, 56);
                d.fillStyle(0xff0000, 1); d.fillRect(10, 5, 12, 12);
                d.fillStyle(0x6600aa, 1); d.fillRect(12, 20, 8, 36);
                d.generateTexture('darkknight', 32, 56);
            }
            
            config.waves.forEach((wave, waveIdx) => {
                this.time.delayedCall(wave.delay, () => {
                    wave.enemies.forEach(enemyDef => {
                        for (let i = 0; i < enemyDef.count; i++) {
                            const stats = this.levelEnemyTypes[enemyDef.type];
                            const spawnX = 100 + (i % 3) * 250 + Math.random() * 100;
                            const spawnY = 400 + Math.random() * 100;
                            const enemy = new Enemy(this, spawnX, spawnY, enemyDef.type, stats.hp, stats.atk, stats.spd, stats.score);
                            this.enemies.add(enemy);
                            this.physics.add.collider(enemy, this.platforms);
                        }
                        // Show boss HP bar when darkknight spawns
                        if (enemyDef.type === 'darkknight') {
                            this.time.delayedCall(500, () => {
                                const boss = this.enemies.getChildren().find(e => e.type === 'darkknight');
                                if (boss) this.showBossHP(boss);
                            });
                        }
                    });
                });
            });
        };
        
        // Start first level
        if (this.hud) this.hud.setLevel(this.levelConfigs[1].name);
        this.spawnLevelWaves();
        
        // Projectile vs enemies
        this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) => {
            if (enemy.takeDamage) enemy.takeDamage(proj.damage || 10);
            if (proj.active) proj.destroy();
        });
        
        // Enemies attack player (handled in Enemy.update)
        this.physics.add.overlap(this.player, this.enemies, () => {});
        
        // Player death
        this.player.on('playerDead', () => {
            this.time.delayedCall(1000, () => {
                this.scene.start('GameOverScene', { victory: false, score: this.score });
            });
        });
    }
    
    update(time, delta) {
        if (this.player && this.player.active) {
            this.player.update(time, delta);
            if (this.hud) this.hud.update(time);
        }
        // Update all enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy && enemy.update && enemy.active) enemy.update(this.player, time);
        });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    create(data) {
        const msg = data && data.victory ? '通关胜利！' : '你已阵亡';
        const color = data && data.victory ? '#ffcc00' : '#ff3333';
        this.add.text(GAME_WIDTH/2, 200, msg, { fontSize: '48px', fill: color, fontFamily: 'Arial Black' }).setOrigin(0.5);
        
        const restartBtn = this.add.text(GAME_WIDTH/2, 350, '[ 重新开始 ]', { fontSize: '28px', fill: '#ffffff' }).setOrigin(0.5).setInteractive();
        restartBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false }
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    parent: 'game-container'
};
new Phaser.Game(config);
