#!/bin/bash
for filename in ./sketches/*.js; do
  npx canvas-sketch "$filename" --build --inline --dir public/sketches
done
