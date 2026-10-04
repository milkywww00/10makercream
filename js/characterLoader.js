import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEFAULT_STATE } from './config.js';

export function createDefaultScoopCharacter() {
  return {
    id: 'default_scoop',
    name: '기본 캐릭터',
    flavor: '10공방 기본 스쿱',
    state: {
      ...DEFAULT_STATE,
      characterName: '기본 캐릭터',
      bodyColor: '#ffffff',
      innerEarColor: '#ffb5c2',
      eyeColor: '#18181b',
      mouthType: 'cat_w',
      noseMouthColor: '#18181b',
      earType: 'cat',
      blushType: 'comic_circle',
      blushColor: '#ff8da1',
      blushOpacity: 0.75,
      outlineColor: '#18181b',
      outlineThickness: 0.035,
    },
    isDefault: true,
  };
}

function extractCharacterJsonFromZipBuffer(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('utf-8');
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const compression = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
    const fileName = decoder.decode(nameBytes);
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;

    if (fileName.endsWith('.json') && compression === 0 && dataEnd <= bytes.length) {
      const jsonText = decoder.decode(bytes.subarray(dataStart, dataEnd));
      return JSON.parse(jsonText);
    }
    offset = dataEnd;
  }
  return null;
}

export async function loadCharacterFile(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  const baseName = file.name.replace(/\.[^.]+$/, '');

  if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const loadedState = parsed && parsed.state ? parsed.state : parsed;
    if (!loadedState || typeof loadedState !== 'object') {
      throw new Error('유효한 10공방 캐릭터 데이터가 아닙니다.');
    }
    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: loadedState.characterName || baseName || '내 캐릭터',
      flavor: '10공방 커스텀 스쿱',
      state: { ...DEFAULT_STATE, ...loadedState },
      isCustom: true
    };
  }

  if (ext === 'zip') {
    const buf = await file.arrayBuffer();
    const parsed = extractCharacterJsonFromZipBuffer(buf);
    if (!parsed) {
      throw new Error('ZIP 내부에 character.json 파일이 없습니다. 10공방에서 저장한 ZIP 파일을 선택해주세요.');
    }
    const loadedState = parsed.state || parsed;
    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: loadedState.characterName || baseName || '내 캐릭터',
      flavor: '10공방 MMD 커스텀 스쿱',
      state: { ...DEFAULT_STATE, ...loadedState },
      isCustom: true
    };
  }

  if (ext === 'glb' || ext === 'gltf') {
    const buf = await file.arrayBuffer();
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(buf, '', resolve, reject);
    });

    let embeddedState = gltf.scene?.userData?.studio10State || null;
    if (!embeddedState && gltf.scene) {
      gltf.scene.traverse((child) => {
        if (!embeddedState && child.userData && child.userData.studio10State) {
          embeddedState = child.userData.studio10State;
        }
      });
    }

    if (embeddedState && typeof embeddedState === 'object') {
      return {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: embeddedState.characterName || gltf.scene.name || baseName || '내 캐릭터',
        flavor: '10공방 3D 커스텀 스쿱',
        state: { ...DEFAULT_STATE, ...embeddedState },
        isCustom: true
      };
    }

    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: baseName || '내 캐릭터',
      flavor: '10공방 3D 모델 스쿱',
      state: { ...DEFAULT_STATE, characterName: baseName },
      isCustom: true
    };
  }

  throw new Error('지원하지 않는 파일 형식입니다. (.json, .glb, .zip 파일)');
}
