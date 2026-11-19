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
    // In the combined file every colliding global is renamed per screen, so bind
    // the sourcing ones by whichever name actually exists.
    const S = (() => {
      const pick = n => typeof window['create_' + n] !== 'undefined' ? window['create_' + n] : window[n];
      return { RACK: pick('RACK'), cheapest: pick('cheapestTerminal'),
               preferred: pick('preferredTerminal'), why: pick('preferredWhy'),
               landed: pick('landed'), freight: pick('freightFor'),
               unexplained: pick('unexplained'), applyMode: pick('applyMode'),
               pickTerminal: pick('pickTerminal'), REASONS: pick('SRC_REASONS') };
    })();

    step('freight is in the price, so the cheapest rack can lose', () => {
      const flipped = Object.keys(S.RACK).filter(p => {
        const r = S.RACK[p];
        const byRack = Object.keys(r).sort((a, b) => r[a] - r[b])[0];
        return byRack !== S.cheapest(p);
      });
      if (!flipped.length)
        throw new Error('no product where freight changes the winner — the model does nothing');
      Object.keys(TERMINALS).forEach(t => {
        if (!(S.freight(t) > 0)) throw new Error(t + ' has no freight');
      });
    });
    step('preferred is not the same as cheapest', () => {
      const diff = Object.keys(S.RACK).filter(p => S.preferred(p) !== S.cheapest(p));
      if (!diff.length)
        throw new Error('preferred always equals cheapest — nothing was actually fixed');
      diff.forEach(p => {
        const why = S.why(p);
        if (why === 'cheapest landed')
          throw new Error(p + ' differs from cheapest but claims it is the cheapest');
        if (!/contract/.test(why)) throw new Error(p + ': unexplained preference "' + why + '"');
      });
      // the whole point: a preferred source is allowed to cost more
      const dearer = diff.filter(p => S.landed(p, S.preferred(p)) > S.landed(p, S.cheapest(p)));
      if (!dearer.length) throw new Error('no case where the preferred source costs more');
    });
    step('leaving the preferred source demands a reason', () => {
      S.applyMode('best');
      if (S.unexplained().length) throw new Error('the default sourcing already owes a reason');
      if (document.querySelector('.bb-reason')) throw new Error('a reason is asked for on the preferred source');
      const line = s4.lines.find(l => Object.keys(TERMINALS).some(t => t !== S.preferred(l.name)));
      if (!line) throw new Error('nothing to move');
      const away = Object.keys(TERMINALS).find(t => t !== S.preferred(line.name));
      S.pickTerminal(line.name, away);
      if (!S.unexplained().length) throw new Error('deviation went unrecorded');
      const box = document.querySelector('.bb-reason.needed .bb-reason-sel');
      if (!box) throw new Error('no reason prompt appeared');
      // and it blocks the create until answered
      const before = getComputedStyle(document.getElementById('scrim4')).display;
      createOrderAndLoad();
      if (getComputedStyle(document.getElementById('scrim4')).display !== before)
        throw new Error('the order was created with an unexplained override');
      box.value = S.REASONS[0];
      fire(box, 'change');
      if (S.unexplained().length) throw new Error('the reason did not stick');
      if (document.querySelector('.bb-reason.needed')) throw new Error('still flagged after a reason');
      // going back to preferred drops the reason again
      S.pickTerminal(line.name, S.preferred(line.name));
      if (document.querySelector('.bb-reason')) throw new Error('reason still asked on the preferred source');
      S.applyMode('best');
    });
    step('the wording is about preferred, not cheapest', () => {
      S.applyMode('best');
      const sheet = document.getElementById('s4Blocks').closest('.modal, .wiz, section, body') || document;
      const txt = sheet.textContent;
      if (/cheapest source|cheapest sourcing|Cheapest per product/.test(txt))
        throw new Error('the old cheapest wording is still on screen');
      if (!/preferred/i.test(txt)) throw new Error('nothing says preferred');
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
    step('two views, and the column resizes with them', () => {
      const col = document.querySelector('.sp2-col-orders');
      // measure with the transition off — an animating property reads as the
      // value it is coming FROM, which makes every check a coin flip
      const keep = col.style.transition;
      col.style.transition = 'none';
      const seen = {};
      ['h', 'v'].forEach(v => {
        sp2SetView(v);
        void col.offsetWidth;
        seen[v] = getComputedStyle(col).flexBasis;
      });
      col.style.transition = keep;
      if (seen.h === seen.v) throw new Error('column did not resize: ' + JSON.stringify(seen));
      if (document.querySelectorAll('[data-v]').length !== 2)
        throw new Error('the view switch is not down to two');
      sp2SetView('v');
      if (!document.querySelector('.sp2-vt-rail')) throw new Error('vertical rail missing');
      if (document.querySelector('.sp2-ruler')) throw new Error('vertical view still draws the top axis');
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
    step('available crosses the duty states', () => {
      sp2SetDrvFilter('all');
      const all = Object.keys(SP2_DRIVERS);
      const avail = all.filter(k => sp2Avail(SP2_DRIVERS[k]));
      if (!avail.length) throw new Error('nobody is available');
      if (avail.length === all.length) throw new Error('everybody is available — the filter says nothing');
      if (avail.some(k => SP2_DRIVERS[k].state === 'off-duty'))
        throw new Error('an off-duty driver counts as available');
      // a rig with no room is not available, whatever the duty state
      const k = avail[0], d = SP2_DRIVERS[k];
      const caps = SP2_TRUCKS[d.truck].comps.map(c => c.cap);
      const keep = JSON.parse(JSON.stringify(d.load)), hadTrl = d.trailer;
      d.trailer = null; d.tload = [];
      d.load = caps.map(c => ({ p:'UNL87', q:c }));
      if (sp2Avail(d)) throw new Error('a full truck still counts as available');
      d.load = keep; if (hadTrl) sp2AddTrailer(hadTrl, k);
      sp2SetDrvFilter('available');
      if (document.getElementById('sp2dAv').textContent !== String(avail.length))
        throw new Error('the Available count does not match');
      // the hidden layout keeps its last render, so count only the one on screen
      const rows = sp2Layout === 'v2' ? '.sp2-ln' : '.sp2-drow';
      if (document.querySelectorAll(rows).length !== avail.length)
        throw new Error('the Available tab shows ' + document.querySelectorAll(rows).length +
                        ' drivers, not ' + avail.length);
      sp2SetDrvFilter('all');
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
    step('the selected lane is drawn, the rest are bars', () => {
      const lanes = [...document.querySelectorAll('.sp2-ln')];
      const svgs = document.querySelectorAll('.sp2-sv');
      if (svgs.length !== 1)
        throw new Error('expected one tanker on screen, got ' + svgs.length);
      const sel = lanes.find(l => l.classList.contains('on'));
      if (!sel) throw new Error('no lane is selected');
      if (!sel.querySelector('.sp2-sv')) throw new Error('the tanker is not on the selected lane');
      if (sel.querySelector('.sp2-bars')) throw new Error('the selected lane also has bars');
      lanes.filter(l => l !== sel).forEach(l => {
        if (!l.querySelector('.sp2-bars')) throw new Error(l.dataset.k + ' has no bars');
        if (l.querySelector('.sp2-sv')) throw new Error(l.dataset.k + ' is drawn but not selected');
      });
    });
    step('the tanker is a tanker', () => {
      const svg = document.querySelector('.sp2-sv');
      // tank, fuel, domes, wheels, chassis and a tractor — the parts that make
      // it read as a truck rather than a bar chart
      if (svg.querySelectorAll('circle').length < 6) throw new Error('fewer than three wheels (two circles each)');
      if (!svg.querySelector('clipPath')) throw new Error('the tank does not clip its fuel');
      if (!svg.querySelector('linearGradient')) throw new Error('the shell has no metal on it');
      if (!svg.querySelector('.sp2-sv-tag')) throw new Error('the tank is not named');
      const k = document.querySelector('.sp2-ln.on').dataset.k;
      const n = SP2_TRUCKS[SP2_DRIVERS[k].truck].comps.length +
                (SP2_DRIVERS[k].trailer ? SP2_TRAILERS[SP2_DRIVERS[k].trailer].caps.length : 0);
      if (svg.querySelectorAll('.sp2-sv-strip').length !== n)
        throw new Error('compartments drawn do not match the rig');
      // a wave, not a flat lid: the surface path has to curve
      const liq = [...svg.querySelectorAll('.sp2-sv-liq')];
      if (liq.length && !/q/.test(liq[0].getAttribute('d')))
        throw new Error('the fuel surface is flat');
    });
    step('the fuel stands at the level it says', () => {
      const svg = document.querySelector('.sp2-sv');
      const k = document.querySelector('.sp2-ln.on').dataset.k, d = SP2_DRIVERS[k];
      let caps = SP2_TRUCKS[d.truck].comps.map(c => c.cap), load = d.load.slice();
      if (d.trailer) { caps = caps.concat(SP2_TRAILERS[d.trailer].caps); load = load.concat(d.tload); }
      const liq = [...svg.querySelectorAll('.sp2-sv-liq')];
      const filled = caps.filter((c, i) => (load[i].q || 0) > 0).length;
      if (liq.length !== filled) throw new Error('fuel drawn in ' + liq.length + ' of ' + filled + ' loaded compartments');
      // read the surface back off the path and check it against the gallons
      let seen = 0;
      caps.forEach((cap, i) => {
        if (!(load[i].q > 0)) return;
        const pct = Math.min(100, Math.round(load[i].q / cap * 100));
        const want = TK.y + TK.h * (1 - pct / 100);
        const got = parseFloat(liq[seen++].dataset.top);
        if (Math.abs(got - want) > 0.6)
          throw new Error('C' + (i + 1) + ' stands at ' + got + ' but ' + pct + '% is ' + want.toFixed(1));
      });
      // and every compartment still states its own facts
      if (svg.querySelectorAll('.sp2-sv-p').length !== caps.length)
        throw new Error('a compartment has no product label');
      if (svg.querySelectorAll('.sp2-sv-q').length !== caps.length)
        throw new Error('a compartment has no quantity label');
    });
    step('the drawing survives a trailer', () => {
      const k = document.querySelector('.sp2-ln.on').dataset.k;
      const had = SP2_DRIVERS[k].trailer;
      const before = document.querySelector('.sp2-sv').querySelectorAll('.sp2-sv-strip').length;
      sp2AddTrailer('TR-660', k);
      const svg = document.querySelector('.sp2-sv');
      if (!svg) throw new Error('the tanker vanished when a trailer was hitched');
      if (svg.querySelectorAll('.sp2-sv-strip').length !== before + SP2_TRAILERS['TR-660'].caps.length)
        throw new Error('the trailer compartments were not drawn');
      if (svg.querySelectorAll('clipPath').length < 2) throw new Error('the two tanks share one clip');
      if (!had) sp2DropTrailer(k); else sp2AddTrailer(had, k);
    });
    step('bars show the level without the truck', () => {
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => !l.classList.contains('on'));
      const k = lane.dataset.k, d = SP2_DRIVERS[k];
      let caps = SP2_TRUCKS[d.truck].comps.map(c => c.cap), load = d.load.slice();
      if (d.trailer) { caps = caps.concat(SP2_TRAILERS[d.trailer].caps); load = load.concat(d.tload); }
      const bars = [...lane.querySelectorAll('.sp2-bar2')];
      if (bars.length !== caps.length) throw new Error(k + ': bars do not match the rig');
      bars.forEach((b, i) => {
        const want = Math.min(100, Math.round((load[i].q || 0) / caps[i] * 100));
        const got = parseFloat(b.querySelector('.sp2-bar2-fill').style.height);
        if (Math.abs(got - want) > 1) throw new Error(k + ' C' + (i + 1) + ': bar at ' + got + '%, holds ' + want + '%');
      });
    });
    step('compact fits more drivers, and keeps the one you are on', () => {
      const h = () => [...document.querySelectorAll('.sp2-ln')].map(l => l.getBoundingClientRect().height);
      sp2SetDense('full');
      const full = h();
      sp2SetDense('compact');
      const comp = h();
      const sel = [...document.querySelectorAll('.sp2-ln')].findIndex(l => l.classList.contains('on'));
      if (sel < 0) throw new Error('no lane is chosen');
      if (comp[sel] !== full[sel]) throw new Error('the chosen lane shrank in compact');
      const other = sel === 0 ? 1 : 0;
      if (comp[other] >= full[other] - 40)
        throw new Error('compact saved only ' + Math.round(full[other] - comp[other]) + 'px');
      // the chosen lane keeps its tanker; the rest keep bars and lose the writing
      if (!document.querySelector('.sp2-ln.on .sp2-sv')) throw new Error('compact took the tanker away');
      [...document.querySelectorAll('.sp2-ln')].forEach((l, i) => {
        if (i === sel) return;
        if (!l.querySelector('.sp2-bars')) throw new Error('compact dropped the bars');
        if (!l.querySelector('.sp2-bar2-fill')) throw new Error('compact dropped the fuel');
        if (getComputedStyle(l.querySelector('.sp2-bar2-p')).display !== 'none')
          throw new Error('compact still writes the product on every bar');
      });
    });
    step('the density switch is V2 only', () => {
      sp2SetLayout('v1');
      if (getComputedStyle(document.getElementById('sp2DenseSeg')).display !== 'none')
        throw new Error('density switch shows on V1, where it means nothing');
      sp2SetLayout('v2');
      if (getComputedStyle(document.getElementById('sp2DenseSeg')).display === 'none')
        throw new Error('density switch did not come back');
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
  // icons that forgot their size — an illustration is sized on purpose, so it
  // declares itself with a class rather than being caught by this
  document.querySelectorAll('svg:not(.sp2-sv)').forEach(s => {
    const r = s.getBoundingClientRect();
    if (r.width > 40 || r.height > 40) out.layout.push('oversized svg: ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  if (document.documentElement.scrollWidth > innerWidth + 2) out.layout.push('page scrolls horizontally');

  return JSON.stringify(out, null, 1);
})();
