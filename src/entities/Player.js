// Player entity with full movement, jump, and attack system
export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_idle', 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.body.setSize(24, 48);
        this.body.setOffset(6, 16);
        this.body.setMaxVelocity(300, 600);
        
        // Stats
        this.hp = 100;
        this.maxHp = 100;
        this.mp = 50;
        this.maxMp = 50;
        this.atk = 10;
        
        // Spells: { mpCost, cooldownMs, lastUsed }
        this.spells = {
            attack: { mpCost: 0, cooldownMs: 300, lastUsed: 0 },
            fireball: { mpCost: 10, cooldownMs: 3000, lastUsed: 0 },
            lightning: { mpCost: 20, cooldownMs: 8000, lastUsed: 0 }
        };
        
        // State
        this.isAttacking = false;
        this.isCasting = false;
        this.health = 100;
        this.facingRight = true;
        
        // Input
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keyA = scene.input.keyboard.addKey('A');
        this.keyD = scene.input.keyboard.addKey('D');
        this.keyW = scene.input.keyboard.addKey('W');
        this.keyJ = scene.input.keyboard.addKey('J');
        this.keyK = scene.input.keyboard.addKey('K');
        this.keyL = scene.input.keyboard.addKey('L');
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    
    update(time, delta) {
        // ── Movement ──
        const left = this.cursors.left.isDown || this.keyA.isDown;
        const right = this.cursors.right.isDown || this.keyD.isDown;
        
        if (left) {
            this.setVelocityX(-200);
            this.setFlipX(true);
            this.facingRight = false;
        } else if (right) {
            this.setVelocityX(200);
            this.setFlipX(false);
            this.facingRight = true;
        } else {
            this.setVelocityX(0);
        }
        
        // ── Jump ──
        const jumpJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.up) 
            || Phaser.Input.Keyboard.JustDown(this.keyW) 
            || Phaser.Input.Keyboard.JustDown(this.spaceKey);
        if (jumpJustDown && this.body.blocked.down) {
            this.setVelocityY(-420);
        }
        
        // ── Passive MP Regen ──
        if (this.mp < this.maxMp) {
            this.mp = Math.min(this.maxMp, this.mp + 0.04);
        }
        
        // ── Actions (no overlap) ──
        if (!this.isAttacking && !this.isCasting) {
            // Skill 1: Fireball (K)
            if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
                this.castFireball(time);
            }
            // Skill 2: Lightning (L)
            else if (Phaser.Input.Keyboard.JustDown(this.keyL)) {
                this.castLightning(time);
            }
            // Attack (J)
            else if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
                this.attack(time);
            }
        }
    }
    
    attack(time) {
        if (time - this.spells.attack.lastUsed < this.spells.attack.cooldownMs) return;
        this.spells.attack.lastUsed = time;
        
        this.isAttacking = true;
        this.setVelocityX(0);
        
        // Emit attack event for GameScene to handle
        this.scene.events.emit('playerAttack', {
            x: this.x + (this.facingRight ? 30 : -30),
            y: this.y,
            direction: this.facingRight ? 1 : -1,
            damage: this.atk
        });
        
        this.scene.time.delayedCall(300, () => { this.isAttacking = false; });
    }
    
    castFireball(time) {
        const spell = this.spells.fireball;
        if (this.mp < spell.mpCost) {
            this.scene.events.emit('playerNoMp');
            return;
        }
        if (time - spell.lastUsed < spell.cooldownMs) return;
        
        spell.lastUsed = time;
        this.mp -= spell.mpCost;
        this.isCasting = true;
        
        this.scene.events.emit('playerCastSpell', {
            spellName: 'fireball',
            x: this.x,
            y: this.y - 10,
            direction: this.facingRight ? 1 : -1,
            damage: this.atk * 2
        });
        
        this.scene.time.delayedCall(500, () => { this.isCasting = false; });
    }
    
    castLightning(time) {
        const spell = this.spells.lightning;
        if (this.mp < spell.mpCost) {
            this.scene.events.emit('playerNoMp');
            return;
        }
        if (time - spell.lastUsed < spell.cooldownMs) return;
        
        spell.lastUsed = time;
        this.mp -= spell.mpCost;
        this.isCasting = true;
        
        this.scene.events.emit('playerCastSpell', {
            spellName: 'lightning',
            x: this.x,
            y: this.y,
            direction: this.facingRight ? 1 : -1,
            damage: this.atk * 3
        });
        
        this.scene.time.delayedCall(600, () => { this.isCasting = false; });
    }
    
    takeDamage(amount) {
        if (this.hp <= 0) return;
        this.hp = Math.max(0, this.hp - amount);
        this.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => { if (this.hp > 0) this.clearTint(); });
        if (this.hp <= 0) {
            this.scene.events.emit('playerDead');
        }
    }
    
    getHpRatio() { return this.hp / this.maxHp; }
    getMpRatio() { return this.mp / this.maxMp; }
}
