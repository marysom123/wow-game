// Enemy base class
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type, hp, atk, spd, scoreValue) {
        super(scene, x, y, type, 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.scene = scene;
        this.type = type;
        this.hp = hp;
        this.maxHp = hp;
        this.atk = atk;
        this.spd = spd;
        this.scoreValue = scoreValue || 10;
        this.lastAttackTime = 0;
        this.enraged = false;

        this.body.setSize(this.width * 0.8, this.height * 0.9);
        this.body.setOffset(4, 8);
        this.setCollideWorldBounds(true);
    }

    update(player, time) {
        if (!player || !player.active || !this.active) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // ── Dark Knight special: Enrage at 50% HP ──
        if (this.type === 'darkknight') {
            if (this.hp <= this.maxHp * 0.5 && !this.enraged) {
                this.enraged = true;
                this.spd = Math.floor(this.spd * 1.5);
                this.atk = Math.floor(this.atk * 1.3);
                this.setTint(0xff0000);
                this.scene.time.delayedCall(200, () => { if (this.active) this.clearTint(); });
                const enrageTxt = this.scene.add.text(this.x, this.y - 60, '⚔️ 狂暴!', {
                    fontSize: '22px', fill: '#ff0000', fontFamily: 'Arial Black'
                }).setOrigin(0.5).setDepth(200);
                this.scene.time.delayedCall(1200, () => enrageTxt.destroy());
            }
        }

        // ── Chase logic ──
        if (dist < 400) {
            const dir = this.x < player.x ? 1 : -1;
            this.setVelocityX(this.spd * dir);
            this.setFlipX(dir < 0);

            if (dist < 45) {
                const now = this.scene.time.now;
                const attackCd = this.type === 'darkknight' ? 1200 : 1000;
                if (now - this.lastAttackTime > attackCd) {
                    this.lastAttackTime = now;
                    player.takeDamage(this.atk);
                    this.scene.screenShake && this.scene.screenShake(this.type === 'darkknight' ? 8 : 4);
                }
            }
        } else {
            this.setVelocityX(0);
        }
    }

    takeDamage(amount) {
        if (!this.active) return;
        this.hp -= amount;

        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => { if (this.active) this.clearTint(); });

        const dmgTxt = this.scene.add.text(this.x, this.y - 30, `-${amount}`, {
            fontSize: this.type === 'darkknight' ? '20px' : '14px',
            fill: '#ffff00', fontFamily: 'Arial Black'
        }).setOrigin(0.5).setDepth(200);
        this.scene.time.delayedCall(400, () => dmgTxt.destroy());

        // Emit boss HP update event for darkknight
        if (this.type === 'darkknight' && this.scene.events) {
            this.scene.events.emit('bossDamaged', this.hp, this.maxHp);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.onDeath();
        }
    }

    onDeath() {
        if (!this.active) return;

        // Death explosion particles
        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.circle(
                this.x + Phaser.Math.Between(-20, 20),
                this.y + Phaser.Math.Between(-20, 20),
                Phaser.Math.Between(4, 10),
                this.type === 'darkknight' ? 0xff0000 : (this.type === 'ogre' ? 0x8B4513 : 0x00ff44),
                0.8
            );
            this.scene.time.delayedCall(500, () => particle.destroy());
        }

        // Hide boss HP bar on darkknight death
        if (this.type === 'darkknight') {
            this.scene.hideBossHP && this.scene.hideBossHP();
            // Extra screen shake for boss death
            this.scene.screenShake && this.scene.screenShake(12);
        }

        this.scene.events.emit('enemyKilled', this.type, this.x, this.y, this.scoreValue);
        this.destroy();
    }
}
