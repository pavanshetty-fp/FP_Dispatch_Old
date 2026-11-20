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
      // runs before anything touches the view, so this is the state it opened in
      if (sp2View !== 'v') throw new Error('the first column opened on "' + sp2View + '", not the vertical timeline');
      if (!document.querySelector('.sp2-vt-rail')) throw new Error('no vertical rail on load');
      if (document.querySelector('.sp2-ruler')) throw new Error('the top axis is drawn on load');
    });
    step('quick filter narrows', () => {
      sp2SetQuick('all');
      const all = document.querySelectorAll('.sp2-card').length;
      sp2SetQuick('unplanned');
      const un = document.querySelectorAll('.sp2-card').length;
      sp2SetQuick('planned');
      const pl = document.querySelectorAll('.sp2-card').length;
      sp2SetQuick('all');
      if (un + pl !== all) throw new Error('planned + unplanned does not equal all');
    });
    step('the shift filter narrows drivers, not orders', () => {
      if (document.getElementById('sp2Custom')) throw new Error('the custom range is still here');
      if (document.querySelectorAll('[data-s]').length !== 3) throw new Error('expected All, AM and PM');
      sp2SetShift('all');
      const orders = document.querySelectorAll('.sp2-card').length;
      const all = document.querySelectorAll('.sp2-ln').length;
      sp2SetShift('am');
      const am = document.querySelectorAll('.sp2-ln').length;
      if (document.querySelectorAll('.sp2-card').length !== orders)
        throw new Error('the shift filter still cuts the orders column');
      if (am >= all || !am) throw new Error('AM did not narrow the drivers: ' + am + ' of ' + all);
      [...document.querySelectorAll('.sp2-ln')].forEach(l => {
        if (SP2_SHIFTS[SP2_DRIVERS[l.dataset.k].shift].name !== 'Early')
          throw new Error('a late-shift driver is showing under AM');
      });
      sp2SetShift('pm');
      const pm = document.querySelectorAll('.sp2-ln').length;
      if (am + pm !== all) throw new Error('AM + PM should be every driver: ' + am + ' + ' + pm + ' vs ' + all);
      sp2SetShift('all');
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
      sp2SetView('v');
    });
    step('the horizontal timeline scrolls', () => {
      // only that view draws a scale wide enough to run off the column
      sp2SetView('h');
      const w = document.getElementById('sp2TlWrap');
      if (w.scrollWidth <= w.clientWidth) throw new Error('nothing to scroll');
      sp2SetView('v');
      if (w.scrollWidth > w.clientWidth + 2) throw new Error('the vertical view scrolls sideways too');
    });
    step('an order follows to its driver', () => {
      const card = [...document.querySelectorAll('.sp2-card.planned')][0];
      if (!card) throw new Error('no planned order to click');
      card.click();
      if (!document.querySelector('.sp2-card.sel')) throw new Error('selection not shown');
      const lane = document.querySelector('.sp2-ln.on .sp2-ln-name');
      if (!lane || !lane.textContent.trim()) throw new Error('the order did not select its driver');
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
      if (document.querySelectorAll('.sp2-ln').length !== avail.length)
        throw new Error('the Available tab shows ' + document.querySelectorAll('.sp2-ln').length +
                        ' drivers, not ' + avail.length);
      sp2SetDrvFilter('all');
    });
    step('the roster filters and searches', () => {
      sp2SetDrvFilter('all');
      const all = document.querySelectorAll('.sp2-ln').length;
      sp2SetDrvFilter('off-duty');
      const off = document.querySelectorAll('.sp2-ln').length;
      if (off >= all || off < 10) throw new Error('state filter did nothing: ' + off + '/' + all);
      sp2SetDrvFilter('all');
      const box = document.getElementById('sp2DrvSearch');
      box.value = SP2_DRIVERS.d0.name.split(' ')[0];
      sp2RenderUnit();
      if (document.querySelectorAll('.sp2-ln').length !== 1) throw new Error('search did not narrow to one');
      box.value = ''; sp2RenderUnit();
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
      const wrap = document.querySelector('.sp2-ln.on .sp2-rig') || document.querySelector('.sp2-rig');
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
        const lane = document.querySelector('.sp2-ln.on');
        if (!lane || !lane.querySelector('.sp2-ln-truck-id').textContent.trim())
          throw new Error(k + ' has no truck');
        if (!lane.querySelector('.sp2-sv')) throw new Error(k + ' has no rig drawn');
      });
      sp2PickDriver('d0');
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
      // four bogie wheels, three concentric circles each, as the design draws them
      if (svg.querySelectorAll('circle').length < 12) throw new Error('fewer than four wheels');
      if (!svg.querySelector('clipPath')) throw new Error('the tank does not clip its fuel');
      // the tractor is the design's own artwork, not something redrawn by hand
      const art = [...svg.querySelectorAll('image')];
      if (art.length < 8) throw new Error('only ' + art.length + ' pieces of the design artwork are used');
      if (art.some(i => !/^data:image\/svg\+xml;base64,/.test(i.getAttribute('href'))))
        throw new Error('an asset is not inlined — it would break the single file');
      if (!svg.querySelector('.sp2-sv-tag')) throw new Error('the tank is not named');
      // centred in the lane: equal air either side, or flush when it runs long
      const box = svg.closest('.sp2-rig');
      const left = svg.getBoundingClientRect().left - box.getBoundingClientRect().left;
      const slack = box.clientWidth - svg.getBoundingClientRect().width;
      if (slack > 2 && Math.abs(left - slack / 2) > 2)
        throw new Error('the rig sits ' + Math.round(left) + 'px in, not centred in ' + Math.round(slack) + 'px of slack');
      const k = document.querySelector('.sp2-ln.on').dataset.k;
      const n = SP2_TRUCKS[SP2_DRIVERS[k].truck].comps.length +
                (SP2_DRIVERS[k].trailer ? SP2_TRAILERS[SP2_DRIVERS[k].trailer].caps.length : 0);
      if (svg.querySelectorAll('.sp2-sv-p').length !== n)
        throw new Error('compartments drawn do not match the rig');
      // a wave, not a flat lid — the design's surface is a cubic
      const liq = [...svg.querySelectorAll('.sp2-sv-liq')];
      if (liq.length && !/[CcQq]/.test(liq[0].getAttribute('d')))
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
      const before = document.querySelector('.sp2-sv').querySelectorAll('.sp2-sv-p').length;
      sp2AddTrailer('TR-660', k);
      const svg = document.querySelector('.sp2-sv');
      if (!svg) throw new Error('the tanker vanished when a trailer was hitched');
      if (svg.querySelectorAll('.sp2-sv-p').length !== before + SP2_TRAILERS['TR-660'].caps.length)
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
    step('the filters sit in the headers, not behind an icon', () => {
      if (document.getElementById('sp2Flt')) throw new Error('the filter popover is still here');
      const c1 = document.querySelector('.sp2-col-orders .sp2-col-hdr');
      if (!c1.querySelector('[data-q]')) throw new Error('planned/unplanned is not in the orders header');
      if (!c1.querySelector('[data-v]')) throw new Error('the view switch left the orders header');
      if (c1.querySelector('[data-s]')) throw new Error('the shift filter is still on the orders column');
      const c2 = document.querySelector('.sp2-col-unit .sp2-col-hdr');
      if (!c2.querySelector('[data-s]')) throw new Error('the shift filter did not move to driver & truck');
      if (!c2.querySelector('[data-d]')) throw new Error('the driver tabs left their header');
      // search first on the left, every filter to its right
      const search = c2.querySelector('#sp2DrvSearch').getBoundingClientRect();
      const tools = c2.querySelector('.sp2-hdr-tools').getBoundingClientRect();
      if (search.left >= tools.left) throw new Error('search is not ahead of the filters');
      if (document.getElementById('sp2LayoutSeg')) throw new Error('the V1/V2 switch is still here');
      if (typeof sp2Layout !== 'undefined') throw new Error('V1 left its state behind');
    });
    step('the rig faces left and leaves air either side', () => {
      sp2PickDriver('d0');
      const box = document.querySelector('.sp2-rig'), svg = box.querySelector('.sp2-sv');
      const slack = box.clientWidth - svg.getBoundingClientRect().width;
      if (Math.abs(slack - 2 * TK_SIDE_PAD) > 6)
        throw new Error('leaves ' + Math.round(slack / 2) + 'px a side, not ' + TK_SIDE_PAD);
      // the tractor is flipped about its own middle, and drawn first
      const flipped = [...svg.querySelectorAll('g')].some(g => /scale\(-1,1\)/.test(g.getAttribute('transform') || ''));
      if (!flipped) throw new Error('the tractor is not mirrored');
      const cab = svg.querySelector('image[href^="data:"]').getBoundingClientRect();
      const tank = svg.querySelector('.sp2-sv-liq, .sp2-sv-p').getBoundingClientRect();
      if (cab.left > tank.left) throw new Error('the cab is still behind the tank');
    });
    step('an unselected lane is one box, divided', () => {
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => !l.classList.contains('on'));
      const boxes = lane.querySelectorAll('.sp2-barbox');
      if (!boxes.length) throw new Error('no box');
      const k = lane.dataset.k, d = SP2_DRIVERS[k];
      if (boxes.length !== (d.trailer ? 2 : 1)) throw new Error('one box per vehicle, got ' + boxes.length);
      const cells = [...boxes[0].querySelectorAll('.sp2-bar2')];
      if (cells.length < 2) throw new Error('the box is not divided');
      // divided, not a row of separate tiles: no gaps between the compartments
      const gap = cells[1].getBoundingClientRect().left - cells[0].getBoundingClientRect().right;
      if (gap > 2) throw new Error('the compartments are still separate boxes (' + Math.round(gap) + 'px apart)');
    });
    step('the chosen lane lifts instead of tinting', () => {
      const on = document.querySelector('.sp2-ln.on');
      const cs = getComputedStyle(on);
      if (cs.boxShadow === 'none') throw new Error('no shadow on the chosen lane');
      const bg = cs.backgroundColor.match(/\d+/g).map(Number);
      if (Math.min(bg[0], bg[1], bg[2]) < 250) throw new Error('the chosen lane is still tinted: ' + cs.backgroundColor);
    });
    step('the shift says where the driver has got to', () => {
      sp2PickDriver('d0');
      const strip = document.querySelector('.sp2-ln.on .sp2-shift');
      if (!strip) throw new Error('no shift standing on the chosen lane');
      const st = sp2ShiftState(SP2_DRIVERS.d0);
      if (!/left|starts in|ended/.test(strip.textContent)) throw new Error('it does not say how long is left');
      if (!strip.querySelector('.sp2-shift-bar')) throw new Error('no progress through the shift');
      // the three standings all have to be reachable
      const kinds = new Set(Object.keys(SP2_DRIVERS).map(k => sp2ShiftState(SP2_DRIVERS[k]).kind));
      if (kinds.size < 2)
        throw new Error('every driver reads the same at ' + sp2Hhmm(SP2_NOW) + ': ' + [...kinds]);
      if (st.kind === 'running' && !strip.querySelector('.sp2-shift-now'))
        throw new Error('mid-shift but no now marker');
    });
    step('the truck and the driver can both be changed', () => {
      sp2PickDriver('d0');
      const lane = document.querySelector('.sp2-ln.on');
      const tbtn = lane.querySelector('.sp2-ln-truck-id');
      if (tbtn.tagName !== 'BUTTON') throw new Error('the truck is not changeable');
      const was = SP2_DRIVERS.d0.truck, other = SP2_DRIVERS.d1.truck, otherDrv = SP2_DRIVERS.d1.name;
      sp2PickTruck('d0', other);
      if (SP2_DRIVERS.d0.truck !== other) throw new Error('the truck did not change');
      if (SP2_DRIVERS.d1.truck !== was) throw new Error('the other driver did not take the old one');
      sp2PickTruck('d0', was);
      // handing it over takes the orders with it
      const mine = SP2_ORDERS.filter(o => o.driver === 'd0').length;
      sp2PickDriverFor('d0', 'd2');
      if (SP2_ORDERS.filter(o => o.driver === 'd2').length !== mine)
        throw new Error('the orders did not go with the driver');
      sp2PickDriverFor('d2', 'd0');
      if (SP2_DRIVERS.d0.truck !== was) throw new Error('handing back did not restore the rig');
    });
    step('an assigned order leaves the orders column', () => {
      sp2SetQuick('unplanned');
      const un = SP2_ORDERS.filter(o => !o.driver)[0];
      const onList = () => [...document.querySelectorAll('.sp2-card .sp2-ord')].some(e => e.textContent === un.id);
      if (!onList()) throw new Error(un.id + ' is not in the column to begin with');
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => !l.classList.contains('on'));
      const k = lane.dataset.k;
      sp2Drag = un.id;
      sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => un.id } }, 'auto', -1, k);
      if (un.driver !== k) throw new Error('the drop did not take');
      if (onList()) throw new Error(un.id + ' is still in the orders column after being planned');
      // and it can be taken back off, which puts it back
      sp2UnplanOrder({ stopPropagation(){} }, k, un.id);
      if (un.driver) throw new Error('taking it off left it assigned');
      if (!onList()) throw new Error('it did not come back to the orders column');
      if (SP2_DRIVERS[k].load.some(l => l.p === un.prods[0].p && l.q >= un.prods[0].q) &&
          !SP2_ORDERS.some(o => o.driver === k && o.prods.some(pr => pr.p === un.prods[0].p)))
        throw new Error('its gallons are still on the truck');
    });
    step('an order planned on someone else cannot be taken', () => {
      const taken = SP2_ORDERS.filter(o => o.driver)[0];
      const owner = taken.driver;
      const other = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k).find(x => x !== owner);
      sp2Drag = taken.id;
      sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => taken.id } }, 'auto', -1, other);
      if (taken.driver !== owner) throw new Error('it moved to another driver behind their back');
      if (!/planned on/.test(document.getElementById('sp2Toast').textContent))
        throw new Error('nothing said why it was refused');
    });
    step('too many gallons is flagged, with ways out', () => {
      // load a rig past its capacity and see what the lane says
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => !l.classList.contains('on'));
      const k = lane.dataset.k;
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      sp2Unload(k);
      const cap = sp2RigCap(k);
      let piled = 0;
      SP2_ORDERS.filter(o => !o.driver).forEach(o => {
        if (piled > cap) return;
        o.driver = k; piled += sp2Gal(o);
      });
      sp2RenderUnit();
      const over = sp2Overload(k);
      if (!over) throw new Error('piled ' + piled + ' gal onto ' + cap + ' and it did not notice');
      const card = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === k);
      const warn = card.querySelector('.sp2-over-warn');
      if (!warn) throw new Error('no warning on the lane');
      if (!/over by/.test(warn.textContent)) throw new Error('it does not say by how much');
      const fixes = warn.querySelectorAll('.sp2-fix');
      if (fixes.length < 2) throw new Error('only ' + fixes.length + ' way out offered');
      // and the first one actually clears it
      const before = sp2Overload(k).over;
      sp2TrimOrder({ stopPropagation(){} }, k, over.trim.id, over.over);
      if (sp2Overload(k)) throw new Error('cutting ' + before + ' gal did not clear the overload');
    });
    step('fuel moves in the quantity you choose', () => {
      sp2PickDriver('d0');
      const d = SP2_DRIVERS.d0;
      // a known load, since the steps before this one move rigs between drivers
      sp2Unload('d0');
      d.load[1].p = 'HO DSL'; d.load[1].q = Math.min(800, SP2_TRUCKS[d.truck].comps[1].cap);
      sp2RenderUnit();
      const from = 1, to = 0;
      const moved = { p: d.load[from].p, q: d.load[from].q };
      const stop = { stopPropagation() {}, currentTarget: document.querySelector('.sp2-sv') };
      sp2CompClick(stop, 'd0', 'truck', from);
      if (!sp2MoveFrom) throw new Error('the compartment was not picked up');
      if (!document.querySelector('.sp2-sv-held')) throw new Error('nothing shows it is held');
      sp2CompClick(stop, 'd0', 'truck', to);
      // it asks how much rather than tipping the whole compartment across
      const n = document.getElementById('sp2MoveN');
      if (!n) throw new Error('it did not ask how much to move');
      if (+n.value !== Math.min(moved.q, SP2_TRUCKS[d.truck].comps[to].cap))
        throw new Error('it did not default to as much as fits');
      if (d.load[to].q) throw new Error('it moved before being told how much');
      // a part of it, not all
      const part = Math.round(moved.q / 4 / 50) * 50 || 50;
      sp2MoveSync(part);
      sp2DoMove('d0');
      if (d.load[to].q !== part) throw new Error('moved ' + d.load[to].q + ' gal, not ' + part);
      if (d.load[from].q !== moved.q - part) throw new Error('the source did not keep the rest');
      if (d.load[from].p !== moved.p) throw new Error('the source forgot its product');
      if (sp2MoveFrom || sp2MoveTo) throw new Error('the move did not finish');
      // and never more than the destination holds
      if (sp2MoveMax > SP2_TRUCKS[d.truck].comps[to].cap)
        throw new Error('it would allow more than the compartment holds');
      // one product per compartment still stands
      const otherProd = d.load.findIndex((l, i) => i !== to && l.q > 0 && l.p !== d.load[to].p);
      if (otherProd >= 0) {
        sp2CompClick(stop, 'd0', 'truck', otherProd);
        sp2CompClick(stop, 'd0', 'truck', to);
        if (!/one product per compartment/.test(document.getElementById('sp2Toast').textContent))
          throw new Error('it allowed two products into one compartment');
        sp2MoveCancel();
      }
    });
    step('the columns resize, and either can go its own way', () => {
      const grip = document.getElementById('sp2Split');
      if (!grip) throw new Error('no grip between the columns');
      if (getComputedStyle(grip).cursor !== 'col-resize') throw new Error('the grip does not say it resizes');
      const col = document.querySelector('.sp2-col-orders');
      const body = document.getElementById('sp2Body');
      // flex-basis is animated, and an animating property measures as the value
      // it is coming FROM — so take the transition off while we check
      const keep = col.style.transition;
      col.style.transition = 'none';
      const before = col.getBoundingClientRect().width;
      const r = body.getBoundingClientRect();
      grip.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: r.left + before }));
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + r.width * 0.55 }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      void col.offsetWidth;
      const after = col.getBoundingClientRect().width;
      col.style.transition = keep;
      if (Math.abs(after - before) < 40) throw new Error('the column did not move: ' + Math.round(before) + ' → ' + Math.round(after));
      col.style.flexBasis = '';
      if (typeof sp2PopOut !== 'function') throw new Error('a column cannot be popped out');
      if (document.querySelectorAll('.sp2-col-hdr .sp2-ico-btn').length < 2)
        throw new Error('only one column offers to pop out');
      // and the popped-out page shows one column
      body.setAttribute('data-only', 'drivers');
      if (getComputedStyle(document.querySelector('.sp2-col-orders')).display !== 'none')
        throw new Error('popping out drivers leaves the orders column up');
      body.removeAttribute('data-only');
      sp2FitRig();
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
