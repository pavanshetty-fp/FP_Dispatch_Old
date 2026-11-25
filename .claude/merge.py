#!/usr/bin/env python3
"""Combine the three prototypes into one .html.

Each screen keeps its own stylesheet and script; they just stop fighting:
  - every CSS selector is scoped to that screen's container, because 144
    class names are shared between them
  - the 18 globals that collide are renamed per screen, in the whole file text
    so inline handlers and generated markup follow
  - the per-file prototype switcher is dropped; one nav replaces it
"""
import re, pathlib, sys

SRC = pathlib.Path('/Users/pavanshetty/Documents/FP_Prototype/prototypes')
OUT = SRC / 'fleetpanda.html'

SCREENS = [
    ('create', 'Create order',  'create-order.html'),
    ('edit',   'Edit order',    'load-order-unassigned.html'),
    ('plan',   'Shift planner', 'shift-planner-ui2.html'),
]

# these exist in more than one screen and would otherwise overwrite each other
COLLIDING = """BLEND_PRODUCTS COMPARABLE DRIVERS PROD_COLORS RACK addTrailer applyMode
cheapestTerminal colClick onDriverChange pickAccount pickTerminal planAssignments
renderModes setSplit terminalCanSupplyAll totalFor
FREIGHT_PER_MI PACE PACE_WORD SRC_REASONS deviations freightFor landed
preferredTerminal preferredWhy racksIt setReason unexplained""".split()


def strip_switcher(text):
    """Drop the per-file prototype switcher: its comment, style, markup and script."""
    text = re.sub(r'<!-- ═+\s*\n\s*Prototype switcher.*?═+ -->\s*', '', text, flags=re.S)
    text = re.sub(r'<style>\s*#protoSwitch.*?</style>\s*', '', text, flags=re.S)
    text = re.sub(r'<div id="protoSwitch">.*?</button>\s*(?=<script>)', '', text, flags=re.S)
    text = re.sub(r'<script>\s*function psToggle.*?</script>\s*', '', text, flags=re.S)
    return text


def split_selector(sel):
    """Top-level commas only — selectors here have no :is()/:not() lists with commas."""
    parts, depth, cur = [], 0, ''
    for ch in sel:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur); cur = ''
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    return parts


def scope_selector(sel, scope):
    out = []
    for part in split_selector(sel):
        p = part.strip()
        if not p:
            continue
        if p in ('body', 'html', ':root'):
            out.append(scope)                      # the screen IS the page here
        elif p.startswith('body '):
            out.append(scope + p[4:])
        elif p.startswith('*'):
            out.append(scope + ' ' + p)
        else:
            out.append(scope + ' ' + p)
    return ','.join(out)


def scope_css(css, scope):
    out, i, n = [], 0, len(css)
    while i < n:
        if css.startswith('/*', i):
            j = css.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(css[i:j]); i = j; continue
        if css[i].isspace():
            out.append(css[i]); i += 1; continue
        if css[i] == '@':
            j = i
            while j < n and css[j] not in '{;':
                j += 1
            head = css[i:j]
            if j < n and css[j] == ';':
                out.append(css[i:j + 1]); i = j + 1; continue
            depth, k = 0, j
            while k < n:
                if css[k] == '{': depth += 1
                elif css[k] == '}':
                    depth -= 1
                    if depth == 0: break
                k += 1
            body = css[j + 1:k]
            kind = head.split()[0].lower()
            if kind in ('@media', '@supports'):
                out.append(head + '{' + scope_css(body, scope) + '}')
            else:
                out.append(head + '{' + body + '}')   # @keyframes etc. stay as written
            i = k + 1; continue
        j = i
        while j < n and css[j] != '{':
            j += 1
        if j >= n:
            out.append(css[i:]); break
        sel = css[i:j]
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        out.append(scope_selector(sel, scope) + '{' + css[j + 1:k - 1] + '}')
        i = k
    return ''.join(out)


