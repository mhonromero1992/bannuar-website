import { defineConfig } from 'astro/config';

export default defineConfig({
  // update when the domain is set, so canonical and share links follow it (also src/data/site.js)
  site: 'https://bannuar-website.vercel.app',
  output: 'static',
  /* folder-style pages (careers/index.html) are served at /careers by every static host, Vercel included */
  build: { format: 'directory', inlineStylesheets: 'auto' },
  trailingSlash: 'ignore',
  compressHTML: true,
});
