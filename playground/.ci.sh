#!/bin/bash
set -ex

for folder in csharp-generator dart-generator kotlin-generator parser swift-generator typescript-generator; do
  cd ..
  cd "$folder"
  npm i
done
