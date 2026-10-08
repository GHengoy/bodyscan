import { defineConfig, type Plugin } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 배포 경로. GitHub Pages(프로젝트 사이트)처럼 하위 경로에 올릴 때 BASE_PATH=/bodyscan/ 로 빌드한다. */
const BASE = process.env.BASE_PATH ?? '/';

function swPrecache(): Plugin {
  return {
    name: 'bodyscan-sw-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => BASE + f);
      const template = readFileSync(fileURLToPath(new URL('./src/sw.template.js', import.meta.url)), 'utf8');
      const mpPkg = JSON.parse(
        readFileSync(fileURLToPath(new URL('./node_modules/@mediapipe/tasks-vision/package.json', import.meta.url)), 'utf8'),
      ) as { version: string };
      const source = template
        .replace('__BUILD_ASSETS__', JSON.stringify(assets))
        .replace('__BUILD_ID__', Date.now().toString(36))
        .replace('__MP_VERSION__', mpPkg.version)
        .replace('__BASE__', BASE);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [swPrecache()],
  server: { port: 5173 },
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