def build():
    styles, scripts, markup, missing = [], [], [], []

    for key, label, fname in SCREENS:
        path = SRC / fname
        if not path.exists():
            missing.append(fname); continue
        text = strip_switcher(path.read_text())
        scope = '#scr-' + key

        # rename only what would collide, across the whole file so handlers follow
        for name in COLLIDING:
            if re.search(r'\b%s\b' % name, text):
                text = re.sub(r'\b%s\b' % name, '%s_%s' % (key, name), text)

        css = '\n'.join(re.findall(r'<style>(.*?)</style>', text, re.S))
        js  = '\n'.join(re.findall(r'<script>(.*?)</script>', text, re.S))
        body = re.search(r'<body>(.*?)</body>', text, re.S).group(1)
        body = re.sub(r'<(script|style)>.*?</\1>', '', body, flags=re.S)

        # A screen is a box inside the shell, not the window: the shell's own
        # 48px nav means 100vh overflows it by 48 and whatever is anchored to
        # the bottom (the planner's day bar) is clipped away. Inside the screen
        # 100% IS the screen, since every .screen is position:absolute;inset:0.
        css = css.replace('100vh', '100%')
        styles.append('/* ══ %s ══ */\n%s' % (label, scope_css(css, scope)))
        scripts.append('/* ══ %s ══ */\n%s' % (label, js))
        markup.append('<section class="screen" id="scr-%s">%s</section>' % (key, body))

    if missing:
        sys.exit('missing: ' + ', '.join(missing))

    nav = '\n'.join(
        '    <button class="nav-tab%s" data-scr="%s" onclick="showScreen(\'%s\')">%s</button>'
        % (' on' if i == 0 else '', k, k, lbl)
        for i, (k, lbl, _) in enumerate(SCREENS))

    OUT.write_text(TEMPLATE
                   .replace('/*STYLES*/', '\n\n'.join(styles))
                   .replace('<!--NAV-->', nav)
                   .replace('<!--MARKUP-->', '\n\n'.join(markup))
                   .replace('/*SCRIPTS*/', '\n\n'.join(scripts)))
    print('wrote', OUT, '(%d KB)' % (OUT.stat().st_size // 1024))


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1440">
<title>FleetPanda — Prototypes</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
<style>
/* ══ Shell ══════════════════════════════════════════════════
   Each screen below keeps its own stylesheet, scoped to its own container —
   they share 144 class names, so without the scope they would overwrite each
   other. Only this shell is global. */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;}
body{font-family:'Geist',system-ui,sans-serif;background:#e8e8e4;color:#030405;overflow:hidden;}

.shell{height:100vh;display:flex;flex-direction:column;}
.shell-nav{height:48px;background:#ffffff;border-bottom:1px solid #c8c9cd;display:flex;align-items:center;gap:4px;padding:0 14px;flex-shrink:0;z-index:50;}
.shell-brand{display:flex;align-items:center;gap:8px;margin-right:16px;font-size:14px;font-weight:600;color:#030405;white-space:nowrap;}
.shell-brand span{width:22px;height:22px;border-radius:50%;background:#fa6400;display:flex;align-items:center;justify-content:center;font-size:12px;}
.nav-tab{height:32px;padding:0 14px;border:none;border-radius:8px;background:transparent;color:#4f5968;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;}
.nav-tab:hover{background:#dee0e5;color:#030405;}
.nav-tab.on{background:#090c0f;color:#f0f2f5;font-weight:600;}
.shell-note{margin-left:auto;font-size:12px;color:#4f5968;white-space:nowrap;}

.shell-body{flex:1;position:relative;overflow:hidden;min-height:0;}
.screen{position:absolute;inset:0;overflow:hidden;display:none;}
.screen.on{display:block;}

/*STYLES*/
</style>
</head>
<body>

<div class="shell">
  <div class="shell-nav">
    <div class="shell-brand"><span>🐼</span> FleetPanda</div>
<!--NAV-->
    <div class="shell-note">Prototypes — not the product</div>
  </div>
  <div class="shell-body">

<!--MARKUP-->

  </div>
</div>

<script>
function showScreen(key) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.toggle('on', s.id === 'scr-' + key);
  });
  document.querySelectorAll('.nav-tab').forEach(function (b) {
    b.classList.toggle('on', b.dataset.scr === key);
  });
  if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
}
</script>

<script>
/*SCRIPTS*/
</script>

<script>
// open on whichever screen the link names, else the first
(function () {
  var want = location.hash.slice(1);
  var known = ['create', 'edit', 'plan'];
  showScreen(known.indexOf(want) >= 0 ? want : 'create');
})();
</script>

</body>
</html>
"""

if __name__ == '__main__':
    build()
