export const ATLAS_SIZE = 1024;
export const FACE_CENTER_X = 512;
export const FACE_CENTER_Y = 350;
export const FACE_PROJ_SCALE = 360;

export const SWATCH_MAP = {
  body:          { index: 0,  x: 0,   y: 740, w: 20, h: 284 },
  innerEar:      { index: 1,  x: 20,  y: 740, w: 20, h: 284 },
  tailTip:       { index: 2,  x: 40,  y: 740, w: 20, h: 284 },
  belly:         { index: 3,  x: 60,  y: 740, w: 20, h: 284 },
  antler:        { index: 4,  x: 80,  y: 740, w: 20, h: 284 },
  accessory:     { index: 5,  x: 100, y: 740, w: 20, h: 284 },
  dark:          { index: 6,  x: 120, y: 740, w: 20, h: 284 },
  sprout:        { index: 7,  x: 140, y: 740, w: 20, h: 284 },
  gold:          { index: 8,  x: 160, y: 740, w: 20, h: 284 },
  earOuter:      { index: 9,  x: 180, y: 740, w: 20, h: 284 },
  white:         { index: 10, x: 200, y: 740, w: 20, h: 284 },
  arm:           { index: 11, x: 220, y: 740, w: 20, h: 284 },
  ahoge:         { index: 12, x: 240, y: 740, w: 20, h: 284 },
  beak:          { index: 13, x: 260, y: 740, w: 20, h: 284 },
  mane:          { index: 14, x: 280, y: 740, w: 20, h: 284 },
  devilRed:      { index: 15, x: 300, y: 740, w: 20, h: 284 },
  beret:         { index: 16, x: 320, y: 740, w: 20, h: 284 },
  starPin:       { index: 17, x: 340, y: 740, w: 20, h: 284 },
  glasses:       { index: 18, x: 360, y: 740, w: 20, h: 284 },
  squareGlasses: { index: 19, x: 380, y: 740, w: 20, h: 284 },
  crown:         { index: 20, x: 400, y: 740, w: 20, h: 284 },
  devilHorns:    { index: 21, x: 420, y: 740, w: 20, h: 284 },
  monocle:       { index: 22, x: 440, y: 740, w: 20, h: 284 },
};

export const TORSO_PATCH_RECT = {
  x: 470,
  y: 700,
  w: 180,
  h: 300,
};

export const EAR_PATCH_RECT = {
  x: 660,
  y: 700,
  w: 340,
  h: 300,
};

export function getSwatchUV(swatchName) {
  const s = SWATCH_MAP[swatchName] || SWATCH_MAP.body;
  const cx = (s.x + s.w * 0.5) / ATLAS_SIZE;
  const cy = (s.y + s.h * 0.5) / ATLAS_SIZE;
  return { u: cx, v: 1.0 - cy };
}

export function getTorsoFrontUV(nxTorso, nyTorso) {
  const r = TORSO_PATCH_RECT;
  const uRaw = Math.max(0.02, Math.min(0.98, 0.5 + nxTorso * 0.46));
  const vRaw = Math.max(0.02, Math.min(0.98, nyTorso));
  const px = r.x + uRaw * r.w;
  const py = r.y + (1.0 - vRaw) * r.h;
  return {
    u: px / ATLAS_SIZE,
    v: 1.0 - py / ATLAS_SIZE,
  };
}

export function getEarVertexUV(rawU, rawV, nz, hasInner) {
  if (!hasInner || nz < -0.02) {
    return getSwatchUV('earOuter');
  }
  const r = EAR_PATCH_RECT;
  const px = r.x + Math.max(0.02, Math.min(0.98, rawU)) * r.w;
  const py = r.y + (1.0 - Math.max(0.02, Math.min(0.98, rawV))) * r.h;
  return {
    u: px / ATLAS_SIZE,
    v: 1.0 - py / ATLAS_SIZE,
  };
}

export function getHeadOrthographicUV(dx, dy) {
  const cx = FACE_CENTER_X + dx * FACE_PROJ_SCALE;
  const cy = FACE_CENTER_Y - dy * FACE_PROJ_SCALE;
  const u = Math.max(0.01, Math.min(0.99, cx / ATLAS_SIZE));
  const v = Math.max(0.32, Math.min(0.99, 1.0 - cy / ATLAS_SIZE));
  return { u, v };
}

