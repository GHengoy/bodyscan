import { defineConfig, type Plugin } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 배포 경로. GitHub Pages(프로젝트 사이트)처럼 하위 경로에 올릴 때 BASE_PATH=/bodyscan/ 로 빌드한다. */
const BASE = process.env.BASE_PATH ?? '/';
/** 공개 주소(절대 URL, 슬래시로 끝). OG 이미지·canonical·sitemap에 쓰인다. */
const SITE_URL = process.env.SITE_URL ?? 'https://ghengoy.github.io/bodyscan/';

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

/** index.html의 __SITE_URL__ 치환 + robots.txt / sitemap.xml 생성(검색엔진 노출용) */
function seoFiles(): Plugin {
  return {
    name: 'bodyscan-seo',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', SITE_URL);
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /*?capture=1\nSitemap: ${SITE_URL}sitemap.xml\n`,
      });
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [swPrecache(), seoFiles()],
  server: { port: 5173 },
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
