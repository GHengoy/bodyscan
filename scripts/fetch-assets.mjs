// 모델 파일을 같은 출처에서 서빙하기 위해 public/ 으로 내려받고 WASM을 복사한다.
import { mkdirSync, existsSync, copyFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const modelDir = join(root, 'public', 'models');
const modelPath = join(modelDir, 'pose_landmarker_lite.task');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmDst = join(root, 'public', 'wasm');

mkdirSync(modelDir, { recursive: true });
mkdirSync(wasmDst, { recursive: true });

// vision_wasm_module_internal 은 forVisionTasks(path, true) 일 때만 요청된다(미사용) → 제외
for (const f of readdirSync(wasmSrc).filter((n) => !n.includes('vision_wasm_module_internal'))) copyFileSync(join(wasmSrc, f), join(wasmDst, f));
console.log(`[assets] wasm copied → public/wasm`);

if (!existsSync(modelPath)) {
  console.log(`[assets] downloading model…`);
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`model download failed: ${res.status}`);
  // 임시 파일에 다 받은 뒤 rename → 중단돼도 반쪽 파일이 '이미 있음'으로 남지 않는다
  const tmpPath = `${modelPath}.tmp`;
  writeFileSync(tmpPath, Buffer.from(await res.arrayBuffer()));
  renameSync(tmpPath, modelPath);
  console.log(`[assets] model saved → public/models/pose_landmarker_lite.task`);
} else {
  console.log(`[assets] model exists, skip`);
}
