#!/usr/bin/env python3
"""Downsample a camera original to a 1024px swatch.

This script documents the method. It does not reproduce the shipped swatch
files. Those were produced by hand, and a sweep over five resample filters,
progressive on and off, and quality 40 to 95 produced no byte-size match.
The files in public/ are the artefact; this is the recipe.

Usage: python3 scripts/make-swatch.py A.JPG public/swatches/brocade.jpg
"""
import sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = None          # the originals are 101.7 megapixels
EDGE, BUDGET = 1024, 300_000

src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGB")
scale = EDGE / max(img.size)
img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)

for quality in range(95, 39, -1):      # step down until it fits the budget
    img.save(dst, "JPEG", quality=quality, progressive=True)
    with open(dst, "rb") as f:
        size = len(f.read())
    if size < BUDGET:
        print(f"{dst}  {img.width}x{img.height}  q={quality}  {size} bytes")
        break
else:
    sys.exit(f"{src}: could not reach {BUDGET} bytes even at quality 40")
