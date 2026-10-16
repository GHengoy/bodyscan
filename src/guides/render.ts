import type { Stretch } from '../copy';
import { GUIDES, GUIDE_HUB, type Guide } from './content';

/** 빌드 때 가이드 HTML을 굽는 데 필요한 값 */
export interface GuideEnv {
  /** 공개 절대 주소(슬래시로 끝) — canonical·OG·JSON-LD */
  siteUrl: string;
  /** 배포 경로(슬래시로 끝) — 사이트 안 링크 */
  base: string;
  adsenseClient?: string;
  gaId?: string;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export const guidePath = (slug: string): string => `guide/${slug}/`;

const CSS = `
:root{--bg:#0f1115;--card:#181b22;--card-2:#20242d;--text:#f3f4f6;--muted:#9aa3b2;--accent:#4ade80}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",system-ui,sans-serif;line-height:1.65}
main{max-width:680px;margin:0 auto;padding:20px 16px 48px}
a{color:var(--accent)}
nav.crumb{font-size:.82rem;color:var(--muted)}
nav.crumb a{color:var(--muted)}
h1{font-size:1.7rem;line-height:1.3;margin:12px 0}
h2{font-size:1.15rem;margin:32px 0 10px}
h3{font-size:1rem;margin:0 0 6px}
.lead{color:var(--muted)}
.card{background:var(--card);border-radius:16px;padding:16px;margin:12px 0}
.card .read{background:var(--card-2);border-radius:10px;padding:10px 12px;font-size:.92rem}
ul,ol{padding-left:22px}
li{margin:4px 0}
.dose{font-size:.8rem;color:var(--accent);margin-left:6px;white-space:nowrap;font-weight:400}
.cta{display:block;text-align:center;background:var(--accent);color:#052e16;font-weight:700;text-decoration:none;border-radius:999px;padding:16px 24px;margin:24px 0 8px;font-size:1.05rem}
.cta-sub{text-align:center;font-size:.85rem;color:var(--muted);margin:0}
details{background:var(--card);border-radius:12px;padding:12px 14px;margin:8px 0}
summary{cursor:pointer;font-weight:600}
details p{color:var(--muted);margin:8px 0 0}
.related a{display:block;background:var(--card);border-radius:12px;padding:12px 14px;margin:8px 0;text-decoration:none;color:var(--text)}
.related a span{display:block;font-size:.85rem;color:var(--muted)}
.fine{font-size:.78rem;color:var(--muted);margin-top:32px}
`;

function head(env: GuideEnv, title: string, description: string, path: string, jsonLd: object[]): string {
  const url = env.siteUrl + path;
  const ga = env.gaId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(env.gaId)}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(env.gaId)}',{anonymize_ip:true});</script>`
    : '';
  const ads = env.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(env.adsenseClient)}" crossorigin="anonymous"></script>`
    : '';
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0f1115" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="${env.base}icon.svg" type="image/svg+xml" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="BodyScan" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${env.siteUrl}og.png" />
    <meta property="og:locale" content="ko_KR" />
    <meta name="twitter:card" content="summary_large_image" />
    ${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n    ')}
    ${ga}
    ${ads}
    <style>${CSS}</style>
  </head>`;
}

function stretchHtml(s: Stretch): string {
  return `<div class="card"><h3>${s.emoji} ${esc(s.name)}<span class="dose">${esc(s.dose)}</span></h3><ol>${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
}

function cta(env: GuideEnv): string {
  return `<a class="cta" href="${env.base}">📱 폰 카메라로 30초 측정하기</a>
    <p class="cta-sub">무료 · 앱 설치 없음 · 영상은 저장·전송되지 않아요</p>`;
}

const DISCLAIMER = '이 글과 BodyScan 결과는 자세 습관을 점검하기 위한 참고용이며 의료적 진단이 아닙니다. 통증·저림이 있거나 증상이 계속되면 의료 전문가와 상담하세요.';

export function renderGuide(g: Guide, env: GuideEnv): string {
  const path = guidePath(g.slug);
  const related = g.related.map((s) => GUIDES.find((x) => x.slug === s)).filter((x): x is Guide => !!x);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'BodyScan', item: env.siteUrl },
        { '@type': 'ListItem', position: 2, name: GUIDE_HUB.h1, item: env.siteUrl + 'guide/' },
        { '@type': 'ListItem', position: 3, name: g.h1, item: env.siteUrl + path },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ];
  return `${head(env, g.title, g.description, path, jsonLd)}
  <body>
    <main>
      <nav class="crumb"><a href="${env.base}">BodyScan</a> › <a href="${env.base}guide/">자가진단 가이드</a></nav>
      <h1>${esc(g.h1)}</h1>
      <p class="lead">${esc(g.intro)}</p>
      ${cta(env)}

      <h2>이런 신호가 있나요?</h2>
      <ul>${g.signs.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

      <h2>집에서 하는 자가 체크</h2>
      ${g.selfCheck.map((c) => `<div class="card"><h3>${esc(c.name)}</h3><ol>${c.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol><div class="read">👉 ${esc(c.read)}</div></div>`).join('')}

      <h2>BodyScan은 이렇게 재요</h2>
      <p>${esc(g.howWeMeasure)}</p>
      ${cta(env)}

      ${g.causes.length ? `<h2>흔한 원인</h2><ul>${g.causes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}

      <h2>도움이 되는 스트레칭</h2>
      ${g.stretches.map(stretchHtml).join('')}
      <p class="cta-sub">반동 없이 천천히, 통증이 느껴지면 바로 멈추세요.</p>

      <h2>자주 묻는 질문</h2>
      ${g.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}

      <h2>함께 보면 좋은 가이드</h2>
      <div class="related">${related.map((r) => `<a href="${env.base}${guidePath(r.slug)}">${esc(r.h1)}<span>${esc(r.description)}</span></a>`).join('')}</div>

      <p class="fine">${DISCLAIMER}</p>
    </main>
  </body>
</html>
`;
}

export function renderHub(env: GuideEnv): string {
  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: GUIDE_HUB.h1,
    url: env.siteUrl + 'guide/',
    hasPart: GUIDES.map((g) => ({ '@type': 'WebPage', name: g.h1, url: env.siteUrl + guidePath(g.slug) })),
  }];
  return `${head(env, GUIDE_HUB.title, GUIDE_HUB.description, 'guide/', jsonLd)}
  <body>
    <main>
      <nav class="crumb"><a href="${env.base}">BodyScan</a></nav>
      <h1>${esc(GUIDE_HUB.h1)}</h1>
      <p class="lead">${esc(GUIDE_HUB.intro)}</p>
      ${cta(env)}
      <div class="related">${GUIDES.map((g) => `<a href="${env.base}${guidePath(g.slug)}">${esc(g.h1)}<span>${esc(g.description)}</span></a>`).join('')}</div>
      <p class="fine">${DISCLAIMER}</p>
    </main>
  </body>
</html>
`;
}

/** 빌드 산출물: [파일 경로, HTML] */
export function guideFiles(env: GuideEnv): [string, string][] {
  return [
    ['guide/index.html', renderHub(env)],
    ...GUIDES.map((g): [string, string] => [`${guidePath(g.slug)}index.html`, renderGuide(g, env)]),
  ];
}

/** sitemap에 넣을 경로(사이트 루트 기준) */
export const guideSitemapPaths = (): string[] => ['guide/', ...GUIDES.map((g) => guidePath(g.slug))];
