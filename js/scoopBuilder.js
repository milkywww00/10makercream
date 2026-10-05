import * as THREE from 'three';
import { CharacterBuilder, toSmoothNonIndexed } from './characterBuilder.js';
import { TextureGenerator, getSwatchUV, ATLAS_SIZE } from './textureGenerator.js';

export class ScoopBuilder {
  constructor() {
    this.textureGen = new TextureGenerator();
    this.charBuilder = new CharacterBuilder(null);
    this.textureCache = new Map();
  }

  getTexture(state) {
    const key = state.id || `${state.characterName || 'def'}_${state.bodyColor || ''}_${state.outlineColor || ''}_${state.eyeType || ''}_${state.blushType || ''}_${state.mouthType || ''}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key);
    }
    const sourceCanvas = this.textureGen.update(state);
    const scoopCanvas = document.createElement('canvas');
    scoopCanvas.width = ATLAS_SIZE;
    scoopCanvas.height = ATLAS_SIZE;
    const scoopCtx = scoopCanvas.getContext('2d');
    scoopCtx.drawImage(sourceCanvas, 0, 0);

    const texture = new THREE.CanvasTexture(scoopCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    this.textureCache.set(key, texture);
    return texture;
  }

  clearTextureCache() {
    this.textureCache.forEach(t => t.dispose());
    this.textureCache.clear();
  }

  buildScoop(state, options = {}) {
    const headScale = state.headScale ?? 1.0;
    const poly = this.charBuilder.getPolySpec(state.polyDetail || 'low', state.lowPolyFlat || false);

    const texture = this.getTexture(state);

    const geometries = [];

    const headCenterY = 0.14 * headScale;
    const rawHeadGeo = this.charBuilder.createHeadGeometry(state, 0.0, headScale, poly);

    rawHeadGeo.rotateX(-0.20);
    rawHeadGeo.translate(0, headCenterY, 0.02 * headScale);
    geometries.push(rawHeadGeo);

    const skirtGeo = this.createScoopSkirtGeometry(state, headScale, poly);
    geometries.push(skirtGeo);

    const rawEarGeoms = this.charBuilder.createEarsGeometry(state, 0.0, headScale, poly);
    if (rawEarGeoms && rawEarGeoms.length > 0) {
      rawEarGeoms.forEach((eg) => {
        eg.rotateX(-0.20);
        eg.translate(0, headCenterY, 0.02 * headScale);
        geometries.push(eg);
      });
    }

    if (state.wingType && state.wingType !== 'none') {
      const wingGeoms = this.charBuilder.createWingsGeometry(state, -0.05, 1.0, headScale, poly);
      if (wingGeoms && wingGeoms.length > 0) {
        geometries.push(...wingGeoms);
      }
    }

    const rawAccGeoms = this.charBuilder.createAccessoriesGeometry(state, 0.0, -0.3, headScale, 1.0, poly);
    if (rawAccGeoms && rawAccGeoms.length > 0) {
      rawAccGeoms.forEach((ag) => {
        ag.rotateX(-0.20);
        ag.translate(0, headCenterY, 0.02 * headScale);
        geometries.push(ag);
      });
    }

    const rawAhogeGeoms = this.charBuilder.createAhogesGeometry(state, 0.0, headScale, poly);
    if (rawAhogeGeoms && rawAhogeGeoms.length > 0) {
      rawAhogeGeoms.forEach((ahg) => {
        ahg.rotateX(-0.20);
        ahg.translate(0, headCenterY, 0.02 * headScale);
        geometries.push(ahg);
      });
    }

    if (state.mouthType === 'beak') {
      const beakGeoms = this.charBuilder.createBeakGeometry(state, headCenterY, headScale, poly);
      if (beakGeoms && beakGeoms.length > 0) {
        geometries.push(...beakGeoms);
      }
    }

    if (options.hasSprinkles) {
      const sprinkleGeoms = this.createSprinklesGeometry(headScale, headCenterY);
      geometries.push(...sprinkleGeoms);
    }

    const mergedGeometry = this.charBuilder.mergeGeometries(geometries, poly.facetBlend);

    const material = new THREE.MeshToonMaterial({
      map: texture,
      gradientMap: this.charBuilder.createToonGradientMap(state.lowPolyFlat, poly.isVeryLow, poly.isStandardPoly),
      flatShading: Boolean(state.lowPolyFlat),
    });

    const rootGroup = new THREE.Group();
    rootGroup.name = `Scoop_${state.characterName || 'Character'}`;

    const mainMesh = new THREE.Mesh(mergedGeometry, material);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    rootGroup.add(mainMesh);

    if (state.outlineEnabled && (state.outlineThickness ?? 0.032) > 0.001) {
      const outlineTargetGeometries = geometries.filter((g) => !g.userData.noOutline);
      const mergedOutlineBase = this.charBuilder.mergeGeometries(outlineTargetGeometries, 0.0);
      const outlineGeo = this.charBuilder.createOutlineGeometry(
        mergedOutlineBase,
        state.outlineThickness ?? 0.032
      );
      const outlineMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(state.outlineColor || '#18181b'),
        side: THREE.BackSide,
      });
      const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
      outlineMesh.name = 'ScoopOutline';
      rootGroup.add(outlineMesh);
    }

    if (options.hasCherry) {
      const cherryGroup = this.createCherryMesh(headScale, headCenterY);
      rootGroup.add(cherryGroup);
    }

    return {
      group: rootGroup,
      mainMesh,
      texture,
      state,

      height: 0.72 * headScale,
      radius: 0.90 * headScale,
    };
  }

  createScoopSkirtGeometry(state, headScale, poly) {
    const segTheta = 36;
    const segH = 4;

    const topR = 0.86 * headScale;
    const botR = 1.04 * headScale;
    const height = 0.22 * headScale;
    const skirtCenterY = -0.22 * headScale;

    const geo = new THREE.CylinderGeometry(topR, botR, height, segTheta, segH, false);
    geo.translate(0, skirtCenterY, 0);

    const pos = geo.attributes.position;
    const bodyUV = getSwatchUV('body');

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      const theta = Math.atan2(z, x);
      const curR = Math.hypot(x, z);
      const normY = (y - skirtCenterY) / height;

      if (normY < 0.2) {
        const factor = (0.2 - normY) / 0.5;
        const wave = 0.05 * Math.sin(6 * theta) + 0.02 * Math.cos(10 * theta);
        const newR = curR * (1.0 + factor * wave);
        const newY = y + factor * 0.015 * Math.sin(6 * theta);
        pos.setXYZ(i, Math.cos(theta) * newR, newY, Math.sin(theta) * newR);
      }
    }

    geo.computeVertexNormals();

    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setXY(i, bodyUV.u, bodyUV.v);
    }

    return toSmoothNonIndexed(geo);
  }

  createSprinklesGeometry(headScale, headCenterY) {
    const list = [];
    const colors = ['accessory', 'sprout', 'gold', 'white', 'innerEar'];

    const rx = 0.88 * headScale;
    const ry = 0.64 * headScale;
    const rz = 0.68 * headScale;

    const sprinkleAngles = [
      { theta: -0.65, phi: 0.52, rx: 0.3, ry: 0.4, rz: 0.8, colorIdx: 0 },
      { theta: 0.55, phi: 0.48, rx: -0.2, ry: 0.6, rz: -0.5, colorIdx: 1 },
      { theta: -0.28, phi: 0.32, rx: 0.5, ry: -0.2, rz: 0.2, colorIdx: 2 },
      { theta: 0.22, phi: 0.35, rx: 0.1, ry: 0.3, rz: 0.9, colorIdx: 3 },
      { theta: -0.85, phi: 0.72, rx: 0.6, ry: 0.5, rz: -0.3, colorIdx: 4 },
      { theta: 0.78, phi: 0.68, rx: -0.4, ry: -0.3, rz: 0.4, colorIdx: 0 },
      { theta: 0.0, phi: 0.25, rx: 0.2, ry: 0.8, rz: -0.7, colorIdx: 1 },
    ];

    sprinkleAngles.forEach((s) => {

      const sinP = Math.sin(s.phi);
      const cosP = Math.cos(s.phi);
      const sinT = Math.sin(s.theta);
      const cosT = Math.cos(s.theta);

      const surfOffset = 1.05;
      const px = cosP * sinT * rx * surfOffset;
      const py = cosP * ry * surfOffset + headCenterY;
      const pz = sinP * rz * surfOffset;

      const geo = new THREE.CapsuleGeometry(0.030 * headScale, 0.11 * headScale, 4, 8);
      geo.rotateX(s.rx);
      geo.rotateY(s.ry);
      geo.rotateZ(s.rz);
      geo.translate(px, py, pz);

      geo.userData = { noOutline: true };

      const uvSwatch = getSwatchUV(colors[s.colorIdx]);
      const uvs = geo.attributes.uv;
      for (let i = 0; i < uvs.count; i++) {
        uvs.setXY(i, uvSwatch.u, uvSwatch.v);
      }
      list.push(toSmoothNonIndexed(geo));
    });

    return list;
  }

  createCherryMesh(headScale, headCenterY) {
    const group = new THREE.Group();
    group.name = 'CherryTopping';

    const cherryY = (0.72 + headCenterY) * headScale;

    const cherryGeo = new THREE.SphereGeometry(0.18 * headScale, 20, 16);
    cherryGeo.translate(0, cherryY + 0.14 * headScale, 0.12 * headScale);
    const cherryMat = new THREE.MeshToonMaterial({
      color: '#e11d48',
      roughness: 0.15,
    });
    const cherryMesh = new THREE.Mesh(cherryGeo, cherryMat);
    cherryMesh.castShadow = true;
    group.add(cherryMesh);

    const glossGeo = new THREE.SphereGeometry(0.045 * headScale, 8, 8);
    glossGeo.translate(-0.06 * headScale, cherryY + 0.22 * headScale, 0.24 * headScale);
    const glossMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    group.add(new THREE.Mesh(glossGeo, glossMat));

    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, cherryY + 0.22 * headScale, 0.12 * headScale),
      new THREE.Vector3(0.08 * headScale, cherryY + 0.45 * headScale, 0.10 * headScale),
      new THREE.Vector3(-0.06 * headScale, cherryY + 0.62 * headScale, 0.05 * headScale),
      new THREE.Vector3(0.04 * headScale, cherryY + 0.75 * headScale, 0.0)
    );
    const stemGeo = new THREE.TubeGeometry(curve, 16, 0.016 * headScale, 8, false);
    const stemMat = new THREE.MeshToonMaterial({ color: '#22c55e' });
    group.add(new THREE.Mesh(stemGeo, stemMat));

    return group;
  }
}
