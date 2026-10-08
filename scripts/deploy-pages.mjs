// GitHub Pages(프로젝트 사이트, 하위 경로 /bodyscan/) 배포.
// 1) BASE_PATH=/bodyscan/ 로 빌드  2) dist/ 를 gh-pages 브랜치로 푸시  (Pages 소스는 gh-pages 브랜치 루트)
// 실행: npm run deploy   (사전: git remote origin이 GitHub 저장소를 가리켜야 한다)
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publish } from 'gh-pages';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_PATH = process.env.BASE_PATH ?? '/bodyscan/';

console.log(`[deploy] building with BASE_PATH=${BASE_PATH}`);
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, BASE_PATH },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const dist = join(root, 'dist');
if (!existsSync(join(dist, 'sw.js'))) throw new Error('dist/sw.js missing — build failed?');
writeFileSync(join(dist, '.nojekyll'), ''); // Pages의 Jekyll 처리 비활성화(언더스코어 파일 등 그대로 서빙)

console.log('[deploy] publishing dist/ → gh-pages');
await new Promise((resolve, reject) => {
  publish(dist, { branch: 'gh-pages', dotfiles: true, message: 'deploy: BodyScan to GitHub Pages', history: false }, (err) =>
    err ? reject(err) : resolve(),
  );
});
console.log('[deploy] done → https://ghengoy.github.io/bodyscan/ (반영까지 1~2분)');
