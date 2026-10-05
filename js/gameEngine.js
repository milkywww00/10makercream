import * as THREE from 'three';
import { ScoopBuilder } from './scoopBuilder.js';
import { ConeBuilder } from './coneBuilder.js';
import { SoundManager } from './soundManager.js';
import { createDefaultScoopCharacter } from './characterLoader.js';

export const GAME_STATE = {
  READY: 'READY',
  PLAYING: 'PLAYING',
  COLLAPSING: 'COLLAPSING',
  GAMEOVER: 'GAMEOVER',
};

function generateScoreSignature(score, height) {
  const secret = '10makercream_salt_sec_982!';
  const str = `${score}:${height}:${secret}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export class GameEngine {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.sound = new SoundManager();
    this.scoopBuilder = new ScoopBuilder();
    this.coneBuilder = new ConeBuilder();

    this.state = GAME_STATE.READY;
    const defaultChar = createDefaultScoopCharacter();
    const savedCustom = this.loadSavedCharacters();
    if (savedCustom && savedCustom.length > 0) {
      this.activeRoster = savedCustom;
      const savedSelectedId = localStorage.getItem('10ice_selected_char_id');
      this.selectedCharacter = this.activeRoster.find(c => c.id === savedSelectedId) || this.activeRoster[0];
    } else {
      this.activeRoster = [defaultChar];
      this.selectedCharacter = defaultChar;
    }
    const selIdx = this.activeRoster.findIndex(c => c.id === this.selectedCharacter?.id);
    this.characterTurnIndex = selIdx >= 0 ? selIdx : 0;

    this.score = 0;
    this.stackCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = 3;

    const rawSavedScore = parseInt(localStorage.getItem('10ice_best_score') || '0', 10);
    const rawSavedHeight = parseInt(localStorage.getItem('10ice_best_height') || '0', 10);
    const savedSig = localStorage.getItem('10ice_score_sig');
    if (rawSavedScore > 0 || rawSavedHeight > 0) {
      if (savedSig !== generateScoreSignature(rawSavedScore, rawSavedHeight)) {
        this.bestScore = 0;
        this.bestHeight = 0;
        try {
          localStorage.removeItem('10ice_best_score');
          localStorage.removeItem('10ice_best_height');
          localStorage.removeItem('10ice_score_sig');
        } catch (e) {}
      } else {
        this.bestScore = rawSavedScore;
        this.bestHeight = rawSavedHeight;
      }
    } else {
      this.bestScore = 0;
      this.bestHeight = 0;
    }

    this._scoreMask = Math.floor(Math.random() * 0x7fffffff) + 1;
    this._maskedScore = 0 ^ this._scoreMask;
    this._scoreHistory = [];

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    this.coneGroup = null;
    this.coneTopY = 0.0;
    this.stackedScoops = [];
    this.fallingScoop = null;
    this.swingScoop = null;
    this.nextScoopTimer = null;

    this.swingTime = 0;
    this.swingSpeed = 2.4;
    this.swingAmp = 2.1;
    this.swingPhaseOffset = 0.0;
    this.dispenserY = 4.2;

    this.wobbleAngle = 0.0;
    this.wobbleVel = 0.0;
    this.wobbleTorque = 0.0;
    this.dangerLevel = 0.0;

    this.particles = [];
    this.cameraShake = 0.0;

    this.onStateChange = null;
    this.onScoreUpdate = null;
    this.onDangerUpdate = null;
    this.onJudgement = null;

    this.initScene();
  }

  initScene() {

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e0f2fe');

    const aspect = this.container.clientWidth / this.container.clientHeight;
    const fov = aspect < 1.0 ? 45 + (1.0 - aspect) * 18 : 45;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    this.camera.position.set(0, 2.5, 7.5);
    this.camera.lookAt(0, 1.7, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.2);
    dirLight.position.set(4, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#e0f2fe', 0.4);
    fillLight.position.set(-4, 6, -2);
    this.scene.add(fillLight);

    this.createEnvironment();

    const coneData = this.coneBuilder.build();
    this.coneGroup = coneData.group;
    this.coneTopY = coneData.topY;
    this.scene.add(this.coneGroup);

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  createEnvironment() {
    const envGroup = new THREE.Group();
    envGroup.name = 'Environment';

    this.floorColor1 = localStorage.getItem('10ice_floor_c1') || '#f0f9ff';
    this.floorColor2 = localStorage.getItem('10ice_floor_c2') || '#ecfccb';

    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.floorColor1;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = this.floorColor2;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillRect(128, 128, 128, 128);

    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(10, 10);

    const floorMat = new THREE.MeshToonMaterial({ map: floorTex });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -2.6;
    this.floorMesh.receiveShadow = true;
    envGroup.add(this.floorMesh);

    this.cloudMeshes = [];
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      const mainMat = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.82 });

      const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), mainMat);
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), mainMat);
      c2.position.set(-0.9, -0.15, 0);
      const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), mainMat);
      c3.position.set(0.9, -0.1, 0);

      cloud.add(c1, c2, c3);

      cloud.position.set((Math.random() - 0.5) * 24, 1.5 + i * 4.2, -8.0 - Math.random() * 6.0);
      const s = 1.0 + Math.random() * 0.6;
      cloud.scale.set(s, s * 0.75, s * 0.6);

      cloud.userData = {
        baseX: cloud.position.x,
        baseY: cloud.position.y,
        speed: 0.15 + Math.random() * 0.20,
        phase: Math.random() * Math.PI * 2,
      };

      this.cloudMeshes.push(cloud);
      envGroup.add(cloud);
    }

    this.balloonMeshes = [];
    const balloonColors = ['#a3e635', '#38bdf8', '#f472b6'];
    for (let i = 0; i < 3; i++) {
      const balloonGroup = new THREE.Group();
      const bGeo = new THREE.SphereGeometry(0.40, 16, 14);
      bGeo.scale(1.0, 1.22, 1.0);
      const bMat = new THREE.MeshToonMaterial({ color: balloonColors[i % balloonColors.length] });
      const bMesh = new THREE.Mesh(bGeo, bMat);

      const knotGeo = new THREE.ConeGeometry(0.07, 0.10, 6);
      knotGeo.rotateX(Math.PI);
      const knotMesh = new THREE.Mesh(knotGeo, bMat);
      knotMesh.position.y = -0.52;
      balloonGroup.add(bMesh, knotMesh);

      const bx = (i % 2 === 0 ? 1 : -1) * (5.5 + i * 0.8);
      const by = 2.5 + i * 3.8;
      const bz = -5.0;
      balloonGroup.position.set(bx, by, bz);

      balloonGroup.userData = {
        baseX: bx,
        baseY: by,
        speed: 0.5 + Math.random() * 0.3,
        swaySpeed: 0.8 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      };

      this.balloonMeshes.push(balloonGroup);
      envGroup.add(balloonGroup);
    }

    this.starMeshes = [];

    this.scene.add(envGroup);
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.fov = this.camera.aspect < 1.0 ? 45 + (1.0 - this.camera.aspect) * 18 : 45;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  getNextCharacter() {
    if (!this.activeRoster || this.activeRoster.length === 0) {
      const def = createDefaultScoopCharacter();
      this.activeRoster = [def];
      return def;
    }
    if (this.activeRoster.length === 1) {
      return this.activeRoster[0];
    }
    const idx = (this.characterTurnIndex || 0) % this.activeRoster.length;
    const char = this.activeRoster[idx];
    this.characterTurnIndex = (this.characterTurnIndex || 0) + 1;
    if (!char || !char.state) {
      return this.activeRoster[0] || createDefaultScoopCharacter();
    }
    return char;
  }

  clearNextScoopTimer() {
    if (this.nextScoopTimer) {
      clearTimeout(this.nextScoopTimer);
      this.nextScoopTimer = null;
    }
  }

  verifyIntegrity() {
    if ((this._maskedScore ^ this._scoreMask) !== this.score) {
      return false;
    }
    const sum = this._scoreHistory.reduce((a, b) => a + b, 0);
    if (sum !== this.score) {
      return false;
    }
    return true;
  }

  startNewGame() {
    this.clearNextScoopTimer();
    this.sound.init();
    this.sound.startBgm();

    this.stackedScoops.forEach((s) => this.scene.remove(s.group));
    this.stackedScoops = [];

    if (this.fallingScoop) {
      this.scene.remove(this.fallingScoop.group);
      this.fallingScoop = null;
    }
    if (this.swingScoop) {
      this.scene.remove(this.swingScoop.group);
      this.swingScoop = null;
    }

    const toRemove = [];
    this.scene.children.forEach((child) => {
      if (child.userData && child.userData.isScoopRoot && child !== this.coneGroup) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => this.scene.remove(obj));

    this.score = 0;
    this._scoreMask = Math.floor(Math.random() * 0x7fffffff) + 1;
    this._maskedScore = 0 ^ this._scoreMask;
    this._scoreHistory = [];
    this.stackCount = 0;
    this.combo = 0;
    this.lives = 3;
    const selIdx = this.activeRoster.findIndex(c => c.id === this.selectedCharacter?.id);
    this.characterTurnIndex = selIdx >= 0 ? selIdx : 0;
    this.wobbleAngle = 0.0;
    this.wobbleVel = 0.0;
    this.wobbleTorque = 0.0;
    this.dangerLevel = 0.0;
    this.state = GAME_STATE.PLAYING;

    this.prepareNextSwingScoop();
    this.updateCameraTarget(true);
    this.notifyUpdate();
  }

  prepareNextSwingScoop() {
    this.clearNextScoopTimer();

    if (this.swingScoop) {
      this.scene.remove(this.swingScoop.group);
      this.swingScoop = null;
    }

    const charData = this.getNextCharacter();
    const hasSprinkles = this.combo >= 2;
    const hasCherry = this.combo >= 4 && this.stackCount >= 5;

    let scoopData;
    try {
      scoopData = this.scoopBuilder.buildScoop(charData.state, { hasSprinkles, hasCherry });
    } catch (err) {
      console.warn('스쿱 생성 실패 fallback:', err);
      const defState = createDefaultScoopCharacter().state;
      scoopData = this.scoopBuilder.buildScoop(defState, { hasSprinkles: false, hasCherry: false });
    }

    const group = scoopData.group;
    group.userData.isScoopRoot = true;

    const targetY = this.getCurrentStackTopY() + 2.5;
    this.dispenserY = targetY;
    this.swingPhaseOffset = Math.random() * Math.PI * 2;
    this.swingTime += (Math.random() - 0.5) * 1.5;
    group.position.set(0, targetY, 0);
    this.scene.add(group);

    this.swingScoop = {
      group,
      data: scoopData,
      character: charData,
    };
  }

  getCurrentStackTopY() {
    if (this.stackedScoops.length === 0) {
      return this.coneTopY + 0.55;
    }
    const last = this.stackedScoops[this.stackedScoops.length - 1];
    return last.group.position.y + 0.78;
  }

  getCurrentStackTopX() {
    if (this.stackedScoops.length === 0) {
      return 0.0;
    }
    const last = this.stackedScoops[this.stackedScoops.length - 1];
    return last.group.position.x;
  }

  dropScoop() {
    if (this.state !== GAME_STATE.PLAYING || !this.swingScoop || this.fallingScoop) {
      return;
    }

    const { group, data, character } = this.swingScoop;
    this.swingScoop = null;

    const startX = group.position.x;
    const startY = group.position.y;

    this.fallingScoop = {
      group,
      data,
      character,
      x: startX,
      y: startY,
      vx: 0.0,
      vy: 0.0,
      squash: 1.0,
    };

    this.sound.playDrop();
  }

  handleLanding() {
    const falling = this.fallingScoop;
    this.fallingScoop = null;

    const topY = this.getCurrentStackTopY();
    const topX = this.getCurrentStackTopX();
    const deltaX = falling.x - topX;
    const absDelta = Math.abs(deltaX);

    const PERFECT_LIMIT = 0.22;
    const GREAT_LIMIT = 0.52;
    const GOOD_LIMIT = 0.88;

    if (absDelta > GOOD_LIMIT) {

      this.handleMiss(falling, deltaX);
      return;
    }

    let judgement = 'GOOD';
    let pts = 300;
    const placedX = falling.x;

    if (absDelta <= PERFECT_LIMIT) {
      judgement = 'PERFECT';
      pts = 1000 + this.combo * 250;
      this.combo++;

      const dampVel = Math.min(0.65, 0.35 + this.stackCount * 0.002);
      const dampAngle = Math.min(0.85, 0.65 + this.stackCount * 0.0015);
      this.wobbleVel *= dampVel;
      this.wobbleAngle *= dampAngle;
      this.spawnParticles(falling.x, topY, 'gold', 24);
      this.sound.playPerfect(this.combo);
    } else if (absDelta <= GREAT_LIMIT) {
      judgement = 'GREAT';
      pts = 600;
      this.combo = Math.max(1, this.combo);
      this.wobbleVel *= 0.75;
      this.spawnParticles(falling.x, topY, 'sparkle', 14);
      this.sound.playGreat();
    } else {
      judgement = 'GOOD';
      pts = 300;
      this.combo = 0;
      this.sound.playGood();
    }

    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    this.sound.playSquash();

    this.stackCount++;
    this._scoreHistory.push(pts);
    this.score += pts;
    this._maskedScore = this.score ^ this._scoreMask;

    if (!this.verifyIntegrity()) {
      this.score = 0;
      this._maskedScore = 0 ^ this._scoreMask;
      this._scoreHistory = [];
      this.triggerGameOver('비정상적인 점수 조작이 감지되었습니다.');
      return;
    }

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem('10ice_best_score', String(this.bestScore));
        localStorage.setItem('10ice_best_height', String(this.bestHeight));
        localStorage.setItem('10ice_score_sig', generateScoreSignature(this.bestScore, this.bestHeight));
      } catch (e) {}
    }
    if (this.stackCount > this.bestHeight) {
      this.bestHeight = this.stackCount;
      try {
        localStorage.setItem('10ice_best_score', String(this.bestScore));
        localStorage.setItem('10ice_best_height', String(this.bestHeight));
        localStorage.setItem('10ice_score_sig', generateScoreSignature(this.bestScore, this.bestHeight));
      } catch (e) {}
    }

    const bendX = this.wobbleAngle * (topY - this.coneTopY) * 0.28;
    const placedRelX = placedX - bendX;

    falling.group.position.set(placedX, topY, 0);
    this.stackedScoops.push({
      group: falling.group,
      data: falling.data,
      character: falling.character,
      x: placedRelX,
      y: topY,
      origY: topY,
      squishT: 0.25,
      tiltZ: 0.0,
    });

    const impulse = (deltaX > 0 ? 1 : -1) * Math.pow(absDelta, 1.1) * 1.5;
    this.wobbleVel += impulse;

    if (this.stackedScoops.length >= 2) {
      const prev = this.stackedScoops[this.stackedScoops.length - 2];
      prev.squishT = 0.20;
    }

    if (this.onJudgement) {
      this.onJudgement({
        type: judgement,
        combo: this.combo,
        scoreDelta: pts,
        deltaX,
      });
    }

    this.notifyUpdate();

    this.updateCameraTarget();

    this.clearNextScoopTimer();
    const respawnDelay = 220 + Math.random() * 120;
    this.nextScoopTimer = setTimeout(() => {
      this.nextScoopTimer = null;
      if (this.state === GAME_STATE.PLAYING) {
        this.prepareNextSwingScoop();
      }
    }, respawnDelay);
  }

  handleMiss(falling, deltaX) {
    this.combo = 0;
    this.lives--;

    const dir = deltaX > 0 ? 1 : -1;
    const tumbleScoop = {
      group: falling.group,
      vx: dir * (2.4 + Math.random()),
      vy: 2.0,
      vz: 0.5,
      rotZ: dir * 5.0,
      y: falling.y,
    };

    const dropAnim = () => {
      tumbleScoop.y += tumbleScoop.vy * 0.016;
      tumbleScoop.vy -= 18.0 * 0.016;
      tumbleScoop.group.position.x += tumbleScoop.vx * 0.016;
      tumbleScoop.group.position.y = tumbleScoop.y;
      tumbleScoop.group.rotation.z += tumbleScoop.rotZ * 0.016;

      if (tumbleScoop.y > -8) {
        requestAnimationFrame(dropAnim);
      } else {
        this.scene.remove(tumbleScoop.group);
      }
    };
    dropAnim();

    if (this.onJudgement) {
      this.onJudgement({ type: 'MISS', combo: 0, scoreDelta: 0, deltaX });
    }

    if (this.lives <= 0) {
      this.clearNextScoopTimer();
      this.triggerGameOver('기회를 모두 소진했습니다!');
    } else {
      this.notifyUpdate();
      this.clearNextScoopTimer();
      const respawnDelay = 420 + Math.random() * 120;
      this.nextScoopTimer = setTimeout(() => {
        this.nextScoopTimer = null;
        if (this.state === GAME_STATE.PLAYING) {
          this.prepareNextSwingScoop();
        }
      }, respawnDelay);
    }
  }

  triggerCollapse() {
    if (this.state === GAME_STATE.COLLAPSING || this.state === GAME_STATE.GAMEOVER) return;
    this.clearNextScoopTimer();
    this.state = GAME_STATE.COLLAPSING;

    if (this.swingScoop) {
      this.scene.remove(this.swingScoop.group);
      this.swingScoop = null;
    }
    if (this.fallingScoop) {
      this.scene.remove(this.fallingScoop.group);
      this.fallingScoop = null;
    }

    this.sound.playCollapse();
    this.cameraShake = 0.35;

    const tiltDir = this.wobbleAngle > 0 ? 1 : -1;

    this.stackedScoops.forEach((item, idx) => {
      const heightFactor = (idx + 1) / (this.stackedScoops.length || 1);
      const scatterVx = tiltDir * (1.8 + heightFactor * 3.5) + (Math.random() - 0.5) * 1.5;
      const scatterVy = 2.0 + Math.random() * 3.0;
      const scatterVz = (Math.random() - 0.5) * 2.0;
      const rotSpd = tiltDir * (4.0 + Math.random() * 4.0);

      const scoopObj = item.group;
      let curX = scoopObj.position.x;
      let curY = scoopObj.position.y;
      let curZ = scoopObj.position.z;
      let vy = scatterVy;

      const collapseStep = () => {
        vy -= 18.0 * 0.016;
        curX += scatterVx * 0.016;
        curY += vy * 0.016;
        curZ += scatterVz * 0.016;

        scoopObj.position.set(curX, curY, curZ);
        scoopObj.rotation.z += rotSpd * 0.016;
        scoopObj.rotation.x += (Math.random() - 0.5) * 0.1;

        if (curY > -6) {
          requestAnimationFrame(collapseStep);
        } else {
          this.scene.remove(scoopObj);
        }
      };

      setTimeout(collapseStep, idx * 35);
    });

    setTimeout(() => {
      this.triggerGameOver('탑이 너무 삐뚤어서 와르르 무너졌습니다!');
    }, 1800);
  }

  triggerGameOver(reason = '') {
    this.clearNextScoopTimer();
    this.state = GAME_STATE.GAMEOVER;
    this.sound.stopBgm();
    if (!this.verifyIntegrity()) {
      this.score = 0;
      this._maskedScore = 0 ^ this._scoreMask;
      this._scoreHistory = [];
      reason = '비정상적인 점수 조작이 감지되어 점수가 무효화되었습니다.';
    }
    this.notifyUpdate(reason);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.updateSwing(dt);
    this.updateFalling(dt);
    this.updateWobble(dt);
    this.updateScoopSquash(dt);
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.updateEnvironment(dt);

    this.renderer.render(this.scene, this.camera);
  }

  updateEnvironment(dt) {
    const elapsed = this.clock.getElapsedTime();

    if (this.cloudMeshes) {
      this.cloudMeshes.forEach((cloud) => {
        const u = cloud.userData;
        cloud.position.x = u.baseX + Math.sin(elapsed * u.speed + u.phase) * 0.8;
        cloud.position.y = u.baseY + Math.cos(elapsed * (u.speed * 0.7) + u.phase) * 0.25;
      });
    }

    if (this.balloonMeshes) {
      this.balloonMeshes.forEach((b) => {
        const u = b.userData;
        b.position.x = u.baseX + Math.sin(elapsed * u.swaySpeed + u.phase) * 0.45;
        b.position.y = u.baseY + Math.cos(elapsed * u.speed + u.phase) * 0.35;
        b.rotation.z = Math.sin(elapsed * u.swaySpeed + u.phase) * 0.08;
      });
    }

    if (this.starMeshes) {
      this.starMeshes.forEach((star) => {
        const u = star.userData;
        star.rotation.x += u.rotSpeedX * dt;
        star.rotation.y += u.rotSpeedY * dt;
        star.position.y = u.baseY + Math.sin(elapsed * u.bobSpeed + u.phase) * 0.22;
      });
    }
  }

  updateSwing(dt) {
    if (this.state !== GAME_STATE.PLAYING) return;

    if (!this.swingScoop && !this.fallingScoop && !this.nextScoopTimer) {
      this.prepareNextSwingScoop();
      return;
    }
    if (!this.swingScoop) return;

    const baseProgress = Math.min(1.2, this.stackCount * 0.025);
    const highStackBonus = Math.min(1.0, Math.log10(1 + Math.max(0, this.stackCount - 15) * 0.05) * 0.65);
    const speedScale = 1.0 + baseProgress + highStackBonus;

    this.swingTime += dt * speedScale;

    const windIntensity = Math.min(1.0, Math.max(0, (this.stackCount - 20) / 80));
    const harmonicX = Math.sin(this.swingTime * this.swingSpeed * 0.45 + (this.swingPhaseOffset || 0)) * (this.swingAmp * 0.16 * windIntensity);
    const x = Math.sin(this.swingTime * this.swingSpeed) * this.swingAmp + harmonicX;
    const tilt = -Math.cos(this.swingTime * this.swingSpeed) * 0.16;

    this.swingScoop.group.position.x = x;
    this.swingScoop.group.position.y = this.dispenserY;
    this.swingScoop.group.rotation.z = tilt;
  }

  updateFalling(dt) {
    if (!this.fallingScoop) return;

    const f = this.fallingScoop;
    f.vy -= 26.0 * dt;
    f.y += f.vy * dt;

    f.group.position.x = f.x;
    f.group.position.y = f.y;
    f.group.rotation.z = 0.0;

    const targetY = this.getCurrentStackTopY();
    if (f.y <= targetY) {
      f.y = targetY;
      this.handleLanding();
    }
  }

  updateWobble(dt) {
    if (this.stackedScoops.length === 0 || this.state === GAME_STATE.COLLAPSING) return;

    const N = this.stackedScoops.length;
    let netTorque = 0.0;

    this.stackedScoops.forEach((item, idx) => {
      const arm = (idx + 1) / N;
      netTorque += item.x * arm * 2.2;
    });

    if (N > 25) {
      const windFactor = Math.min(1.0, (N - 25) / 75);
      const windTime = this.clock.getElapsedTime();
      const gust = Math.sin(windTime * 0.9) * 0.7 + Math.sin(windTime * 2.3) * 0.35;
      netTorque += gust * windFactor * 0.85;
    }

    this.wobbleTorque = netTorque;

    const springK = 7.0;
    const damping = 4.2;
    const accel = -springK * this.wobbleAngle - damping * this.wobbleVel + netTorque * 0.8;

    this.wobbleVel += accel * dt;
    this.wobbleAngle += this.wobbleVel * dt;

    let sumX = 0.0;
    this.stackedScoops.forEach((item, idx) => {
      const heightProg = (idx + 1) / N;

      const bendX = this.wobbleAngle * (item.origY - this.coneTopY) * 0.28;
      item.group.position.x = item.x + bendX;
      item.group.rotation.z = this.wobbleAngle * heightProg * 0.65;
      sumX += item.group.position.x;
    });

    const lastScoop = this.stackedScoops[N - 1];
    const topOffset = Math.abs(lastScoop.group.position.x);
    const comOffset = Math.abs(sumX / N);

    const MAX_TILT = 0.58;
    const MAX_TORQUE = 4.8;
    const MAX_TOP_OFFSET = 1.95;
    const MAX_COM_OFFSET = 1.05;

    const angleRatio = Math.abs(this.wobbleAngle) / MAX_TILT;
    const torqueRatio = Math.abs(this.wobbleTorque) / MAX_TORQUE;
    const topRatio = topOffset / MAX_TOP_OFFSET;
    const comRatio = comOffset / MAX_COM_OFFSET;

    this.dangerLevel = Math.min(1.0, Math.max(angleRatio, torqueRatio, topRatio, comRatio));

    if (this.onDangerUpdate) {
      this.onDangerUpdate(this.dangerLevel);
    }

    if (
      Math.abs(this.wobbleAngle) > MAX_TILT ||
      Math.abs(this.wobbleTorque) > MAX_TORQUE ||
      topOffset > MAX_TOP_OFFSET ||
      comOffset > MAX_COM_OFFSET
    ) {
      this.triggerCollapse();
    }
  }

  updateScoopSquash(dt) {
    this.stackedScoops.forEach((item) => {
      if (item.squishT > 0) {
        item.squishT -= dt;
        const prog = Math.max(0, item.squishT / 0.25);

        const squashY = 1.0 - Math.sin(prog * Math.PI) * 0.22;
        const stretchX = 1.0 + Math.sin(prog * Math.PI) * 0.16;
        item.group.scale.set(stretchX, squashY, stretchX);
      } else {
        item.group.scale.set(1.0, 1.0, 1.0);
      }
    });
  }

  updateCamera(dt) {
    const stackTopY = this.getCurrentStackTopY();
    const targetY = stackTopY + 2.0;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.10;

    const lookY = this.camera.position.y - 0.7;
    if (this.cameraShake > 0) {
      this.cameraShake -= dt * 0.8;
      const shkX = (Math.random() - 0.5) * this.cameraShake * 1.2;
      const shkY = (Math.random() - 0.5) * this.cameraShake * 1.2;
      this.camera.position.x = shkX;
      this.camera.lookAt(shkX, lookY + shkY, 0);
    } else {
      this.camera.position.x = 0;
      this.camera.lookAt(0, lookY, 0);
    }

    this.updateSkyColor();
  }

  updateSkyColor() {
    const count = this.stackCount;
    let bgColor;
    if (count < 6) {
      bgColor = '#e0f2fe';
    } else if (count < 14) {
      bgColor = '#bae6fd';
    } else if (count < 22) {
      bgColor = '#fed7aa';
    } else {
      bgColor = '#1e1b4b';
    }
    this.scene.background.lerp(new THREE.Color(bgColor), 0.05);
  }

  updateCameraTarget(instant = false) {
    if (instant) {
      const targetY = this.coneTopY + 2.0;
      this.camera.position.y = targetY;
      this.camera.lookAt(0, targetY - 0.7, 0);
    }
  }

  spawnParticles(x, y, type = 'gold', count = 16) {
    const color = type === 'gold' ? '#f59e0b' : '#38bdf8';
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.06, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y + 0.2, 0.4);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const spd = 2.0 + Math.random() * 2.5;

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd + 1.5,
        vz: (Math.random() - 0.5) * 1.5,
        life: 0.65,
        maxLife: 0.65,
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 12.0 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      const scale = p.life / p.maxLife;
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  notifyUpdate(extraMsg = '') {
    if (!this.verifyIntegrity() && this.state !== GAME_STATE.GAMEOVER) {
      this.triggerGameOver('비정상적인 점수 조작이 감지되었습니다.');
      return;
    }
    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        score: this.score,
        stackCount: this.stackCount,
        combo: this.combo,
        lives: this.lives,
        bestScore: this.bestScore,
        bestHeight: this.bestHeight,
        dangerLevel: this.dangerLevel,
        extraMsg,
      });
    }
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  loadSavedCharacters() {
    try {
      const data = localStorage.getItem('10ice_custom_characters');
      if (!data) return [];
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list.filter(c => c && c.id && c.state);
      }
    } catch (e) {
      console.warn('저장된 캐릭터 로드 실패:', e);
    }
    return [];
  }

  saveCharacters() {
    try {
      const customChars = this.activeRoster.filter(c => !c.isDefault);
      localStorage.setItem('10ice_custom_characters', JSON.stringify(customChars));
      if (this.selectedCharacter) {
        localStorage.setItem('10ice_selected_char_id', this.selectedCharacter.id);
      }
    } catch (e) {
      console.warn('캐릭터 목록 저장 실패:', e);
    }
  }

  selectCharacter(character) {
    this.selectedCharacter = character;
    const foundIndex = this.activeRoster.findIndex(c => c.id === character.id);
    if (foundIndex !== -1) {
      this.characterTurnIndex = foundIndex;
    }
    try {
      localStorage.setItem('10ice_selected_char_id', character.id);
    } catch (e) {}

    if (this.state === GAME_STATE.PLAYING && !this.fallingScoop) {
      this.prepareNextSwingScoop();
    }
  }

  addCustomCharacter(character) {
    if (this.activeRoster.length === 1 && this.activeRoster[0].isDefault) {
      this.activeRoster = [character];
    } else {
      this.activeRoster = this.activeRoster.filter(c => c.id !== character.id);
      this.activeRoster.push(character);
    }
    this.selectCharacter(character);
    this.saveCharacters();
  }

  deleteCustomCharacter(charId) {
    if (this.activeRoster.length <= 1) {
      this.activeRoster = [createDefaultScoopCharacter()];
      this.selectedCharacter = this.activeRoster[0];
    } else {
      this.activeRoster = this.activeRoster.filter(c => c.id !== charId);
      if (this.selectedCharacter?.id === charId) {
        this.selectedCharacter = this.activeRoster[0];
      }
    }
    this.saveCharacters();

    if (this.swingScoop) {
      this.scene.remove(this.swingScoop.group);
      this.swingScoop = null;
      if (this.state === GAME_STATE.PLAYING) {
        this.prepareNextSwingScoop();
      }
    }
  }

  setFloorColors(color1, color2) {
    this.floorColor1 = color1;
    this.floorColor2 = color2;
    localStorage.setItem('10ice_floor_c1', color1);
    localStorage.setItem('10ice_floor_c2', color2);

    if (this.floorMesh) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color1;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = color2;
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillRect(128, 128, 128, 128);

      const floorTex = new THREE.CanvasTexture(canvas);
      floorTex.wrapS = THREE.RepeatWrapping;
      floorTex.wrapT = THREE.RepeatWrapping;
      floorTex.repeat.set(10, 10);
      this.floorMesh.material.map = floorTex;
      this.floorMesh.material.needsUpdate = true;
    }
  }
}

Object.freeze(GameEngine.prototype);
