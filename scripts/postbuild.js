// postbuild.js — runs after `vite build`
// Moves everything in dist/ into dist/ot2/ so that:
//   dist/ot2/index.html         ← Netlify serves this for /ot2/* requests
//   dist/ot2/assets/main-xyz.js ← matches the /ot2/assets/... URLs in the HTML
//
// Without this, Vite puts index.html at dist/index.html but the <script> tags
// inside point to /ot2/assets/... — those paths never resolve on Netlify.

import { mkdirSync, readdirSync, renameSync, existsSync } from 'fs';
import { join } from 'path';

const distDir   = 'dist';
const targetDir = join(distDir, 'ot2');

// Create dist/ot2/ if it doesn't exist
mkdirSync(targetDir, { recursive: true });

// Move every item in dist/ that isn't the ot2/ folder itself
const entries = readdirSync(distDir).filter(name => name !== 'ot2');

for (const entry of entries) {
  const src  = join(distDir, entry);
  const dest = join(targetDir, entry);
  renameSync(src, dest);
  console.log(`  moved: dist/${entry}  →  dist/ot2/${entry}`);
}

console.log('\n✅ Post-build complete — dist/ot2/ is ready for Netlify\n');
