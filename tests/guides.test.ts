import { describe, it, expect } from 'vitest';
import { GUIDES } from '../src/guides/content';
import { guideFiles, guideSitemapPaths, renderGuide } from '../src/guides/render';

const env = { siteUrl: 'https://example.com/', base: '/' };

describe('guide pages', () => {
  it('slugs are unique and related links point to existing guides', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) for (const r of g.related) expect(slugs).toContain(r);
  });
  it('every guide has unique title/description and real content', () => {
    expect(new Set(GUIDES.map((g) => g.title)).size).toBe(GUIDES.length);
    expect(new Set(GUIDES.map((g) => g.description)).size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      expect(g.selfCheck.length).toBeGreaterThan(0);
      expect(g.stretches.length).toBeGreaterThan(0);
      expect(g.faq.length).toBeGreaterThan(0);
    }
  });
  it('renders canonical, CTA, FAQ schema, and no medical-diagnosis promise', () => {
    const html = renderGuide(GUIDES[0], env);
    expect(html).toContain('<link rel="canonical" href="https://example.com/guide/forward-head/" />');
    expect(html).toContain('class="cta" href="/"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('의료적 진단이 아닙니다');
    expect(html).not.toContain('undefined');
  });
  it('omits GA/AdSense scripts unless configured', () => {
    expect(renderGuide(GUIDES[0], env)).not.toContain('googletagmanager');
    expect(renderGuide(GUIDES[0], { ...env, gaId: 'G-X', adsenseClient: 'ca-pub-1' })).toContain('adsbygoogle.js?client=ca-pub-1');
  });
  it('emits hub + one file per guide, all in sitemap', () => {
    expect(guideFiles(env).map(([f]) => f)).toEqual(['guide/index.html', ...GUIDES.map((g) => `guide/${g.slug}/index.html`)]);
    expect(guideSitemapPaths()).toHaveLength(GUIDES.length + 1);
  });
});
