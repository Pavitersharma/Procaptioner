"""
Generate ProCaptioner PC Monogram SVGs, PNGs, and ICO favicon assets.
"""
import os
from PIL import Image, ImageDraw, ImageFont

def generate_svgs():
    # 1. Dark favicon SVG (with dark squircle background for browser tab / PWA)
    svg_dark = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="pro-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A1D"/>
      <stop offset="100%" stop-color="#FF5B00"/>
    </linearGradient>
  </defs>
  <!-- Squircle Background -->
  <rect width="64" height="64" rx="14" fill="#0B0B0B"/>
  <rect width="64" height="64" rx="14" fill="none" stroke="rgba(255, 122, 26, 0.28)" stroke-width="1.5"/>
  
  <!-- Typographic PC Monogram -->
  <g id="monogram">
    <!-- P: Exo 2 stylized bold italic in Pro Orange -->
    <path d="M 13 49 L 18.5 15 H 31.5 C 38.5 15 42.5 18.8 41 25 C 39.7 30.5 35 34 29 34 H 22 L 18.8 49 Z M 24.2 27.5 H 29 C 32.5 27.5 34.8 25.8 35.4 23.2 C 36 20.8 34.2 19.5 31 19.5 H 25.8 Z" fill="url(#pro-grad)"/>
    
    <!-- C: Space Grotesk clean geometric arc in Captioner Off-White -->
    <path d="M 52.5 25.5 L 47 28 C 45.4 25.2 42.4 23.5 38.5 23.5 C 32.2 23.5 27.6 28.5 29 35.5 C 30.2 41.2 35 44.5 40.5 44.5 C 44.5 44.5 47.8 42.5 49.8 39.2 L 55 42 C 52 47 46.8 50.5 39.8 50.5 C 30.5 50.5 23.5 44.2 22 34.8 C 20.2 25.5 27.2 18 38.5 18 C 44.8 18 49.8 21.2 52.5 25.5 Z" fill="#F5F5F5"/>
  </g>
</svg>'''

    # 2. Transparent Monogram SVG (for inline use in compact logo component)
    svg_transparent = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="pro-grad-t" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A1D"/>
      <stop offset="100%" stop-color="#FF5B00"/>
    </linearGradient>
  </defs>
  <g id="monogram-transparent">
    <!-- P in Pro Orange -->
    <path d="M 13 49 L 18.5 15 H 31.5 C 38.5 15 42.5 18.8 41 25 C 39.7 30.5 35 34 29 34 H 22 L 18.8 49 Z M 24.2 27.5 H 29 C 32.5 27.5 34.8 25.8 35.4 23.2 C 36 20.8 34.2 19.5 31 19.5 H 25.8 Z" fill="url(#pro-grad-t)"/>
    <!-- C in currentColor or Off-White -->
    <path d="M 52.5 25.5 L 47 28 C 45.4 25.2 42.4 23.5 38.5 23.5 C 32.2 23.5 27.6 28.5 29 35.5 C 30.2 41.2 35 44.5 40.5 44.5 C 44.5 44.5 47.8 42.5 49.8 39.2 L 55 42 C 52 47 46.8 50.5 39.8 50.5 C 30.5 50.5 23.5 44.2 22 34.8 C 20.2 25.5 27.2 18 38.5 18 C 44.8 18 49.8 21.2 52.5 25.5 Z" fill="currentColor"/>
  </g>
</svg>'''

    # 3. Light Favicon SVG (for light surfaces)
    svg_light = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="pro-grad-l" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7A1A"/>
      <stop offset="100%" stop-color="#FF5B00"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#FFFFFF"/>
  <rect width="64" height="64" rx="14" fill="none" stroke="rgba(0, 0, 0, 0.1)" stroke-width="1.5"/>
  <g id="monogram-light">
    <path d="M 13 49 L 18.5 15 H 31.5 C 38.5 15 42.5 18.8 41 25 C 39.7 30.5 35 34 29 34 H 22 L 18.8 49 Z M 24.2 27.5 H 29 C 32.5 27.5 34.8 25.8 35.4 23.2 C 36 20.8 34.2 19.5 31 19.5 H 25.8 Z" fill="url(#pro-grad-l)"/>
    <path d="M 52.5 25.5 L 47 28 C 45.4 25.2 42.4 23.5 38.5 23.5 C 32.2 23.5 27.6 28.5 29 35.5 C 30.2 41.2 35 44.5 40.5 44.5 C 44.5 44.5 47.8 42.5 49.8 39.2 L 55 42 C 52 47 46.8 50.5 39.8 50.5 C 30.5 50.5 23.5 44.2 22 34.8 C 20.2 25.5 27.2 18 38.5 18 C 44.8 18 49.8 21.2 52.5 25.5 Z" fill="#151515"/>
  </g>
