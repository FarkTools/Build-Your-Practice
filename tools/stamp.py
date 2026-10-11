"""Add ?v=<version> to every local script and stylesheet in index.html and the admin page,
so browsers fetch fresh files after each release instead of serving stale cached copies.
Run after bumping js/version.js:  python3 tools/stamp.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
ver = re.search(r"PP\.VERSION = '([^']+)'", (root / 'js/version.js').read_text()).group(1)
for page in ['index.html'] + [p.name for p in root.glob('admin-*.html')]:
    f = root / page
    html = f.read_text()
    html = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+)(?:\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={ver}"', html)
    f.write_text(html)
    print('stamped', page, ver)

sw = root / 'sw.js'
if sw.exists():
    sw.write_text(re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{ver}';", sw.read_text()))
    print('stamped sw.js', ver)
