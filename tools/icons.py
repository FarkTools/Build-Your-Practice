"""Render the home-screen icons from the compass logo.
   python3 tools/icons.py   (needs Playwright + Chromium)
Writes icons/: apple-touch-icon.png (180), icon-192.png, icon-512.png, icon-maskable-512.png, favicon-32.png"""
import pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'icons'; out.mkdir(exist_ok=True)

def svg(scale):
    # scale: share of the square the compass fills (iOS rounds the corners itself; maskable needs a safe zone)
    r = 50 * scale
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#1a2590"/><stop offset="1" stop-color="#000a62"/></radialGradient></defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <g transform="translate(50 50) scale({r/20})">
    <circle r="18.5" fill="#f5ddbb" stroke="#f39c12" stroke-width="2.2"/>
    <circle r="14" fill="none" stroke="#000a62" stroke-width="1.1" stroke-dasharray="1.5 2.6"/>
    <path d="M0,-15 L3.2,-3 L0,0 L-3.2,-3z" fill="#f39c12" stroke="#4a2c12" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M0,15 L3.2,3 L0,0 L-3.2,3z" fill="#000a62" stroke="#4a2c12" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M-15,0 L-3,-3.2 L0,0 L-3,3.2z M15,0 L3,-3.2 L0,0 L3,3.2z" fill="#fbf1e1" stroke="#4a2c12" stroke-width="1.1" stroke-linejoin="round"/>
    <circle r="1.8" fill="#4a2c12"/>
  </g></svg>'''

jobs = [('apple-touch-icon.png', 180, .78), ('icon-192.png', 192, .78), ('icon-512.png', 512, .78), ('icon-maskable-512.png', 512, .6), ('favicon-32.png', 32, .92)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for name, size, scale in jobs:
        pg = b.new_page(viewport={'width': size, 'height': size})
        pg.set_content(f'<html><body style="margin:0">{svg(scale)}</body></html>')
        pg.screenshot(path=str(out / name), omit_background=False)
        pg.close()
        print('wrote icons/' + name)
    b.close()
