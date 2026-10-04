import * as THREE from 'three';

export function createWaffleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e8a86b';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#b86d32';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';

  const step = 48;
  for (let x = -512; x <= 1024; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 512, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 512, 512);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(120, 55, 10, 0.18)';
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      ctx.fillRect(x + 10, y + 10, step - 20, step - 20);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 3.5);
  return texture;
}

export function createSleeveTexture(color = '#3f3047', accentColor = '#ffd166', label = '10 STUDIO') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(512, 16);
  ctx.moveTo(0, 240);
  ctx.lineTo(512, 240);
  ctx.stroke();

  ctx.beginPath();
  for (let x = 0; x <= 512; x += 32) {
    ctx.lineTo(x, 32);
    ctx.lineTo(x + 16, 44);
  }
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.roundRect(106, 80, 300, 96, 20);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('10 STUDIO', 256, 115);

  ctx.font = '600 20px "Noto Sans KR", sans-serif';
  ctx.fillStyle = accentColor;
  ctx.fillText('ICE CREAM TOWER', 256, 150);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(1.0, 1.0);
  return texture;
}

export class ConeBuilder {
  constructor() {
    this.waffleTexture = createWaffleTexture();
    this.sleeveTexture = createSleeveTexture();
  }

  build(options = {}) {
    const group = new THREE.Group();
    group.name = 'WaffleConeRoot';

    const coneH = 2.4;
    const topR = 0.82;
    const botR = 0.08;

    const coneGeo = new THREE.CylinderGeometry(topR, botR, coneH, 32, 8, true);

    coneGeo.translate(0, -coneH * 0.5, 0);

    const coneMat = new THREE.MeshToonMaterial({
      map: this.waffleTexture,
      roughness: 0.5,
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.castShadow = true;
    coneMesh.receiveShadow = true;
    group.add(coneMesh);

    const rimGeo = new THREE.TorusGeometry(topR, 0.05, 12, 32);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshToonMaterial({ color: '#cf8948' });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 0.0;
    group.add(rimMesh);

    const sleeveH = 1.1;
    const sleeveTopY = -0.55;
    const sleeveBotY = sleeveTopY - sleeveH;
    const sleeveTopR = topR - (topR - botR) * (-sleeveTopY / coneH) + 0.02;
    const sleeveBotR = topR - (topR - botR) * (-sleeveBotY / coneH) + 0.02;

    const sleeveGeo = new THREE.CylinderGeometry(sleeveTopR, sleeveBotR, sleeveH, 32, 1, true);
    sleeveGeo.translate(0, sleeveTopY - sleeveH * 0.5, 0);

    const sleeveMat = new THREE.MeshToonMaterial({
      map: this.sleeveTexture,
      side: THREE.DoubleSide,
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    group.add(sleeveMesh);

    const standGroup = new THREE.Group();
    const plateGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.22, 36);
    plateGeo.translate(0, -coneH - 0.11, 0);
    const plateMat = new THREE.MeshToonMaterial({ color: '#fef3c7' });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    standGroup.add(plateMesh);

    const holderRingGeo = new THREE.TorusGeometry(0.55, 0.07, 16, 32);
    holderRingGeo.rotateX(Math.PI / 2);
    holderRingGeo.translate(0, -coneH * 0.75, 0);
    const ringMat = new THREE.MeshToonMaterial({ color: '#f59e0b' });
    const ringMesh = new THREE.Mesh(holderRingGeo, ringMat);
    standGroup.add(ringMesh);

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, coneH * 0.8, 8);
      const legMesh = new THREE.Mesh(legGeo, ringMat);
      legMesh.position.set(Math.cos(angle) * 0.65, -coneH * 0.55, Math.sin(angle) * 0.65);
      legMesh.rotation.z = Math.cos(angle) * 0.15;
      legMesh.rotation.x = Math.sin(angle) * 0.15;
      standGroup.add(legMesh);
    }

    group.add(standGroup);

    const coneOutlineGeo = new THREE.CylinderGeometry(topR + 0.035, botR + 0.035, coneH, 32, 1, true);
    coneOutlineGeo.translate(0, -coneH * 0.5, 0);
    const outlineMat = new THREE.MeshBasicMaterial({
      color: '#451a03',
      side: THREE.BackSide,
    });
    const outlineMesh = new THREE.Mesh(coneOutlineGeo, outlineMat);
    group.add(outlineMesh);

    return {
      group,
      topY: 0.0,
      topRadius: topR,
    };
  }
}
