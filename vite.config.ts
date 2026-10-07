import { defineConfig, type Plugin } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function swPrecache(): Plugin {
  return {
    name: 'bodyscan-sw-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => '/' + f);
      const template = readFileSync(fileURLToPath(new URL('./src/sw.template.js', import.meta.url)), 'utf8');
      const source = template
        .replace('__BUILD_ASSETS__', JSON.stringify(assets))
        .replace('__BUILD_ID__', Date.now().toString(36));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [swPrecache()],
  server: { port: 5173 },
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
