import './style.css'
import Phaser from 'phaser'

const COLORS = {
  bg: 0x050505,
  player: 0xffffff,
  playerGlow: 0x00ffff,
  energy: 0xffd700,
  enemy: 0xff0055
};

let player;
let energyOrbs;
let darkMatter;
let life = 100;
let score = 0;
let scoreText;
let lifeText;
let gameActive = true;

class ArtGameScene extends Phaser.Scene {
  constructor() {
    super("art-scene");
  }

  create() {
    // Efektleri güvenli şekilde ekle
    try {
        this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);
    } catch (e) {
        console.log("Bloom effect not supported");
    }

    // Arkaplan tozları
    const particles = this.add.particles(0, 0, 'pixel', {
        speed: { min: 10, max: 30 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 4000,
        frequency: 100,
        tint: COLORS.playerGlow
    });
    
    // Pixel texture oluştur
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('pixel', 8, 8);

    // OYUNCU
    player = this.add.container(400, 300);
    const core = this.add.circle(0, 0, 10, COLORS.player);
    const aura = this.add.circle(0, 0, 20, COLORS.playerGlow, 0.4);
    player.add([aura, core]);
    
    this.physics.world.enable(player);
    player.body.setCircle(15, -15, -15);
    player.body.setCollideWorldBounds(true);

    // İz Efekti
    this.trail = this.add.particles(0, 0, 'pixel', {
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 600,
        speed: 0,
        tint: COLORS.playerGlow,
        blendMode: 'SCREEN',
        follow: player
    });

    energyOrbs = this.physics.add.group();
    darkMatter = this.physics.add.group();

    // UI
    scoreText = this.add.text(40, 40, '0', {
        fontFamily: 'Courier New', fontSize: '48px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    lifeText = this.add.text(40, 90, 'ENERGY STABLE', {
        fontFamily: 'Courier New', fontSize: '16px', color: '#00ffff'
    });

    // Zamanlayıcılar
    this.time.addEvent({ delay: 100, callback: this.decayLife, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 1500, callback: this.spawnEnergy, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 2000, callback: this.spawnDarkMatter, callbackScope: this, loop: true });

    // Etkileşimler
    this.physics.add.overlap(player, energyOrbs, this.collectEnergy, null, this);
    this.physics.add.overlap(player, darkMatter, this.takeDamage, null, this);
  }

  update() {
    if (!gameActive) return;

    // Mouse Takibi
    let pointer = this.input.activePointer;
    let distance = Phaser.Math.Distance.Between(player.x, player.y, pointer.x, pointer.y);

    if (distance > 5) {
        this.physics.moveToObject(player, pointer, 300 + (score));
    } else {
        player.body.setVelocity(0);
    }

    // Düşman Takibi
    darkMatter.children.iterate((enemy) => {
        if (enemy && enemy.active) {
            this.physics.moveToObject(enemy, player, 100 + (score * 0.5));
            enemy.rotation += 0.05;
        }
    });

    // UI Güncelleme
    if (life > 70) lifeText.setColor('#00ffff').setText("ENERGY: STABLE");
    else if (life > 30) lifeText.setColor('#ffcc00').setText("ENERGY: CRITICAL");
    else lifeText.setColor('#ff0000').setText("ENERGY: FAILING");
    
    player.alpha = life / 100;
  }

  spawnEnergy() {
    if (!gameActive) return;
    let x = Phaser.Math.Between(50, 750);
    let y = Phaser.Math.Between(50, 550);
    let orb = this.add.circle(x, y, 8, COLORS.energy);
    this.physics.add.existing(orb);
    energyOrbs.add(orb);
    this.tweens.add({ targets: orb, scale: { from: 0.8, to: 1.2 }, duration: 800, yoyo: true, repeat: -1 });
  }

  spawnDarkMatter() {
    if (!gameActive) return;
    let x, y;
    do {
        x = Phaser.Math.Between(0, 800);
        y = Phaser.Math.Between(0, 600);
    } while (Phaser.Math.Distance.Between(x, y, player.x, player.y) < 300);

    let enemy = this.add.rectangle(x, y, 20, 20, COLORS.enemy);
    this.physics.add.existing(enemy);
    darkMatter.add(enemy);
    this.tweens.add({ targets: enemy, alpha: { from: 0, to: 1 }, duration: 500 });
  }

  collectEnergy(player, orb) {
    orb.destroy();
    life = Math.min(life + 20, 100);
    score += 10;
    scoreText.setText(score);
    this.cameras.main.shake(50, 0.005);
  }

  takeDamage(player, enemy) {
    enemy.destroy();
    life -= 30;
    this.cameras.main.shake(200, 0.02);
    this.cameras.main.flash(200, 0xff0000);
    if (life <= 0) this.gameOver();
  }

  decayLife() {
    if (gameActive) {
        life -= 0.5 + (score * 0.01);
        if (life <= 0) this.gameOver();
    }
  }

  gameOver() {
    gameActive = false;
    this.physics.pause();
    player.visible = false;
    this.trail.stop();
    this.add.text(400, 300, 'ENTROPY CONSUMED YOU', {
        fontFamily: 'Courier New', fontSize: '40px', color: '#ff0055', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(400, 350, 'F5 to Restart', {
        fontFamily: 'Courier New', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5);
  }
}

const config = {
  type: Phaser.AUTO, // WEBGL yerine AUTO yaptım, daha garantidir
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [ArtGameScene]
};

const game = new Phaser.Game(config);
