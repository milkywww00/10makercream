import { GameEngine, GAME_STATE } from './gameEngine.js';
import { loadCharacterFile } from './characterLoader.js';

let engine = null;

const dom = {
  container: document.getElementById('canvasContainer'),
  scoreVal: document.getElementById('scoreVal'),
  heightVal: document.getElementById('heightVal'),
  comboVal: document.getElementById('comboVal'),
  comboBadge: document.getElementById('comboBadge'),
  livesBox: document.getElementById('livesBox'),
  bestVal: document.getElementById('bestVal'),
  dangerFill: document.getElementById('dangerFill'),
  dangerWarning: document.getElementById('dangerWarning'),
  btnDrop: document.getElementById('btnDrop'),
  btnRestart: document.getElementById('btnRestart'),
  btnMute: document.getElementById('btnMute'),
  muteIcon: document.getElementById('muteIcon'),
  muteLabel: document.getElementById('muteLabel'),
  btnHelp: document.getElementById('btnHelp'),
  btnRosterAdd: document.getElementById('btnRosterAdd'),
  fileInput: document.getElementById('fileInput'),
  characterList: document.getElementById('characterList'),

  judgementPopup: document.getElementById('judgementPopup'),
  gameOverModal: document.getElementById('gameOverModal'),
  finalHeight: document.getElementById('finalHeight'),
  finalScore: document.getElementById('finalScore'),
  finalCombo: document.getElementById('finalCombo'),
  modalTitle: document.getElementById('modalTitle'),
  modalReason: document.getElementById('modalReason'),
  btnModalRestart: document.getElementById('btnModalRestart'),
  helpModal: document.getElementById('helpModal'),
  btnCloseHelp: document.getElementById('btnCloseHelp'),
  dropZoneNotice: document.getElementById('dropZoneNotice'),
};

function initApp() {
  engine = new GameEngine(dom.container);

  engine.onScoreUpdate = updateHUD;
  engine.onDangerUpdate = updateDangerUI;
  engine.onJudgement = showJudgement;
  engine.onStateChange = onStateChange;

  setupControls();
  renderCharacterRoster();

  engine.startNewGame();
}

function createHeartSvg(isActive) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('class', `svg-heart ${isActive ? 'active' : 'lost'}`);
  svg.setAttribute('fill', 'currentColor');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
  svg.appendChild(path);
  return svg;
}

function updateHUD(stats) {
  dom.scoreVal.textContent = stats.score.toLocaleString();
  dom.heightVal.textContent = stats.stackCount;
  dom.bestVal.textContent = stats.bestScore.toLocaleString();

  if (stats.combo >= 2) {
    if (dom.comboBadge) dom.comboBadge.style.display = 'inline-flex';
    const text = `${stats.combo} COMBO`;
    if (dom.comboVal) {
      dom.comboVal.textContent = text;
    } else if (dom.comboBadge) {
      dom.comboBadge.textContent = text;
    }
  } else {
    if (dom.comboBadge) dom.comboBadge.style.display = 'none';
  }

  dom.livesBox.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    dom.livesBox.appendChild(createHeartSvg(i < stats.lives));
  }

  updateDangerUI(stats.dangerLevel);
}

function updateDangerUI(dangerLevel) {
  const dangerPct = Math.min(100, Math.round(dangerLevel * 100));
  dom.dangerFill.style.width = `${dangerPct}%`;
  if (dangerPct > 65) {
    dom.dangerFill.style.background = '#ef4444';
    dom.dangerWarning.classList.add('active');
  } else if (dangerPct > 35) {
    dom.dangerFill.style.background = '#f59e0b';
    dom.dangerWarning.classList.remove('active');
  } else {
    dom.dangerFill.style.background = '#10b981';
    dom.dangerWarning.classList.remove('active');
  }
}

let judgeTimeout = null;
function showJudgement({ type, scoreDelta }) {
  if (judgeTimeout) clearTimeout(judgeTimeout);

  dom.judgementPopup.className = `judgement-popup show ${type.toLowerCase()}`;
  const title = type;
  const sub = scoreDelta > 0 ? `+${scoreDelta}` : 'MISS';

  dom.judgementPopup.innerHTML = `
    <div class="judge-title">${title}</div>
    <div class="judge-sub">${sub}</div>
  `;

  judgeTimeout = setTimeout(() => {
    dom.judgementPopup.className = 'judgement-popup';
  }, 750);
}

