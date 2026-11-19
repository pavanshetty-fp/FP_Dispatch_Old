// Drives each prototype through its real flow in the page and reports anything
// that errored, clipped or overflowed. Paste-run via the browser tool.
(async function () {
  const out = { page: window.__SMOKE_PAGE__ || location.pathname.split('/').pop(), width: innerWidth, steps: [], errors: [], layout: [] };
  window.onerror = (m, s, l) => out.errors.push(m + ' @' + l);

  const step = (name, fn) => {
    try { fn(); out.steps.push('ok   ' + name); }
    catch (e) { out.steps.push('FAIL ' + name + ': ' + e.message); }
  };
  const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));

  if (out.page.startsWith('create-order')) {
    step('pick customer', () => {
      const s = document.getElementById('custSel');
      s.value = 'morris|112|Denver, CO, USA'; fire(s, 'change');
    });
    step('next to order planning', () => goToOrderPlanning());
    step('load order starts as a CTA', () => {
      if (document.getElementById('s3LoSection').style.display !== 'none') throw new Error('load order already open');
      if (document.getElementById('s3LoAdd').disabled) throw new Error('CTA locked though lines exist');
    });
    step('add a load order', () => {
      document.getElementById('s3LoAdd').click();
      if (document.getElementById('s3Body').dataset.split !== 'lo') throw new Error('did not focus the load order');
    });
    step('focus switches back to delivery', () => {
      document.getElementById('s3FocusDo').click();
      if (document.getElementById('s3Body').dataset.split !== 'do') throw new Error('focus did not move');
      document.getElementById('s3FocusLo').click();
    });
    step('pick driver (auto-picks truck)', () => {
      const d = document.getElementById('s3DriverSel'); d.value = 'alex'; fire(d, 'change');
    });
    step('truck was auto-selected', () => {
      if (document.getElementById('s3TruckSel').value !== 'Hi-12') throw new Error('truck not set');
    });
    step('compartments planned', () => {
      if (!s3.assignments.length) throw new Error('no assignments');
    });
    step('order lines show loaded/status', () => {
      const st = [...document.querySelectorAll('#bdBody .bd-status')].map(e => e.textContent.trim());
      if (!st.length || st.some(x => !x)) throw new Error('status cells empty');
    });
    step('edit a quantity re-plans', () => {
      const q = document.querySelector('#bdBody input[type=number]');
      q.value = 4200; fire(q, 'change');
      if (s3.products[0].qty !== 4200) throw new Error('qty not picked up');
    });
    step('go to best buy', () => goToStep4());
    step('best buy priced', () => {
      if (!document.querySelectorAll('#s4Modes .bb-mode').length) throw new Error('no sourcing modes');
      if (!document.getElementById('s4Total').textContent.trim()) throw new Error('no total');
    });
  }

  if (out.page.startsWith('load-order')) {
    step('pick driver', () => { const d = document.getElementById('driverSel'); d.value = 'shriya'; fire(d, 'change'); });
    step('equipment revealed', () => {
      if (!document.getElementById('equipRow').children.length) throw new Error('no equipment');
    });
    step('compartments planned', () => {
      if (!document.querySelectorAll('#compAssignBody tr').length) throw new Error('no assignment rows');
    });
    step('pre-loaded product kept', () => {
      const c1 = loPlan.assignments.find(a => a.label === 'C1');
      if (!c1 || !c1.product) throw new Error('C1 lost its heel');
    });
    step('running gallons built', () => {
      if (!document.querySelectorAll('#rgBody .rg-row').length) throw new Error('empty rail');
    });
    step('edit an order line re-plans', () => {
      const q = document.querySelector('.do-prod-qty');
      q.value = 2500; q.dispatchEvent(new Event('input', { bubbles: true }));
    });
    step('sourcing starts as a CTA', () => {
      if (document.getElementById('srcBody').style.display !== 'none') throw new Error('sourcing already open');
    });
    step('create sourcing takes the room', () => {
      document.querySelector('.src-cta').click();
      if (document.getElementById('loBody').dataset.split !== 'src') throw new Error('sourcing did not take focus');
      if (!document.querySelectorAll('#srcBlocks .bb-prod-block').length) throw new Error('no product blocks');
      if (!document.getElementById('srcTotal').textContent.trim()) throw new Error('no total');
    });
    step('three units trade focus', () => {
      document.getElementById('focusDo').click();
      if (document.getElementById('loBody').dataset.split !== 'do') throw new Error('delivery focus failed');
      document.getElementById('focusLo').click();
      if (document.getElementById('loBody').dataset.split !== 'lo') throw new Error('load focus failed');
      document.getElementById('focusSrc').click();
      if (document.getElementById('loBody').dataset.split !== 'src') throw new Error('sourcing focus failed');
    });
    step('whole-load terminal re-prices', () => {
      const before = document.getElementById('srcTotal').textContent;
      document.querySelectorAll('#srcModes .bb-mode')[3].click();
      if (document.getElementById('srcTotal').textContent === before) throw new Error('total did not move');
    });
  }

  if (out.page.startsWith('shift-planner')) {
    step('orders on the timeline', () => {
      if (document.querySelectorAll('.sp2-card').length < 3) throw new Error('too few order cards');
    });
    step('quick filter narrows', () => {
      const all = document.querySelectorAll('.sp2-card').length;
      sp2SetQuick('unplanned');
      const un = document.querySelectorAll('.sp2-card').length;
      sp2SetQuick('planned');
      const pl = document.querySelectorAll('.sp2-card').length;
      sp2SetQuick('all');
      if (un + pl !== all) throw new Error('planned + unplanned does not equal all');
    });
    step('shift range changes the window', () => {
      const am = document.querySelectorAll('.sp2-card').length;
      sp2SetShift('pm');
      const pm = document.querySelectorAll('.sp2-card').length;
      sp2SetShift('custom');
      if (!document.getElementById('sp2Custom').classList.contains('on')) throw new Error('custom range hidden');
      sp2SetShift('am');
      if (am === pm && am !== 0) throw new Error('AM and PM show the same orders');
    });
    step('three views, and the column resizes with them', () => {
      const col = document.querySelector('.sp2-col-orders');
      // measure with the transition off — an animating property reads as the
      // value it is coming FROM, which makes every check a coin flip
      const keep = col.style.transition;
      col.style.transition = 'none';
      const seen = {};
      ['h', 'v', 'n'].forEach(v => {
        sp2SetView(v);
        void col.offsetWidth;
        seen[v] = getComputedStyle(col).flexBasis;
      });
      col.style.transition = keep;
      if (seen.h === seen.v || seen.v === seen.n) {
        throw new Error('column did not resize: ' + JSON.stringify(seen));
      }
      sp2SetView('v');
      if (!document.querySelector('.sp2-vt-rail')) throw new Error('vertical rail missing');
      sp2SetView('n');
      if (document.querySelector('.sp2-ruler')) throw new Error('no-timeline view still draws an axis');
      if (!document.querySelectorAll('.sp2-lrow').length) throw new Error('no list rows');
      sp2SetView('h');
      if (!document.querySelector('.sp2-ruler')) throw new Error('horizontal lost its axis');
    });
    step('timeline scrolls horizontally', () => {
      const w = document.getElementById('sp2TlWrap');
      if (w.scrollWidth <= w.clientWidth) throw new Error('nothing to scroll');
    });
    step('both filters sit behind the icon', () => {
      const hdr = document.querySelector('.sp2-col-orders .sp2-col-hdr');
      if (hdr.querySelector('[data-q]') || hdr.querySelector('[data-s]'))
        throw new Error('a filter is still loose in the header');
      if (!hdr.querySelector('[data-v]')) throw new Error('view switch left the header');
      const pop = document.getElementById('sp2Flt');
      if (pop.classList.contains('on')) throw new Error('filters start open');
      sp2ToggleFlt(document.getElementById('sp2FltBtn'));
      if (!pop.classList.contains('on')) throw new Error('filters did not open');
      if (!pop.querySelector('[data-q]') || !pop.querySelector('[data-s]'))
        throw new Error('status or shift missing from the popover');
      const r = pop.getBoundingClientRect();
      if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < 0)
        throw new Error('popover lands off screen');
      pop.classList.remove('on');
    });
    step('the filter icon says when it is filtering', () => {
      const dot = document.getElementById('sp2FltDot');
      sp2SetQuick('all'); sp2SetShift('am');
      if (getComputedStyle(dot).display !== 'none') throw new Error('dot shows with no filter on');
      sp2SetQuick('unplanned');
      if (getComputedStyle(dot).display === 'none') throw new Error('dot missing while filtering');
      sp2ResetFlt();
      if (getComputedStyle(dot).display !== 'none') throw new Error('reset left the dot on');
    });
    step('V1 — the roster beside one rig', () => {
      sp2SetLayout('v1');
      if (getComputedStyle(document.getElementById('sp2V1')).display === 'none')
        throw new Error('V1 did not come back');
      if (getComputedStyle(document.getElementById('sp2V2')).display !== 'none')
        throw new Error('both layouts on at once');
    });
    step('an order follows to its driver', () => {
      const card = [...document.querySelectorAll('.sp2-card.planned')][0];
      if (!card) throw new Error('no planned order to click');
      card.click();
      if (!document.querySelector('.sp2-card.sel')) throw new Error('selection not shown');
      const row = document.querySelector('.sp2-drow.on .sp2-drow-name');
      if (!row || !row.textContent.trim()) throw new Error('driver not opened in the roster');
    });
    step('ten drivers in each state', () => {
      const keys = Object.keys(SP2_DRIVERS);
      ['driving', 'on-duty', 'off-duty'].forEach(s => {
        const n = keys.filter(k => SP2_DRIVERS[k].state === s).length;
        if (n < 10) throw new Error(s + ' has only ' + n + ' drivers');
      });
      // a planned order carries a driver, an unplanned one does not
      SP2_ORDERS.forEach(o => {
        const planned = !!o.driver;
        if (planned && !SP2_DRIVERS[o.driver]) throw new Error(o.id + ' points at no driver');
      });
      if (!SP2_ORDERS.some(o => !o.driver)) throw new Error('no unplanned orders left');
    });
    step('the roster filters and searches', () => {
      sp2SetDrvFilter('all');
      const all = document.querySelectorAll('.sp2-drow').length;
      sp2SetDrvFilter('off-duty');
      const off = document.querySelectorAll('.sp2-drow').length;
      if (off >= all || off < 10) throw new Error('state filter did nothing: ' + off + '/' + all);
      sp2SetDrvFilter('all');
      const box = document.getElementById('sp2DrvSearch');
      box.value = SP2_DRIVERS.d0.name.split(' ')[0];
      sp2RenderUnit();
      if (document.querySelectorAll('.sp2-drow').length !== 1) throw new Error('search did not narrow to one');
      box.value = ''; sp2RenderUnit();
    });
    step('the rig is drawn, not listed', () => {
      sp2PickDriver('d0');
      if (!document.querySelector('.sp2-cab')) throw new Error('no cab');
      if (!document.querySelector('.sp2-tank')) throw new Error('no tank');
      if (document.querySelectorAll('.sp2-wheel').length < 3) throw new Error('fewer than three wheels');
      const caps = SP2_TRUCKS[SP2_DRIVERS.d0.truck].comps.length;
      if (document.querySelectorAll('.sp2-cmp').length !== caps)
        throw new Error('compartments drawn do not match the truck');
      // wide compartments and narrow ones are drawn to scale
      const cmps = [...document.querySelectorAll('.sp2-cmp')];
      const widest = Math.max(...cmps.map(c => c.getBoundingClientRect().width));
      const narrow = Math.min(...cmps.map(c => c.getBoundingClientRect().width));
      if (widest <= narrow) throw new Error('every compartment drawn the same width');
    });
    step('compartments report fill and state', () => {
      const cmps = [...document.querySelectorAll('.sp2-cmp')];
      if (!cmps.length) throw new Error('no compartments');
      cmps.forEach(c => {
        const s = c.querySelector('.sp2-cmp-s').textContent;
        if (!/^\d+% · (Full|Partially full|Empty)$/.test(s))
          throw new Error('unexpected compartment state: ' + s);
        ['.sp2-cmp-p', '.sp2-cmp-q'].forEach(sel => {
          const el = c.querySelector(sel);
          if (el.scrollWidth > el.clientWidth) throw new Error('compartment label cut off: ' + el.textContent);
        });
        const liq = c.querySelector('.sp2-cmp-liq');
        const pct = parseInt(s, 10);
        if (Math.abs(parseFloat(liq.style.height) - pct) > 1)
          throw new Error('the drawn level does not match the number');
      });
    });
    step('compartment labels survive any product colour', () => {
      // only the C-number sits straight on the liquid, so it has to be near-black;
      // everything else rides a near-opaque plate
      const c = document.querySelector('.sp2-cmp-c');
      const m = getComputedStyle(c).color.match(/\d+/g).map(Number);
      if (Math.max(...m.slice(0, 3)) > 60) throw new Error('C-number is too light to sit on a fill');
      const plate = getComputedStyle(document.querySelector('.sp2-cmp-plate')).backgroundColor;
      const a = plate.match(/rgba?\([^)]*?([\d.]+)\)/);
      if (a && parseFloat(a[1]) < 0.85) throw new Error('plate too sheer to carry text');
    });
    step('a trailer hitches and unhitches', () => {
      sp2PickDriver('d20'); sp2Unload();
      const before = document.querySelectorAll('.sp2-tank').length;
      sp2AddTrailer('TR-410');
      if (document.querySelectorAll('.sp2-tank').length !== before + 1) throw new Error('trailer not drawn');
      if (!document.querySelector('.sp2-hitch')) throw new Error('no hitch between them');
      const caps = SP2_TRUCKS[SP2_DRIVERS.d20.truck].comps.length + SP2_TRAILERS['TR-410'].caps.length;
      if (document.querySelectorAll('.sp2-cmp').length !== caps)
        throw new Error('trailer compartments missing');
      sp2DropTrailer();
      if (SP2_DRIVERS.d20.trailer) throw new Error('trailer would not come off an empty rig');
    });
    step('dragging an order loads the truck', () => {
      sp2SetQuick('all'); sp2PickDriver('d20'); sp2Unload();
      const un = SP2_ORDERS.filter(o => !o.driver)[0];
      if (!un) throw new Error('no unplanned order to drag');
      const card = [...document.querySelectorAll('.sp2-card')]
        .find(c => c.querySelector('.sp2-ord').textContent === un.id);
      if (!card) throw new Error(un.id + ' is not on the timeline');
      const dt = new DataTransfer();
      const fire = (el, type) => { const e = new DragEvent(type, { bubbles:true, cancelable:true, dataTransfer:dt });
        el.dispatchEvent(e); return e; };
      fire(card, 'dragstart');
      if (!document.getElementById('sp2Body').classList.contains('dragging'))
        throw new Error('drag never started');
      const wrap = document.getElementById('sp2Veh');
      if (!fire(wrap, 'dragover').defaultPrevented) throw new Error('the rig refuses the drop');
      fire(wrap, 'drop');
      if (un.driver !== 'd20') throw new Error('drop did not plan the order onto the driver');
      const load = SP2_DRIVERS.d20.load.filter(l => l.q > 0);
      if (!load.length) throw new Error('nothing went into the compartments');
      if (load.some(l => !l.p)) throw new Error('a compartment holds gallons but no product');
      if (document.getElementById('sp2Body').classList.contains('dragging'))
        throw new Error('drag state left hanging');
      sp2Unload(); un.driver = '';
    });
    step('one product per compartment, blends aside', () => {
      sp2PickDriver('d20'); sp2Unload();
      const o = SP2_ORDERS.filter(x => !x.driver)[0];
      const keep = JSON.parse(JSON.stringify(o.prods));
      o.prods = [{ p:'UNL87', q:600 }, { p:'CLR DSL', q:600 }];
      sp2Drag = o.id;
      sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => o.id } }, 'auto', -1);
      const used = SP2_DRIVERS.d20.load.filter(l => l.q > 0).map(l => l.p);
      if (new Set(used).size !== used.length) throw new Error('two products share a compartment');
      o.prods = keep; o.driver = ''; sp2Unload();
    });
    step('every driver maps to a truck', () => {
      Object.keys(SP2_DRIVERS).forEach(k => {
        sp2PickDriver(k);
        if (!document.querySelector('.sp2-truck-id')) throw new Error(k + ' has no truck');
        if (!document.querySelector('.sp2-tank')) throw new Error(k + ' has no tank drawn');
      });
      sp2PickDriver('d0');
    });
    step('V1 reads cleanly before we leave it', () => { contrastSweep(); });

    // ── V2 ──────────────────────────────────────────────────
    step('V2 — a lane per driver', () => {
      sp2SetLayout('v2');
      if (getComputedStyle(document.getElementById('sp2V2')).display === 'none')
        throw new Error('V2 did not show');
      if (getComputedStyle(document.getElementById('sp2V1')).display !== 'none')
        throw new Error('V1 still showing under V2');
      const lanes = document.querySelectorAll('.sp2-ln');
      if (lanes.length !== sp2DriverKeys().length)
        throw new Error('lanes do not match the drivers on screen');
      if (!document.querySelector('.sp2-ln-hdr')) throw new Error('no lane header');
    });
    step('only the first lane is drawn', () => {
      if (document.querySelectorAll('.sp2-r2').length !== 1)
        throw new Error('expected exactly one drawn rig, got ' + document.querySelectorAll('.sp2-r2').length);
      const first = document.querySelectorAll('.sp2-ln')[0];
      if (!first.querySelector('.sp2-r2')) throw new Error('the drawing is not on the first lane');
      if (first.querySelector('.sp2-boxes')) throw new Error('the first lane has boxes too');
      const second = document.querySelectorAll('.sp2-ln')[1];
      if (!second.querySelector('.sp2-boxes')) throw new Error('the other lanes lost their boxes');
    });
    step('the drawing is a truck, and it matches the numbers', () => {
      const art = document.querySelector('.sp2-r2');
      if (!art.querySelector('.sp2-r2-cab')) throw new Error('no cab');
      if (!art.querySelector('.sp2-r2-tank')) throw new Error('no tank');
      if (art.querySelectorAll('.sp2-r2-wheel').length < 3) throw new Error('fewer than three wheels');
      // the cab has to sit on the same ground as the tank
      const cab = art.querySelector('.sp2-r2-cab').getBoundingClientRect();
      const tank = art.querySelector('.sp2-r2-tank').getBoundingClientRect();
      if (Math.abs(cab.bottom - tank.bottom) > 2)
        throw new Error('the cab floats off the chassis by ' + Math.round(cab.bottom - tank.bottom) + 'px');
      const cmps = [...art.querySelectorAll('.sp2-r2-cmp')];
      const lbls = [...art.querySelectorAll('.sp2-r2-lbl')];
      if (cmps.length !== lbls.length) throw new Error('a compartment has no label under it');
      cmps.forEach((c, i) => {
        const pct = parseInt(lbls[i].querySelector('.sp2-r2-ls').textContent, 10);
        const h = parseFloat(c.querySelector('.sp2-r2-liq').style.height);
        if (Math.abs(h - pct) > 1) throw new Error('C' + (i + 1) + ' drawn at ' + h + '% but labelled ' + pct + '%');
        // the label sits under its own compartment
        if (Math.abs(c.getBoundingClientRect().left - lbls[i].getBoundingClientRect().left) > 3)
          throw new Error('C' + (i + 1) + ' label is not under its compartment');
      });
      ['.sp2-r2-lp', '.sp2-r2-lq'].forEach(sel => {
        art.querySelectorAll(sel).forEach(el => {
          if (el.scrollWidth > el.clientWidth) throw new Error('label cut off: ' + el.textContent);
        });
      });
    });
    step('a lane takes the drop, whoever is selected', () => {
      sp2SetDrvFilter('all');
      const lanes = [...document.querySelectorAll('.sp2-ln')];
      const target = lanes.find(l => l.dataset.k !== sp2Driver);
      const k = target.dataset.k;
      sp2Unload(k);
      const un = SP2_ORDERS.filter(o => !o.driver)[0];
      if (!un) throw new Error('no unplanned order to drag');
      const card = [...document.querySelectorAll('.sp2-card')]
        .find(c => c.querySelector('.sp2-ord').textContent === un.id);
      if (!card) throw new Error(un.id + ' is not on the timeline');
      const dt = new DataTransfer();
      const fire = (el, type) => { const e = new DragEvent(type, { bubbles:true, cancelable:true, dataTransfer:dt });
        el.dispatchEvent(e); return e; };
      fire(card, 'dragstart');
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === k);
      if (!fire(lane, 'dragover').defaultPrevented) throw new Error('the lane refuses the drop');
      fire(lane, 'drop');
      if (un.driver !== k) throw new Error('order went to ' + un.driver + ', not the lane it was dropped on');
      if (!SP2_DRIVERS[k].load.some(l => l.q > 0)) throw new Error('nothing went into that truck');
      sp2Unload(k); un.driver = ''; sp2RenderUnit();
    });
    step('a lane hitches its own trailer', () => {
      const k = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k).find(x => !SP2_DRIVERS[x].trailer);
      sp2AddTrailer('TR-200', k);
      if (SP2_DRIVERS[k].trailer !== 'TR-200') throw new Error('trailer not hitched to that lane');
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === k);
      if (lane.querySelector('.sp2-ln-truck-id').textContent.indexOf('TR-200') < 0)
        throw new Error('the lane does not name its trailer');
      sp2DropTrailer(k);
      if (SP2_DRIVERS[k].trailer) throw new Error('trailer would not come off');
    });
    step('every lane states its load', () => {
      document.querySelectorAll('.sp2-ln').forEach(l => {
        if (!l.querySelector('.sp2-ln-truck-id').textContent.trim()) throw new Error('a lane has no truck');
        if (!l.querySelector('.sp2-ln-cap')) throw new Error('a lane does not say how full it is');
        if (!l.querySelector('.sp2-ln-stops')) throw new Error('a lane has no stops row');
      });
    });
  }

  // Text that cannot be read on its own fill. Composite every alpha layer down
  // to an opaque colour first — ignoring alpha reports nearly everything as a
  // failure and buries the handful that are real.
  function contrastSweep() {
    const px = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      return m ? { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const over = (f, b) => ({ r: f.r*f.a + b.r*(1-f.a), g: f.g*f.a + b.g*(1-f.a), b: f.b*f.a + b.b*(1-f.a), a: 1 });
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
    const effBg = e => { let acc = { r:255, g:255, b:255, a:1 }, chain = [], n = e;
      while (n && n !== document.documentElement) { const c = px(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0) chain.push(c); n = n.parentElement; }
      for (let i = chain.length - 1; i >= 0; i--) acc = over(chain[i], acc);
      return acc; };
    const root = document.querySelector('.screen.on') || document;
    root.querySelectorAll('*').forEach(e => {
      if (!e.textContent.trim() || e.children.length) return;
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 6) return;
      const fg = px(getComputedStyle(e).color); if (!fg) return;
      const bg = effBg(e), fc = lum(over(fg, bg)), bc = lum(bg);
      const ratio = (Math.max(fc, bc) + 0.05) / (Math.min(fc, bc) + 0.05);
      if (ratio < 3) out.layout.push('low contrast: "' + e.textContent.trim().slice(0, 26) + '" ' + ratio.toFixed(2) + ':1');
    });
  }
  contrastSweep();

  // anything visually cut off, anywhere on the page
  document.querySelectorAll('td,th,select,option,button,.comp-prod,.const-name,.bb-mode-name').forEach(e => {
    if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0) {
      out.layout.push('clipped: "' + (e.value || e.textContent || '').trim().slice(0, 24) + '" ' + e.clientWidth + '<' + e.scrollWidth);
    }
  });
  // icons that forgot their size
  document.querySelectorAll('svg').forEach(s => {
    const r = s.getBoundingClientRect();
    if (r.width > 40 || r.height > 40) out.layout.push('oversized svg: ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  if (document.documentElement.scrollWidth > innerWidth + 2) out.layout.push('page scrolls horizontally');

  return JSON.stringify(out, null, 1);
})();
