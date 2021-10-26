#!/bin/bash
set -ex

if ! [ -x "$(command -v json)" ]; then
  npm i -g json
fi

for folder in browser-runtime csharp-generator dart-generator kotlin-generator parser swift-generator typescript-generator; do
  cd ..
  cd "$folder"
  npm i
  npm run build
  json -I -f package.json -e '
    this.main = "dist/src/index.js";
    this.types = "dist/src/index.d.ts";
  '
done
