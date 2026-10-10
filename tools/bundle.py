"""Bundle the player page (index.html) + css + js into one self-contained file.

  python3 tools/bundle.py            -> dist/port-prospect.html (full single-file game)
  python3 tools/bundle.py --fragment -> dist/fragment.html (no <html>/<head>/<body> wrapper,
                                        for hosts that supply their own page skeleton)
"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + (root / m.group(1)).read_text() + '\n</style>', html)
def inline(m):
    src = (root / m.group(1)).read_text()
    return '<script>\n' + src.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
out = root / 'dist'; out.mkdir(exist_ok=True)
if '--fragment' in sys.argv:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', head)
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    (out / 'fragment.html').write_text(head.strip() + '\n' + body.strip() + '\n')
    print('wrote dist/fragment.html')
else:
    (out / 'port-prospect.html').write_text(html)
    print('wrote dist/port-prospect.html')