</svg>'''

    with open("e:/ProCaptioner/public/favicon.svg", "w", encoding="utf-8") as f:
        f.write(svg_dark)
    with open("e:/ProCaptioner/public/favicon-light.svg", "w", encoding="utf-8") as f:
        f.write(svg_light)
    with open("e:/ProCaptioner/public/monogram.svg", "w", encoding="utf-8") as f:
        f.write(svg_transparent)
    print("Generated SVGs successfully")

def generate_raster_assets():
    # Render at high resolution (1024x1024) and downscale with Lanczos for ultra-crisp antialiasing
    size = 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Dark squircle background
    # Corner radius 220px
    bg_color = (11, 11, 11, 255) # #0B0B0B
    border_color = (255, 122, 26, 75)
    draw.rounded_rectangle([20, 20, size - 20, size - 20], radius=220, fill=bg_color, outline=border_color, width=12)

    # Scale coordinates from 64 to 1024 (multiplier = 16)
    m = 16

    # 2. Draw P in vibrant brand orange #FF7A1A
    orange = (255, 122, 26, 255)
    
    # Stem of P (italic slant)
    stem_p = [
        (int(14 * m), int(50 * m)),
        (int(19.5 * m), int(14 * m)),
        (int(26.5 * m), int(14 * m)),
        (int(21 * m), int(50 * m))
    ]
    draw.polygon(stem_p, fill=orange)

    # Top bridge connecting stem to bowl
    draw.rectangle([int(20 * m), int(14 * m), int(33 * m), int(22 * m)], fill=orange)

    # Outer bowl of P
    draw.chord([int(22 * m), int(14 * m), int(42 * m), int(35 * m)], 270, 90, fill=orange)
    draw.rectangle([int(22 * m), int(21 * m), int(32 * m), int(35 * m)], fill=orange)

    # Inner cutout of P
    draw.chord([int(26 * m), int(20 * m), int(35.5 * m), int(29 * m)], 270, 90, fill=bg_color)
    draw.rectangle([int(24 * m), int(20 * m), int(31 * m), int(29 * m)], fill=bg_color)

    # 3. Draw C in crisp off-white #F5F5F5
    off_white = (245, 245, 245, 255)
    c_outer = [int(25 * m), int(17 * m), int(54 * m), int(51 * m)]
    c_inner = [int(31 * m), int(23 * m), int(48 * m), int(45 * m)]

    # Draw outer pie slice for C (angle 38 deg to 322 deg)
    draw.pieslice(c_outer, 38, 322, fill=off_white)
    # Cut out inner hole
    draw.pieslice(c_inner, 0, 360, fill=bg_color)
    # Cut out mouth of C
    draw.pieslice(c_outer, -38, 38, fill=bg_color)

    # Now downsample to various required sizes:
    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }

    for filename, s in sizes.items():
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        out_path = os.path.join("e:/ProCaptioner/public", filename)
        resized.save(out_path, "PNG")
        print(f"Saved {out_path} ({s}x{s})")

    # Also make icons for multi-resolution ICO
    img48 = img.resize((48, 48), Image.Resampling.LANCZOS)
    img32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    img16 = img.resize((16, 16), Image.Resampling.LANCZOS)

    # Save multi-size favicon.ico
    ico_path = "e:/ProCaptioner/public/favicon.ico"
    img16.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[img32, img48])
    print(f"Saved {ico_path} with 16, 32, 48px icons")

if __name__ == "__main__":
    generate_svgs()
    generate_raster_assets()