function onStateChange(state) {
  if (state === GAME_STATE.GAMEOVER) {
    dom.finalHeight.textContent = `${engine.stackCount}단`;
    dom.finalScore.textContent = `${engine.score.toLocaleString()}점`;
    dom.finalCombo.textContent = `${engine.maxCombo}회`;

    if (engine.wobbleAngle !== 0) {
      dom.modalTitle.textContent = '탑이 무너졌습니다';
      dom.modalReason.textContent = '탑이 한쪽으로 삐뚤어져 중심을 잃었습니다.';
    } else {
      dom.modalTitle.textContent = '게임 종료';
      dom.modalReason.textContent = '남은 스쿱 기회를 모두 사용했습니다.';
    }

    dom.gameOverModal.classList.add('show');
  } else {
    dom.gameOverModal.classList.remove('show');
  }
}

function setupControls() {

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
      e.preventDefault();
      if (engine.state === GAME_STATE.GAMEOVER) {
        engine.startNewGame();
      } else {
        engine.dropScoop();
      }
    }
  });

  dom.btnDrop.addEventListener('click', () => {
    engine.dropScoop();
  });

  dom.container.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.ui-layer') && !e.target.closest('#btnDrop')) return;
    engine.dropScoop();
  });

  dom.btnRestart.addEventListener('click', () => engine.startNewGame());
  dom.btnModalRestart.addEventListener('click', () => engine.startNewGame());

  dom.btnMute.addEventListener('click', () => {
    const isMuted = engine.sound.toggleMute();
    dom.muteLabel.textContent = isMuted ? '소리 켜기' : '소리 끄기';
    dom.muteIcon.innerHTML = isMuted
      ? '<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
      : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
  });

  dom.btnHelp.addEventListener('click', () => dom.helpModal.classList.add('show'));
  dom.btnCloseHelp.addEventListener('click', () => dom.helpModal.classList.remove('show'));


  const triggerUpload = () => dom.fileInput.click();
  if (dom.btnRosterAdd) dom.btnRosterAdd.addEventListener('click', triggerUpload);

  dom.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileUpload(file);
      dom.fileInput.value = '';
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropZoneNotice.classList.add('active');
  });

  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
      dom.dropZoneNotice.classList.remove('active');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dom.dropZoneNotice.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  });

  const floorC1 = document.getElementById('floorColor1');
  const floorC2 = document.getElementById('floorColor2');
  if (floorC1 && floorC2) {
    floorC1.value = engine.floorColor1 || '#f0f9ff';
    floorC2.value = engine.floorColor2 || '#ecfccb';

    const onColorChange = () => {
      engine.setFloorColors(floorC1.value, floorC2.value);
    };
    floorC1.addEventListener('input', onColorChange);
    floorC2.addEventListener('input', onColorChange);
  }
}

async function handleFileUpload(file) {
  try {
    const customChar = await loadCharacterFile(file);
    engine.addCustomCharacter(customChar);
    renderCharacterRoster();
  } catch (err) {
    console.error('파일 불러오기 실패:', err);
    alert(`캐릭터 불러오기 오류: ${err.message}`);
  }
}

function renderCharacterRoster() {
  dom.characterList.innerHTML = '';

  const roster = engine.activeRoster;

  roster.forEach((char) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `char-card ${engine.selectedCharacter?.id === char.id ? 'selected' : ''}`;

    const colorCircle = document.createElement('span');
    colorCircle.className = 'color-dot';
    colorCircle.style.backgroundColor = char.state.bodyColor || '#ffffff';
    colorCircle.style.borderColor = char.state.outlineColor || '#333333';

    const info = document.createElement('div');
    info.className = 'char-info';
    info.innerHTML = `
      <div class="char-name">${char.name}</div>
      <div class="char-sub">${char.isDefault ? '기본 모델' : '10공방 커스텀'}</div>
    `;

    card.appendChild(colorCircle);
    card.appendChild(info);

    if (!char.isDefault || roster.length > 1) {
      const delBtn = document.createElement('span');
      delBtn.className = 'char-delete-btn';
      delBtn.title = '이 캐릭터 삭제';
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`'${char.name}' 캐릭터를 목록에서 삭제하시겠습니까?`)) {
          engine.deleteCustomCharacter(char.id);
          renderCharacterRoster();
        }
      });
      card.appendChild(delBtn);
    }

    card.addEventListener('click', () => {
      engine.selectCharacter(char);
      renderCharacterRoster();
    });

    dom.characterList.appendChild(card);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'char-card add-card';
  addBtn.title = '10공방 캐릭터 파일 추가 (.json, .glb, .zip)';
  addBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span style="font-size: 11px; font-weight: 700;">불러오기</span>
  `;
  addBtn.addEventListener('click', () => dom.fileInput.click());
  dom.characterList.appendChild(addBtn);
}

window.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
    (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
  ) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

console.log('%c[보안 안내] 콘솔을 통한 점수 및 게임 데이터 조작 시도는 무결성 검증에 의해 즉시 무효화됩니다.', 'color: #ef4444; font-size: 14px; font-weight: 700;');