export class TextureGenerator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_SIZE;
    this.canvas.height = ATLAS_SIZE;
    this.ctx = this.canvas.getContext('2d');
  }

  update(state) {
    const ctx = this.ctx;
    const W = ATLAS_SIZE;
    const H = ATLAS_SIZE;

    ctx.fillStyle = state.bodyColor || '#ffffff';
    ctx.fillRect(0, 0, W, H);

    this.drawFacePattern(ctx, state);

    this.drawBlush(ctx, state);

    this.drawMoles(ctx, state);
    this.drawScars(ctx, state);

    this.drawEyes(ctx, state);

    this.drawEyebrows(ctx, state);

    this.drawFaceDecos(ctx, state);

    this.drawNoseAndMouth(ctx, state);

    this.drawFaceAccessories(ctx, state);

    this.drawColorSwatches(ctx, state);
    this.drawTorsoPatch(ctx, state);
    this.drawEarPatch(ctx, state);

    return this.canvas;
  }

  getFaceCoords() {
    return {
      cx: FACE_CENTER_X,
      eyeY: 424,
      eyeSpacing: 144,
      noseY: 450,
    };
  }

  drawTorsoPatch(ctx, state) {
    const r = TORSO_PATCH_RECT;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    ctx.fillStyle = state.bodyColor || '#ffffff';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    if (state.bellyPatch) {
      const cx = r.x + r.w * 0.5;
      const cy = r.y + r.h * 0.55;
      const rx = r.w * 0.30;
      const ry = r.h * 0.28;
      ctx.fillStyle = state.bellyColor || '#fff5eb';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawEarPatch(ctx, state) {
    const r = EAR_PATCH_RECT;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    const hasTwoTone = (Array.isArray(state.patterns) && state.patterns.includes('two_tone')) || state.patternType === 'two_tone';
    const earBaseColor = state.earColorCustom
      ? (state.earColor || state.bodyColor || '#ffffff')
      : (hasTwoTone
          ? (state.patternColor || '#d4c4b4')
          : (state.bodyColor || '#ffffff'));
    ctx.fillStyle = earBaseColor;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    const cx = r.x + r.w * 0.5;
    const botY = r.y + r.h + 20;
    const topY = r.y + r.h * 0.24;
    const halfW = r.w * 0.30;

    ctx.beginPath();
    if (state.earType === 'lop_rabbit') {

      const lopCx = cx - r.w * 0.08;
      const lopW = r.w * 0.18;
      const lopTopY = r.y + r.h * 0.24;
      ctx.moveTo(lopCx - lopW, botY);
      ctx.lineTo(lopCx - lopW, lopTopY + lopW);
      ctx.arc(lopCx, lopTopY + lopW, lopW, Math.PI, 0, false);
      ctx.lineTo(lopCx + lopW, botY);
      ctx.closePath();
    } else if (state.earType === 'mouse') {

      const mouseRx = r.w * 0.27;
      const mouseRy = r.h * 0.30;
      const mouseCy = r.y + r.h * 0.57;
      ctx.ellipse(cx, mouseCy, mouseRx, mouseRy, 0, 0, Math.PI * 2);
    } else if (state.earType === 'hamster') {

      const hamW = r.w * 0.33;
      const hamTopY = r.y + r.h * 0.20;
      ctx.moveTo(cx - hamW, botY);
      ctx.bezierCurveTo(cx - hamW, hamTopY, cx + hamW, hamTopY, cx + hamW, botY);
      ctx.closePath();
    } else if (['bear', 'otter', 'raccoon'].includes(state.earType)) {

      const roundW = r.w * 0.32;
      const archTopY = r.y + r.h * 0.24;
      ctx.moveTo(cx - roundW, botY);
      ctx.lineTo(cx - roundW, archTopY + roundW * 0.85);
      ctx.bezierCurveTo(
        cx - roundW, archTopY - roundW * 0.15,
        cx + roundW, archTopY - roundW * 0.15,
        cx + roundW, archTopY + roundW * 0.85
      );
      ctx.lineTo(cx + roundW, botY);
      ctx.closePath();
    } else if (state.earType === 'rabbit') {

      const rabW = r.w * 0.26;
      const rabTopY = r.y + r.h * 0.18;
      ctx.moveTo(cx - rabW, botY);
      ctx.bezierCurveTo(cx - rabW, rabTopY, cx + rabW, rabTopY, cx + rabW, botY);
      ctx.closePath();
    } else {

      ctx.moveTo(cx - halfW, botY);
      ctx.quadraticCurveTo(cx - halfW * 0.86, topY + 24, cx, topY);
      ctx.quadraticCurveTo(cx + halfW * 0.86, topY + 24, cx + halfW, botY);
      ctx.closePath();
    }

    ctx.fillStyle = state.innerEarColor || '#ffb5c2';
    ctx.fill();

    const outThick = state.outlineThickness ?? 0.032;
    if (state.outlineEnabled && outThick > 0.001) {
      ctx.lineWidth = Math.max(1.0, (outThick / 0.032) * 14.0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = state.outlineColor || '#18181b';
      ctx.stroke();
    }

    ctx.restore();
  }

  drawFacePattern(ctx, state) {
    let patterns = [];
    if (Array.isArray(state.patterns)) {
      patterns = state.patterns.filter((p) => p && p !== 'none');
    } else if (state.patternType && state.patternType !== 'none') {
      patterns = [state.patternType];
    }
    if (patterns.length === 0) return;

    if (patterns.includes('two_tone')) {
      patterns = ['two_tone', ...patterns.filter((p) => p !== 'two_tone')];
    }

    const { cx, eyeY, eyeSpacing, noseY } = this.getFaceCoords();
    ctx.save();
    ctx.fillStyle = state.patternColor || '#d4c4b4';
    ctx.strokeStyle = state.patternColor || '#d4c4b4';

    patterns.forEach((type) => {
      if (type === 'tabby') {

        ctx.lineCap = 'round';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(cx, 60);
        ctx.lineTo(cx, 240);
        ctx.stroke();

        ctx.lineWidth = 19;
        [-64, 64].forEach((dx) => {
          ctx.beginPath();
          ctx.moveTo(cx + dx * 0.82, 75);
          ctx.lineTo(cx + dx, 224);
          ctx.stroke();
        });
      } else if (type === 'cheek_stripes') {

        ctx.lineCap = 'round';
        ctx.lineWidth = 16;
        [-1, 1].forEach((dir) => {
          for (let i = 0; i < 2; i++) {
            const sy = eyeY + 6 + i * 32;
            const sx = cx + dir * (eyeSpacing + 66);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(cx + dir * 350, sy + 8);
            ctx.stroke();
          }
        });
      } else if (type === 'spots') {
        const spots = [
          { x: cx - 155, y: 235, rx: 48, ry: 36, rot: -0.25 },
          { x: cx - 82, y: 195, rx: 28, ry: 22, rot: 0.2 },
          { x: cx + 145, y: 245, rx: 42, ry: 32, rot: 0.35 },
          { x: cx - 225, y: eyeY + 24, rx: 34, ry: 25, rot: 0.1 },
          { x: cx + 220, y: eyeY + 18, rx: 36, ry: 26, rot: -0.2 },
        ];
        spots.forEach((s) => {
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (type === 'mask_raccoon') {
        [-1, 1].forEach((dir) => {
          const ex = cx + dir * eyeSpacing;
          ctx.beginPath();
          ctx.ellipse(ex, eyeY + 2, 74, 58, dir * 0.16, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (type === 'muzzle') {
        ctx.beginPath();
        ctx.ellipse(cx, noseY + 16, 78, 52, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'two_tone') {

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ATLAS_SIZE, 0);
        ctx.lineTo(ATLAS_SIZE, 345);
        ctx.bezierCurveTo(cx + 260, 350, cx + 120, 355, cx, 282);
        ctx.bezierCurveTo(cx - 120, 355, cx - 260, 350, 0, 345);
        ctx.closePath();
        ctx.fill();
      }
    });

    ctx.restore();
  }

  drawBlush(ctx, state) {
    const type = state.blushType;
    if (!type || type === 'none') return;

    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();
    const scale = state.blushScale ?? 1.0;
    const opacity = state.blushOpacity ?? 0.85;
    const offsetY = (state.blushY ?? 0) * 45;
    const blushColor = state.blushColor || '#ff8da1';

    const by = eyeY + 40 + offsetY;
    const bxOffset = eyeSpacing + 56;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = blushColor;
    ctx.strokeStyle = blushColor;

    [-1, 1].forEach((dir) => {
      const bx = cx + dir * bxOffset;

      if (type === 'comic_circle' || type === 'comic_circle_slash') {
        ctx.beginPath();
        ctx.ellipse(bx, by, 32 * scale, 22 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'comic_circle_slash') {
          ctx.save();
          ctx.globalAlpha = Math.min(1, opacity + 0.15);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4.5 * scale;
          ctx.lineCap = 'round';
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(bx + i * 11 * scale - 5 * scale, by + 9 * scale);
            ctx.lineTo(bx + i * 11 * scale + 5 * scale, by - 9 * scale);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (type === 'slash_only') {
        ctx.lineWidth = 6 * scale;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(bx + i * 13 * scale - 6 * scale, by + 12 * scale);
          ctx.lineTo(bx + i * 13 * scale + 6 * scale, by - 12 * scale);
          ctx.stroke();
        }
      } else if (type === 'soft_oval') {
        const rad = 44 * scale;
        const grad = ctx.createRadialGradient(bx, by, 3, bx, by, rad);
        grad.addColorStop(0, blushColor);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  drawMoles(ctx, state) {
    const moles = Array.isArray(state.moles) ? state.moles : [];
    if (moles.length === 0) return;

    const { cx, eyeY } = this.getFaceCoords();
    ctx.save();
    ctx.fillStyle = state.noseMouthColor || '#18181b';

    moles.forEach((m) => {
      const mx = cx + (m.x ?? 0.32) * 280;
      const my = eyeY - (m.y ?? -0.18) * 220;
      const r = 7.5 * (m.size ?? 1.0);

      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();

      if (m.mirror) {
        const mx2 = cx - (m.x ?? 0.32) * 280;
        ctx.beginPath();
        ctx.arc(mx2, my, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  drawScars(ctx, state) {
    const scars = Array.isArray(state.scars) ? state.scars : [];
    if (scars.length === 0) return;

    const { cx, eyeY } = this.getFaceCoords();
    const scarColor = state.scarColor || '#b55d60';

    const drawSingleScar = (sx, sy, size, angleDeg, type, isMirror = false) => {
      ctx.save();
      ctx.translate(sx, sy);
      if (isMirror) {
        ctx.scale(-1, 1);
      }
      ctx.rotate(((angleDeg ?? 0) * Math.PI) / 180);
      ctx.scale(size, size);
      ctx.strokeStyle = scarColor;
      ctx.fillStyle = scarColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (type === 'cross') {
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(-22, -22);
        ctx.lineTo(22, 22);
        ctx.moveTo(22, -22);
        ctx.lineTo(-22, 22);
        ctx.stroke();
      } else if (type === 'stitch') {
        ctx.lineWidth = 7.0;
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(0, 34);
        ctx.stroke();

        ctx.lineWidth = 5.2;
        [-18, 0, 18].forEach((ty) => {
          ctx.beginPath();
          ctx.moveTo(-11, ty);
          ctx.lineTo(11, ty);
          ctx.stroke();
        });
      } else if (type === 'double_slash') {
        ctx.lineWidth = 6.8;
        [-7, 7].forEach((ox) => {
          ctx.beginPath();
          ctx.moveTo(ox, -28);
          ctx.lineTo(ox, 28);
          ctx.stroke();
        });
      } else if (type === 'burn') {

        ctx.save();

        const buildBurnPath = () => {
          ctx.beginPath();
          ctx.moveTo(-18, -34);
          ctx.quadraticCurveTo(0, -15, 16, -36);
          ctx.quadraticCurveTo(14, -10, 36, 4);
          ctx.quadraticCurveTo(15, 14, 18, 36);
          ctx.quadraticCurveTo(0, 16, -18, 32);
          ctx.quadraticCurveTo(-15, 10, -36, 0);
          ctx.quadraticCurveTo(-15, -11, -18, -34);
          ctx.closePath();
        };

        ctx.globalAlpha = 0.35;
        ctx.fillStyle = scarColor;
        buildBurnPath();
        ctx.fill();

        ctx.globalAlpha = 0.90;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = scarColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        buildBurnPath();
        ctx.stroke();

        ctx.restore();
      } else {

        ctx.lineWidth = 8.0;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(0, 32);
        ctx.stroke();
      }

      ctx.restore();
    };

    scars.forEach((s) => {
      const sx = cx + (s.x ?? -0.40) * 280;
      const sy = eyeY - (s.y ?? 0.0) * 220;
      const sz = s.size ?? 1.0;
      const ang = s.angle ?? -15;
      const sType = s.type || 'slash';

      drawSingleScar(sx, sy, sz, ang, sType, false);

      if (s.mirror) {
        const sx2 = cx - (s.x ?? -0.40) * 280;
        drawSingleScar(sx2, sy, sz, ang, sType, true);
      }
    });
  }

  drawFaceAccessories(ctx, state) {
    const extras = Array.isArray(state.extraAccessories) ? state.extraAccessories : [];
    if (extras.length === 0) return;

    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();

    const olThick = state.outlineThickness ?? 0.032;
    const olScale = Math.max(0.4, olThick / 0.032);
    const olW = Math.max(3.5, olScale * 7);
    const olWThin = Math.max(1.5, olScale * 3);

    const drawRoundRectPath = (x, y, w, h, r) => {
      const rr = Math.min(r, w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    };

    const drawBandaid = (bx, by, w, h, angleRad) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angleRad);

      drawRoundRectPath(-w * 0.5, -h * 0.5, w, h, h * 0.46);
      ctx.fillStyle = '#f6c8af';
      ctx.fill();
      ctx.lineWidth = olW;
      ctx.strokeStyle = state.outlineColor || '#18181b';
      ctx.stroke();

      const pw = w * 0.36;
      const ph = h * 0.72;
      drawRoundRectPath(-pw * 0.5, -ph * 0.5, pw, ph, 4);
      ctx.fillStyle = '#fff7f2';
      ctx.fill();
      ctx.lineWidth = olWThin;
      ctx.strokeStyle = '#d48f70';
      ctx.stroke();

      ctx.fillStyle = '#be795b';
      [-1, 1].forEach((side) => {
        const baseX = side * (w * 0.31);
        [-4, 4].forEach((dy) => {
          [-3.2, 3.2].forEach((dx) => {
            ctx.beginPath();
            ctx.arc(baseX + dx, dy, 1.7 * Math.max(0.7, olScale * 0.8), 0, Math.PI * 2);
            ctx.fill();
          });
        });
      });

      ctx.restore();
    };

    if (extras.includes('bandaid_nose')) {
      drawBandaid(cx, eyeY - 6, 80, 32, 0);
    }

    if (extras.includes('bandaid_left_cheek')) {
      drawBandaid(cx - eyeSpacing - 78, eyeY + 52, 54, 34, -0.14);
    }

    if (extras.includes('bandaid_right_cheek')) {
      drawBandaid(cx + eyeSpacing + 78, eyeY + 52, 54, 34, 0.14);
    }

    const drawDressingBand = (bx, by, w, h, angleRad) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angleRad);

      const radius = 6;

      drawRoundRectPath(-w * 0.5, -h * 0.5, w, h, radius);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = olW;
      ctx.strokeStyle = state.outlineColor || '#18181b';
      ctx.stroke();

      const pw = w * 0.62;
      const ph = h * 0.64;
      drawRoundRectPath(-pw * 0.5, -ph * 0.5, pw, ph, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.lineWidth = Math.max(1.8, olWThin * 1.1);
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      ctx.restore();
    };

    if (extras.includes('dressing_nose')) {
      drawDressingBand(cx, eyeY - 6, 64, 46, 0);
    }
    if (extras.includes('dressing_left_cheek')) {
      drawDressingBand(cx - eyeSpacing - 82, eyeY + 54, 68, 56, -0.12);
    }
    if (extras.includes('dressing_right_cheek')) {
      drawDressingBand(cx + eyeSpacing + 82, eyeY + 54, 68, 56, 0.12);
    }

    const outlineColor = state.outlineColor || '#18181b';

    const drawMedicalEyepatch2D = (dir) => {
      const ex = cx + dir * eyeSpacing;
      const ey = eyeY - 4;
      const padW = 108;
      const padH = 86;
      const padR = 18;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const drawCord = (x1, y1, x2, y2) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = olW + 1.2;
        ctx.strokeStyle = outlineColor;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = Math.max(2.0, olW - 1.5);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      };

      const cordStartXTop = ex + dir * (padW * 0.36);
      const cordStartYTop = ey - padH * 0.34;
      const cordEndXTop = ex + dir * 360;
      const cordEndYTop = ey - 46;

      const cordStartXBottom = ex + dir * (padW * 0.36);
      const cordStartYBottom = ey + padH * 0.34;
      const cordEndXBottom = ex + dir * 360;
      const cordEndYBottom = ey + 44;

      drawCord(cordStartXTop, cordStartYTop, cordEndXTop, cordEndYTop);
      drawCord(cordStartXBottom, cordStartYBottom, cordEndXBottom, cordEndYBottom);

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(dir * 0.04);

      drawRoundRectPath(-padW * 0.5, -padH * 0.5, padW, padH, padR);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = olW;
      ctx.strokeStyle = outlineColor;
      ctx.stroke();

      const innerW = padW - 22;
      const innerH = padH - 22;
      const innerR = 12;
      drawRoundRectPath(-innerW * 0.5, -innerH * 0.5, innerW, innerH, innerR);
      ctx.fillStyle = '#f6f7f9';
      ctx.fill();
      ctx.lineWidth = Math.max(1.2, olWThin * 0.7);
      ctx.strokeStyle = 'rgba(190, 195, 205, 0.6)';
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    };

    if (extras.includes('eyepatch_left')) drawMedicalEyepatch2D(-1);
    if (extras.includes('eyepatch_right')) drawMedicalEyepatch2D(1);

    const drawPiratePatch = (dir) => {
      const ex = cx + dir * eyeSpacing;
      const ey = eyeY - 2;
      const hw = 54;
      const hh = 46;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const strapColor = '#18181b';
      const strapBorder = outlineColor;

      const drawCurvedStrap = (p1x, p1y, cpx, cpy, p2x, p2y) => {
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(cpx, cpy, p2x, p2y);
        ctx.lineWidth = olW + 1.2;
        ctx.strokeStyle = strapBorder;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(cpx, cpy, p2x, p2y);
        ctx.lineWidth = Math.max(2.2, olW - 1.0);
        ctx.strokeStyle = strapColor;
        ctx.stroke();
      };

      const outerStrapStartX = ex + dir * (hw * 0.88);
      const outerStrapStartY = ey - hh * 0.15;
      const outerStrapEndX = outerStrapStartX + dir * 190;
      const outerStrapEndY = outerStrapStartY - 70;
      const outerStrapCtrlX = outerStrapStartX + dir * 90;
      const outerStrapCtrlY = outerStrapStartY - 35;
      drawCurvedStrap(outerStrapStartX, outerStrapStartY, outerStrapCtrlX, outerStrapCtrlY, outerStrapEndX, outerStrapEndY);

      const innerStrapStartX = ex - dir * (hw * 0.75);
      const innerStrapStartY = ey - hh * 0.40;
      const innerStrapEndX = cx - dir * (eyeSpacing * 0.85);
      const innerStrapEndY = ey - 125;
      const innerStrapCtrlX = cx - dir * 10;
      const innerStrapCtrlY = ey - 85;
      drawCurvedStrap(innerStrapStartX, innerStrapStartY, innerStrapCtrlX, innerStrapCtrlY, innerStrapEndX, innerStrapEndY);

      ctx.save();
      ctx.translate(ex, ey);

      ctx.beginPath();

      const xOuter = dir * (hw * 0.96);
      const yOuter = -hh * 0.15;
      const xTop = dir * (hw * 0.10);
      const yTop = -hh * 0.82;
      const xInner = -dir * (hw * 0.88);
      const yInner = -hh * 0.10;
      const xBottom = dir * (hw * 0.12);
      const yBottom = hh * 0.90;

      ctx.moveTo(xOuter, yOuter);

      ctx.bezierCurveTo(
        dir * (hw * 0.75), -hh * 0.70,
        dir * (hw * 0.45), -hh * 0.82,
        xTop, yTop
      );

      ctx.bezierCurveTo(
        -dir * (hw * 0.35), -hh * 0.82,
        -dir * (hw * 0.75), -hh * 0.60,
        xInner, yInner
      );

      ctx.bezierCurveTo(
        -dir * (hw * 0.92), hh * 0.35,
        -dir * (hw * 0.40), hh * 0.90,
        xBottom, yBottom
      );

      ctx.bezierCurveTo(
        dir * (hw * 0.55), hh * 0.90,
        dir * (hw * 0.98), hh * 0.40,
        xOuter, yOuter
      );

      ctx.closePath();

      ctx.fillStyle = '#18181b';
      ctx.fill();

      ctx.lineWidth = olW;
      ctx.strokeStyle = outlineColor;
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    };

    if (extras.includes('pirate_patch_left')) drawPiratePatch(-1);
    if (extras.includes('pirate_patch_right')) drawPiratePatch(1);
  }

  drawEyes(ctx, state) {
    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();
    const eyeType = state.eyeType || 'default';
    const lashType = state.eyelashType || 'none';
    const defaultColor = state.eyeColor || '#18181b';
    const isOdd = Boolean(state.oddEye);
    const leftColor = isOdd ? (state.eyeColorLeft || defaultColor) : defaultColor;
    const rightColor = isOdd ? (state.eyeColorRight || '#3b82f6') : defaultColor;
    const extras = Array.isArray(state.extraAccessories) ? state.extraAccessories : [];

    const isShock = Array.isArray(state.faceDecos) && state.faceDecos.includes('shock');
    const shockSettings = (state.faceDecoSettings && state.faceDecoSettings.shock) || {};

    [-1, 1].forEach((dir) => {
      if (dir === -1 && (extras.includes('eyepatch_left') || extras.includes('pirate_patch_left'))) return;
      if (dir === 1 && (extras.includes('eyepatch_right') || extras.includes('pirate_patch_right'))) return;
      const ex = cx + dir * eyeSpacing;

      const color = dir === -1 ? leftColor : rightColor;
      this.drawSingleEye(ctx, ex, eyeY, dir, eyeType, lashType, color, 1.0, isShock, shockSettings, state);
    });
  }

  drawSingleEye(ctx, ex, ey, dir, eyeType, lashType, color, scale = 1.0, isShock = false, shockSettings = null, state = null) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rx = 36;
    const ry = 39;

    const supportsLashes = ['default', 'angry', 'sad', 'half'].includes(eyeType);

    if (supportsLashes && lashType !== 'none') {
      ctx.save();
      ctx.lineWidth = 11;
      if (lashType === 'top' || lashType === 'both') {
        const startX = dir * (rx - 4);
        const startY = eyeType === 'half' ? -4 : -ry * 0.55;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + dir * 18, startY - 15);
        ctx.stroke();
      }
      if (lashType === 'bottom' || lashType === 'both') {
        ctx.lineWidth = 9.5;
        [-9, 10].forEach((offsetX, idx) => {
          const lx = offsetX * dir;
          const ly = ry * 0.80;
          ctx.beginPath();
          ctx.moveTo(lx, ly - 3);
          ctx.lineTo(lx + dir * (idx === 1 ? 7 : -3), ly + 16);
          ctx.stroke();
        });
      }
      ctx.restore();
    }

    if (eyeType === 'default') {
      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 11;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
    } else if (eyeType === 'angry') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-dir * 52, -4);
      ctx.lineTo(dir * 52, -46);
      ctx.lineTo(dir * 52, 56);
      ctx.lineTo(-dir * 52, 56);
      ctx.closePath();
      ctx.clip();

      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
      ctx.restore();
    } else if (eyeType === 'sad') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-dir * 52, -46);
      ctx.lineTo(dir * 52, -4);
      ctx.lineTo(dir * 52, 56);
      ctx.lineTo(-dir * 52, 56);
      ctx.closePath();
      ctx.clip();

      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
      ctx.restore();
    } else if (eyeType === 'half') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-52, -5, 104, 62);
      ctx.clip();

      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
      ctx.restore();
    } else if (eyeType === 'sparkle') {
      const w = 38;
      const h = 44;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.quadraticCurveTo(5, -5, w, 0);
      ctx.quadraticCurveTo(5, 5, 0, h);
      ctx.quadraticCurveTo(-5, 5, -w, 0);
      ctx.quadraticCurveTo(-5, -5, 0, -h);
      ctx.closePath();
      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 10;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.fill();
      }
    } else if (eyeType === 'wink_tight') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(dir * 25, -24);
      ctx.lineTo(-dir * 22, 0);
      ctx.lineTo(dir * 25, 24);
      ctx.stroke();
    } else if (eyeType === 'closed_down') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-32, 3);
      ctx.quadraticCurveTo(0, 25, 32, 3);
      ctx.stroke();
    } else if (eyeType === 'happy_up') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-33, 9);
      ctx.quadraticCurveTo(0, -25, 33, 9);
      ctx.stroke();
    } else if (eyeType === 'flat_line') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-32, 3);
      ctx.lineTo(32, 3);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawEyeHighlight(ctx, eyeType, dir, rx, ry, state) {
    if (!state || state.eyeHighlight === false) return;

    const hlType = state.eyeHighlightType || 'double';
    const hlSize = Math.max(0.4, Math.min(2.0, state.eyeHighlightSize ?? 1.0));

    ctx.save();
    ctx.fillStyle = '#ffffff';

    const hx = eyeType === 'half' ? -8 : -10;
    const hy = eyeType === 'half' ? 9 : -13;

    if (hlType === 'double') {

      ctx.beginPath();
      ctx.arc(hx, hy, 8.5 * hlSize, 0, Math.PI * 2);
      ctx.fill();

      const hx2 = eyeType === 'half' ? 12 : 11;
      const hy2 = eyeType === 'half' ? 22 : 14;
      ctx.beginPath();
      ctx.arc(hx2, hy2, 4.6 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (hlType === 'circle') {

      ctx.beginPath();
      ctx.arc(hx, hy, 9.2 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (hlType === 'sparkle') {

      ctx.save();
      ctx.translate(hx + 1, hy);
      const sw = 10.5 * hlSize;
      const sh = 12.0 * hlSize;
      ctx.beginPath();
      ctx.moveTo(0, -sh);
      ctx.quadraticCurveTo(1.5, -1.5, sw, 0);
      ctx.quadraticCurveTo(1.5, 1.5, 0, sh);
      ctx.quadraticCurveTo(-1.5, 1.5, -sw, 0);
      ctx.quadraticCurveTo(-1.5, -1.5, 0, -sh);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const hx2 = eyeType === 'half' ? 12 : 11;
      const hy2 = eyeType === 'half' ? 22 : 14;
      ctx.beginPath();
      ctx.arc(hx2, hy2, 4.0 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (hlType === 'heart') {

      ctx.save();
      ctx.translate(hx + 1, hy);
      const hs = 0.82 * hlSize;
      ctx.scale(hs, hs);
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(-8, -8, -13, 2, 0, 14);
      ctx.bezierCurveTo(13, 2, 8, -8, 0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const hx2 = eyeType === 'half' ? 12 : 11;
      const hy2 = eyeType === 'half' ? 22 : 14;
      ctx.beginPath();
      ctx.arc(hx2, hy2, 3.8 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawEyebrows(ctx, state) {
    let type = state.eyebrowType || (Array.isArray(state.eyebrows) && state.eyebrows[0]) || 'none';
    if (!type || type === 'none') return;
    if (type === 'dot' || type === 'thick') {
      type = 'songchung';
    }

    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();
    const color = state.eyebrowColor || state.noseMouthColor || '#18181b';
    const scale = state.eyebrowScale ?? 1.0;
    const offsetY = (state.eyebrowY ?? 0.0) * 36;
    const offsetSpacing = (state.eyebrowSpacing ?? 0.0) * 30;

    const baseY = eyeY - 58 + offsetY;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    [-1, 1].forEach((dir) => {
      const bx = cx + dir * (eyeSpacing + offsetSpacing);

      ctx.save();
      ctx.translate(bx, baseY);

      if (type === 'songchung') {

        ctx.rotate(dir * 0.12);
        ctx.beginPath();
        ctx.ellipse(0, 0, 19 * scale, 11 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = state.bodyColor || '#ffffff';
        ctx.fill();
        ctx.lineWidth = 5.2 * scale;
        ctx.stroke();
      } else if (type === 'short_arch') {

        ctx.lineWidth = 6.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-16 * scale, 4 * scale);
        ctx.quadraticCurveTo(0, -8 * scale, 16 * scale, 4 * scale);
        ctx.stroke();
      } else if (type === 'round') {

        ctx.lineWidth = 7.0 * scale;
        ctx.beginPath();
        ctx.moveTo(-dir * 22 * scale, -8 * scale);
        ctx.quadraticCurveTo(0, 13 * scale, dir * 22 * scale, -6 * scale);
        ctx.stroke();
      } else if (type === 'angry') {

        ctx.lineWidth = 7.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-dir * 22 * scale, 8 * scale);
        ctx.lineTo(dir * 22 * scale, -9 * scale);
        ctx.stroke();
      } else if (type === 'sad') {

        ctx.lineWidth = 6.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-dir * 22 * scale, -4 * scale);
        ctx.quadraticCurveTo(-dir * 4 * scale, -8 * scale, dir * 22 * scale, 8 * scale);
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  drawFaceDecos(ctx, state) {
    const decos = Array.isArray(state.faceDecos) ? state.faceDecos.filter((d) => d && d !== 'none') : [];
    if (decos.length === 0) return;

    const { cx, eyeY, eyeSpacing, noseY } = this.getFaceCoords();
    const settings = state.faceDecoSettings || {};

    ctx.save();

    decos.forEach((type) => {
      const cfg = settings[type] || {};
      const scale = cfg.scale !== undefined ? cfg.scale : (state.faceDecoScale ?? 1.0);
      const offsetX = ((cfg.x !== undefined ? cfg.x : (state.faceDecoX ?? 0.0))) * 45;
      const offsetY = ((cfg.y !== undefined ? cfg.y : (state.faceDecoY ?? 0.0))) * 45;

      if (type === 'beard') {

        ctx.save();
        const by = noseY + 30 + offsetY;
        const bx = cx + offsetX;
        ctx.strokeStyle = state.noseMouthColor || '#18181b';
        ctx.lineWidth = 5 * scale;
        ctx.lineCap = 'round';
        [-16, -8, 0, 8, 16].forEach((dx) => {
          ctx.beginPath();
          ctx.moveTo(bx + dx * scale, by - 2 * scale);
          ctx.lineTo(bx + dx * scale, by + 12 * scale);
          ctx.stroke();
        });
        ctx.restore();
      } else if (type === 'shadow') {

        ctx.save();
        const sy = eyeY - 10 + offsetY;
        const sx = cx + offsetX;
        const sw = 56 * scale;
        const sh = 28 * scale;

        ctx.fillStyle = 'rgba(102, 92, 148, 0.75)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, sw, sh, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#372d5b';
        ctx.lineWidth = 5 * scale;
        ctx.lineCap = 'round';
        [-32, -16, 0, 16, 32].forEach((dx) => {
          const factor = Math.max(0, 1.0 - Math.pow(Math.abs(dx) / (sw * 0.75), 1.8));
          const len = factor * sh * 0.82;
          ctx.beginPath();
          ctx.moveTo(sx + dx * (sw / 56), sy - len);
          ctx.lineTo(sx + dx * (sw / 56), sy + len);
          ctx.stroke();
        });
        ctx.restore();
      } else if (type === 'sweat') {

        ctx.save();
        const tx = cx + eyeSpacing + 42 + offsetX;
        const ty = eyeY - 64 + offsetY;
        const w = 38 * scale;
        const h = 60 * scale;

        ctx.translate(tx, ty);
        ctx.rotate(0.18);

        const r = w * 0.50;
        ctx.beginPath();
        ctx.arc(0, h * 0.12, r, 0, Math.PI, false);
        ctx.lineTo(0, -h * 0.50);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#bae6fd');
        grad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 6 * scale;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
      } else if (type === 'wrinkle') {

        ctx.save();
        const ex = cx - eyeSpacing;
        const ey = eyeY;
        ctx.strokeStyle = state.noseMouthColor || '#18181b';
        ctx.lineWidth = 6.2 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();

        ctx.moveTo(ex + 28 * scale + offsetX, ey + 36 * scale + offsetY);
        ctx.quadraticCurveTo(
          ex + 37 * scale + offsetX, ey + 26 * scale + offsetY,
          ex + 44 * scale + offsetX, ey + 14 * scale + offsetY
        );
        ctx.stroke();
        ctx.restore();
      } else if (type === 'shock') {

      } else if (type === 'anger') {

        ctx.save();
        const ax = cx + eyeSpacing + 46 + offsetX;
        const ay = eyeY - 78 + offsetY;

        ctx.translate(ax, ay);
        ctx.rotate(-0.08);

        const drawBoomerangs = (lineWidth, strokeColor) => {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            ctx.beginPath();

            ctx.moveTo(-14.5 * scale, -23.5 * scale);
            ctx.quadraticCurveTo(0, -13 * scale, 14.5 * scale, -23.5 * scale);
            ctx.stroke();
            ctx.restore();
          }
        };

        drawBoomerangs(9.5 * scale, '#18181b');

        drawBoomerangs(5.5 * scale, '#ef4444');

        ctx.restore();
      }
    });

    ctx.restore();
  }

  drawNoseAndMouth(ctx, state) {
    const mouthType = state.mouthType || 'cat_w';

    if (mouthType === 'beak') {
      return;
    }
    const { cx, noseY } = this.getFaceCoords();
    const color = state.noseMouthColor || '#18181b';

    this.drawNoseMouthShape(ctx, cx, noseY, mouthType, color, 1.0);
  }

  drawNoseMouthShape(ctx, cx, ny, mouthType, color, scale = 1.0) {
    ctx.save();
    ctx.translate(cx, ny);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (mouthType !== 'beak') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 10.5;

    if (mouthType === 'line_t') {
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 32);
      ctx.moveTo(-26, 32);
      ctx.lineTo(26, 32);
      ctx.stroke();
    } else if (mouthType === 'cat_w') {
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 19);
      ctx.moveTo(-36, 22);
      ctx.quadraticCurveTo(-18, 40, 0, 19);
      ctx.quadraticCurveTo(18, 40, 36, 22);
      ctx.stroke();
    } else if (mouthType === 'pout_v') {
      ctx.beginPath();
      ctx.moveTo(-20, 35);
      ctx.lineTo(0, 17);
      ctx.lineTo(20, 35);
      ctx.stroke();
    } else if (mouthType === 'smile_u') {
      ctx.beginPath();
      ctx.moveTo(-17, 26);
      ctx.quadraticCurveTo(0, 38, 17, 26);
      ctx.stroke();
    } else if (mouthType === 'nose_only') {

    } else if (mouthType === 'open_d') {
      ctx.lineWidth = 9.5;
      ctx.beginPath();
      ctx.moveTo(-20, 22);
      ctx.lineTo(20, 22);
      ctx.quadraticCurveTo(17, 46, 0, 46);
      ctx.quadraticCurveTo(-17, 46, -20, 22);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
    } else if (mouthType === 'beak') {

      ctx.save();
      const beakOutlineColor = color;
      const beakFillTop = '#fbbf24';
      const beakFillBot = '#f59e0b';

      ctx.beginPath();
      ctx.moveTo(-16, 14);
      ctx.quadraticCurveTo(0, 16, 16, 14);
      ctx.quadraticCurveTo(0, 33, -16, 14);
      ctx.closePath();
      ctx.fillStyle = beakFillBot;
      ctx.fill();
      ctx.lineWidth = 6.8;
      ctx.strokeStyle = beakOutlineColor;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-22, 14);
      ctx.quadraticCurveTo(0, -7, 22, 14);
      ctx.quadraticCurveTo(0, 18, -22, 14);
      ctx.closePath();
      ctx.fillStyle = beakFillTop;
      ctx.fill();
      ctx.lineWidth = 6.8;
      ctx.strokeStyle = beakOutlineColor;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-20, 14);
      ctx.quadraticCurveTo(0, 17, 20, 14);
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = beakOutlineColor;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 8.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  drawColorSwatches(ctx, state) {
    const hasTwoTone = (Array.isArray(state.patterns) && state.patterns.includes('two_tone')) || state.patternType === 'two_tone';
    const colors = {
      body: state.bodyColor || '#ffffff',
      innerEar: state.innerEarColor || '#ffb5c2',
      tailTip: state.tailTipEnabled ? (state.tailTipColor || '#27272a') : (state.bodyColor || '#ffffff'),
      belly: state.bellyPatch ? (state.bellyColor || '#fff5eb') : (state.bodyColor || '#ffffff'),
      antler: state.antlerColor || '#c69c6d',
      accessory: state.accessoryColor || '#ff5e7e',
      dark: state.outlineColor || '#18181b',
      sprout: '#52b788',
      gold: '#ffd166',
      earOuter: state.earColorCustom
        ? (state.earColor || state.bodyColor || '#ffffff')
        : (hasTwoTone
            ? (state.patternColor || '#d4c4b4')
            : (state.bodyColor || '#ffffff')),
      white: '#ffffff',
      arm: state.armColorCustom
        ? (state.armColor || state.bodyColor || '#ffffff')
        : (state.bodyColor || '#ffffff'),
      ahoge: state.ahogeFollowBody !== false
        ? (state.bodyColor || '#ffffff')
        : (state.ahogeColor || state.bodyColor || '#ffffff'),
      beak: state.beakFollowBody
        ? (state.bodyColor || '#ffffff')
        : (state.beakColor || '#fbbf24'),
      mane: state.maneColor || '#f97316',
      devilRed: '#c51b29',
      beret: state.beretColor || '#ef476f',
      starPin: state.starPinColor || '#ffd166',
      glasses: state.glassesColor || '#18181b',
      squareGlasses: state.squareGlassesColor || '#18181b',
      crown: state.crownColor || '#ffd166',
      devilHorns: state.devilHornsColor || '#18181b',
      monocle: state.monocleColor || '#ffd166',
    };

    Object.entries(SWATCH_MAP).forEach(([key, rect]) => {
      ctx.fillStyle = colors[key] || '#ffffff';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
  }
}
