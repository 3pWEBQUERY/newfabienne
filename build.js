'use strict';

// Bündelt src/ (inkl. Three.js) zu einer kleinen Datei für den Browser.
const path = require('path');
const esbuild = require('esbuild');

function build() {
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'src', 'main.js')],
    outfile: path.join(__dirname, 'public', 'app.js'),
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es2020', 'safari14'],
    legalComments: 'none',
    logLevel: 'warning',
  });
}

if (require.main === module) {
  build();
  console.log('public/app.js gebaut');
}

module.exports = build;
