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
    // V2 is the same planner with a different information model: a lane at rest
    // shows its hours only when one bites, the card leads with the order number
    // on its own row, and the products are chips in aligned rows. The checks
    // that read those three things branch; everything else is shared.
    const V2 = out.page.indexOf('ui2') >= 0;
    // A hand-set column width is remembered and beats the per-view widths — which
    // is right in use and wrong for a test run, so start every run without one.
    // The column width a person dragged for themselves lives in this key. The
    // width tests have to start from a clean slate, so stash whatever is there
    // and hand it back when they are done — a test run must not cost someone
    // the layout they set.
    let sp2TheirWidth = null;
    try { sp2TheirWidth = localStorage.getItem('sp2ColWidth'); } catch (e) {}
    const sp2ResetWidth = () => {
      try { localStorage.removeItem('sp2ColWidth'); } catch (e) {}
      const c = document.querySelector('.sp2-col-orders');
      if (c) { c.style.flexBasis = ''; }
      if (typeof sp2FitRig === 'function') sp2FitRig();
    };
    const sp2GiveWidthBack = () => {
      try {
        if (sp2TheirWidth) localStorage.setItem('sp2ColWidth', sp2TheirWidth);
        else localStorage.removeItem('sp2ColWidth');
      } catch (e) {}
      const c = document.querySelector('.sp2-col-orders');
      if (c) c.style.flexBasis = sp2TheirWidth || '';
      if (typeof sp2FitRig === 'function') sp2FitRig();
    };
    sp2ResetWidth();

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
      // V2's resting lane is already short, so compact has less left to take
      const least = V2 ? 12 : 40;
      if (comp[other] >= full[other] - least)
        throw new Error('compact saved only ' + Math.round(full[other] - comp[other]) + 'px');
      // the chosen lane keeps its tanker; the rest keep bars and lose the writing
      if (!document.querySelector('.sp2-ln.on .sp2-sv')) throw new Error('compact took the tanker away');
      [...document.querySelectorAll('.sp2-ln')].forEach((l, i) => {
        if (i === sel) return;
        if (!l.querySelector('.sp2-bars')) throw new Error('compact dropped the bars');
        if (!l.querySelector('.sp2-bar2-fill')) throw new Error('compact dropped the fuel');
        if (!V2 && getComputedStyle(l.querySelector('.sp2-bar2-p')).display !== 'none')
          throw new Error('compact still writes the product on every bar');
        if (V2 && getComputedStyle(l.querySelector('.sp2-ln-sync')).display !== 'none')
          throw new Error('compact still writes the hub on every lane');
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
      sp2ResetWidth();
      const search = c2.querySelector('#sp2DrvSearch').getBoundingClientRect();
      const tools = c2.querySelector('.sp2-hdr-tools').getBoundingClientRect();
      // ahead of them on the line, or above them when the column is too narrow
      const sameRow = Math.abs(search.top - tools.top) < 6;
      if (sameRow ? search.left >= tools.left : search.top > tools.top)
        throw new Error('search is not ahead of the filters');
      if (document.getElementById('sp2LayoutSeg')) throw new Error('the V1/V2 switch is still here');
      if (typeof sp2Layout !== 'undefined') throw new Error('V1 left its state behind');
    });
    step('the rig faces left and leaves air either side', () => {
      sp2ResetWidth();
      sp2PickDriver('d0');
      const box = document.querySelector('.sp2-rig'), svg = box.querySelector('.sp2-sv');
      const slack = box.clientWidth - svg.getBoundingClientRect().width;
      // when the compartments are already at their floor the rig cannot give
      // back the full padding; it just must not spill past the lane
      const atFloor = svg.getBoundingClientRect().width >= box.clientWidth - 2 * TK_SIDE_PAD - 2;
      if (!atFloor && Math.abs(slack - 2 * TK_SIDE_PAD) > 6)
        throw new Error('leaves ' + Math.round(slack / 2) + 'px a side, not ' + TK_SIDE_PAD);
      if (slack < -2) throw new Error('the rig spills past the lane by ' + Math.round(-slack) + 'px');
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
    step('an order card says how much of it would fit', () => {
      sp2SetQuick('unplanned');
      sp2PickDriver('d0');
      const cards = [...document.querySelectorAll('.sp2-card')];
      if (!cards.length) throw new Error('no cards to measure');
      cards.forEach(c => {
        if (!c.querySelector('.sp2-fit')) throw new Error('an unplanned card has no fit on it');
      });
      // a planned order is already on a truck; fit means nothing for it
      sp2SetQuick('planned');
      if (document.querySelector('.sp2-card .sp2-fit'))
        throw new Error('a planned order still carries a fit');
      sp2SetQuick('unplanned');
      if (!/fit vs /.test(document.getElementById('sp2Vs').textContent))
        throw new Error('the column does not say which rig the fit is against');
    });
    step('the fit is the number a drop would really give', () => {
      const k = 'd0';
      sp2PickDriver(k);
      const o = SP2_ORDERS.filter(x => !x.driver)[0];
      const said = sp2FitFor(k, o);
      const before = sp2Cells(k).reduce((s, c) => s + c.l.q, 0);
      sp2Drag = o.id;
      sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => o.id } }, 'auto', -1, k);
      const loaded = sp2Cells(k).reduce((s, c) => s + c.l.q, 0) - before;
      if (loaded !== said.fits)
        throw new Error('said ' + said.fits + ' gal would fit, ' + loaded + ' actually went on');
      sp2UnplanOrder({ stopPropagation(){} }, k, o.id);
    });
    step('every grade of fit is reachable', () => {
      const seen = {};
      Object.keys(SP2_DRIVERS).forEach(k => {
        SP2_ORDERS.filter(o => !o.driver).forEach(o => {
          const f = sp2FitFor(k, o);
          const kind = f.pct >= 100 && f.rigPct >= 100 ? 'perfect'
                     : f.pct >= 100 ? 'full' : f.pct > 0 ? 'part' : 'none';
          seen[kind] = (seen[kind] || 0) + 1;
        });
      });
      ['perfect', 'full', 'part', 'none'].forEach(kind => {
        if (!seen[kind]) throw new Error('no order anywhere reads "' + kind + '"');
      });
      // a full tank can take nothing
      const k = 'd0';
      sp2Unload(k);
      SP2_TRUCKS[SP2_DRIVERS[k].truck].comps.forEach((c, i) => {
        SP2_DRIVERS[k].load[i].p = 'UNL87'; SP2_DRIVERS[k].load[i].q = c.cap;
      });
      const o = SP2_ORDERS.filter(x => !x.driver)[0];
      if (sp2FitFor(k, o).fits !== 0) throw new Error('a full rig still claims room');
      sp2Unload(k);
    });
    step('the fit follows the rig it is measured against', () => {
      sp2SetQuick('unplanned');
      sp2PickDriver('d0');
      const first = () => document.querySelector('.sp2-card .sp2-fit').textContent;
      const a = first();
      sp2PickDriver('d2');                       // a bigger truck
      if (first() === a) throw new Error('the fit did not change with the driver');
      sp2PickDriver('d0');
      if (first() !== a) throw new Error('coming back gave a different answer');
    });
    step('an empty transport has a list of orders that fill it', () => {
      // Order sizes are cut from the fleet's own compartments, so a planner
      // looking at an empty rig sees work that fills it: the top of the fit
      // sort reads 85–100%, and the band is a per-class promise — a 9,000-gal
      // order is a bobtail's problem, not its load.
      const unp = SP2_ORDERS.filter(o => !o.driver);
      if (unp.length < 12) throw new Error('only ' + unp.length + ' unplanned orders to choose from');
      ['HV', 'LT'].forEach(pre => {
        const k = Object.keys(SP2_DRIVERS).filter(x =>
          SP2_DRIVERS[x].truck.split('-')[0] === pre && !SP2_DRIVERS[x].trailer &&
          sp2Cells(x).every(c => c.l.q === 0))[0];
        if (!k) throw new Error('no empty ' + pre + ' to measure against');
        const was = sp2Driver;
        sp2Driver = k;
        const top = unp.slice().sort((a, b) => sp2FitScore(b) - sp2FitScore(a)).slice(0, 8);
        const read = top.map(o => { const f = sp2FitFor(k, o); return f.pct < 100 ? 'over' : f.rigPct; });
        sp2Driver = was;
        const band = read.filter(v => v !== 'over' && v >= 85).length;
        if (band < 8)
          throw new Error(pre + ' tops out at ' + band + ' of 8 in the 85–100% band: [' + read.join(' ') + ']');
      });
      // and every class has work of its own size, or its list is all overflow
      ['BT', 'TW', 'PB'].forEach(pre => {
        const caps = SP2_SPECS.filter(s => s.pre === pre)[0].caps;
        const cap = caps.reduce((a, b) => a + b, 0);
        const own = unp.filter(o => { const g = sp2Gal(o); return g <= cap && g >= cap * 0.85; }).length;
        if (own < 2) throw new Error(pre + ' has ' + own + ' orders cut to its size');
      });
    });
    step(V2 ? 'a resting lane shows its hours only when one bites'
            : 'every lane carries the four Samsara clocks', () => {
      const lanes = [...document.querySelectorAll('.sp2-ln')];
      if (!lanes.length) throw new Error('no lanes on screen');
      if (V2) {
        lanes.forEach(l => {
          const k = l.dataset.k, worst = sp2HosWorst(SP2_DRIVERS[k].hos);
          const chip = l.querySelector('.sp2-hos-chip');
          const open = l.classList.contains('on');
          if (worst === 'ok' && chip)
            throw new Error(SP2_DRIVERS[k].name + ' is clear of every limit but still carries a chip');
          if (worst !== 'ok' && !chip && !open)
            throw new Error(SP2_DRIVERS[k].name + ' is near a limit and the lane says nothing');
          if (chip) {
            const bind = sp2HosBind(SP2_DRIVERS[k].hos);
            const want = SP2_HOS_NAME[bind] + ' ' + sp2Hm(SP2_DRIVERS[k].hos[bind]);
            if (chip.textContent.trim() !== want)
              throw new Error(chip.textContent.trim() + ' is not the binding clock (' + want + ')');
          }
          // the strip itself belongs to the lane you are working in
          if (!open && l.querySelector('.sp2-hos'))
            throw new Error(SP2_DRIVERS[k].name + ' is shut but still carries the full strip');
        });
        const on = lanes.find(l => l.classList.contains('on'));
        const hos = on && on.querySelector('.sp2-hos');
        if (!hos) throw new Error('the open lane has no HOS strip');
        if (hos.querySelectorAll('.sp2-hos-c').length !== 4)
          throw new Error('the open lane shows ' + hos.querySelectorAll('.sp2-hos-c').length + ' clocks, not 4');
        if (hos.textContent.indexOf('Samsara') < 0)
          throw new Error('the HOS strip does not say where the numbers come from');
        const k = on.dataset.k, h = SP2_DRIVERS[k].hos;
        const shown = [...on.querySelectorAll('.sp2-hos-c-v')].map(e => e.textContent);
        ['brk','drv','shf','cyc'].forEach((c, n) => {
          if (shown[n] !== sp2Hm(h[c]))
            throw new Error(SP2_HOS_NAME[c] + ' reads ' + shown[n] + ', the pull says ' + sp2Hm(h[c]));
        });
        return;
      }
      lanes.forEach(l => {
        const hos = l.querySelector('.sp2-hos');
        if (!hos) throw new Error(l.querySelector('.sp2-ln-name').textContent + ' has no HOS');
        if (hos.querySelectorAll('.sp2-hos-c').length !== 4)
          throw new Error('a lane shows ' + hos.querySelectorAll('.sp2-hos-c').length + ' clocks, not 4');
        if (hos.textContent.indexOf('Samsara') < 0)
          throw new Error('the HOS strip does not say where the numbers come from');
        if (!hos.querySelector('.sp2-hos-go')) throw new Error('a lane has no way into the detail');
      });
      // the numbers on screen are the numbers in the pull — nothing is computed here
      const k = lanes[0].dataset.k, h = SP2_DRIVERS[k].hos;
      const shown = [...lanes[0].querySelectorAll('.sp2-hos-c-v')].map(e => e.textContent);
      ['brk','drv','shf','cyc'].forEach((c, n) => {
        if (shown[n] !== sp2Hm(h[c]))
          throw new Error(SP2_HOS_NAME[c] + ' reads ' + shown[n] + ', the pull says ' + sp2Hm(h[c]));
      });
    });
    step('a driver out of hours is flagged where it matters', () => {
      // the warning is only worth anything on a driver you could still pick
      const tight = Object.keys(SP2_DRIVERS)
        .filter(k => sp2HosWorst(SP2_DRIVERS[k].hos) !== 'ok' && sp2Avail(SP2_DRIVERS[k]));
      if (!tight.length) throw new Error('no available driver is near a limit, so the strip warns no one');
      tight.forEach(k => {
        const bind = sp2HosBind(SP2_DRIVERS[k].hos);
        const lane = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === k);
        if (!lane) return;
        if (V2) {
          if (lane.classList.contains('on')) return;   // the open lane shows the whole strip
          const chip = lane.querySelector('.sp2-hos-chip');
          if (!chip) throw new Error(SP2_DRIVERS[k].name + ' is ' + bind + '-limited and the lane is silent');
          if (chip.textContent.indexOf(SP2_HOS_NAME[bind]) < 0)
            throw new Error(SP2_DRIVERS[k].name + ' is ' + bind + '-limited but the chip names something else');
          return;
        }
        const cell = lane.querySelectorAll('.sp2-hos-c')[['brk','drv','shf','cyc'].indexOf(bind)];
        if (!cell.classList.contains('bind'))
          throw new Error(SP2_DRIVERS[k].name + ' is ' + bind + '-limited and the clock is not marked');
      });
      // and a rested driver has nothing underlined
      const rested = Object.keys(SP2_DRIVERS).filter(k => sp2HosWorst(SP2_DRIVERS[k].hos) === 'ok')[0];
      const rl = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === rested);
      if (rl && rl.querySelector(V2 ? '.sp2-hos-chip' : '.sp2-hos-c.bind'))
        throw new Error(SP2_DRIVERS[rested].name + ' is clear of every limit but a clock is marked');
    });
    step('view detail opens the HOS side sheet', () => {
      const mid = Object.keys(SP2_DRIVERS).find(k => SP2_DRIVERS[k].state === 'driving' &&
        SP2_SHIFTS[SP2_DRIVERS[k].shift].from < SP2_NOW);
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === mid);
      lane.querySelector('.sp2-hos').click();
      const sheet = document.getElementById('sp2HosSheet');
      if (!sheet.classList.contains('on')) throw new Error('the sheet did not open');
      if (!document.getElementById('sp2HosScrim').classList.contains('on'))
        throw new Error('the sheet opened without a scrim behind it');
      const body = document.getElementById('sp2HosBody');
      if (body.querySelectorAll('.sp2-dial').length !== 4)
        throw new Error('the sheet shows ' + body.querySelectorAll('.sp2-dial').length + ' dials, not 4');
      if (!body.querySelector('.sp2-g')) throw new Error('the day graph is missing');
      if (!body.querySelectorAll('.sp2-dl-row').length)
        throw new Error('a driver mid-shift has an empty duty log');
      if (body.textContent.indexOf('Samsara') < 0)
        throw new Error('the sheet does not say the numbers come from Samsara');
      if (!/Break|Drive|Shift|Cycle/.test(body.querySelector('.sp2-hos-bind').textContent))
        throw new Error('the sheet does not name the binding limit');
      // the four dials read the pull, in order
      const h = SP2_DRIVERS[mid].hos;
      const vals = [...body.querySelectorAll('.sp2-dial-v')].map(e => e.textContent);
      ['brk','drv','shf','cyc'].forEach((c, n) => {
        if (vals[n] !== sp2Hm(h[c])) throw new Error('the ' + SP2_HOS_NAME[c] + ' dial does not match the pull');
      });
      // a rig still in the yard has nothing logged, and says so
      sp2HosOpen(null, SP2_YARD[0]);
      if (!body.querySelector('.sp2-hos-none') && !body.querySelectorAll('.sp2-dl-row').length)
        throw new Error('an unstarted shift shows an empty log with no explanation');
      sp2HosClose();
      if (sheet.classList.contains('on')) throw new Error('the sheet did not close');
    });
    step('sorting by fit puts the best first', () => {
      sp2SetQuick('unplanned');
      sp2PickDriver('d2');
      sp2SetSort('time');
      const byTime = [...document.querySelectorAll('.sp2-card .sp2-ord')].map(e => e.textContent);
      if (byTime.length < 3) throw new Error('not enough orders to rank');
      sp2SetSort('fit');
      const byFit = [...document.querySelectorAll('.sp2-card .sp2-ord')].map(e => e.textContent);
      if (byFit.length !== byTime.length) throw new Error('sorting lost or gained orders');
      if (byFit.join() === byTime.join()) throw new Error('sorting by fit changed nothing');
      // the order on screen matches the score, best first
      const score = id => sp2FitScore(SP2_ORDERS.filter(o => o.id === id)[0]);
      for (let i = 1; i < byFit.length; i++)
        if (score(byFit[i - 1]) < score(byFit[i]))
          throw new Error(byFit[i] + ' outranks ' + byFit[i - 1] + ' but sits below it');
      if (!document.querySelector('.sp2-rank')) throw new Error('the ranking is not numbered');
      if (document.querySelector('.sp2-vt-rail')) throw new Error('a ranking still draws the time rail');
      // the horizontal view is a time axis and cannot be re-ordered
      if (!document.querySelector('[data-v="h"]').disabled)
        throw new Error('the horizontal view is still offered while ranking');
      sp2SetSort('time');
      if (document.querySelector('[data-v="h"]').disabled) throw new Error('it stayed disabled');
      if (!document.querySelector('.sp2-vt-rail')) throw new Error('the rail did not come back');
      sp2PickDriver('d0');
    });
    step('the ranking follows the rig', () => {
      sp2SetQuick('unplanned');
      sp2SetSort('fit');
      sp2PickDriver('d0');
      const a = document.querySelector('.sp2-card .sp2-ord').textContent;
      sp2PickDriver('d2');
      const b = document.querySelector('.sp2-card .sp2-ord').textContent;
      if (a === b) {
        // not wrong on its own, but the whole order must not be identical
        const f = [...document.querySelectorAll('.sp2-card .sp2-ord')].map(e => e.textContent).join();
        sp2PickDriver('d0');
        if (f === [...document.querySelectorAll('.sp2-card .sp2-ord')].map(e => e.textContent).join())
          throw new Error('two different rigs rank the orders identically');
      }
      sp2SetSort('time');
      sp2PickDriver('d0');
    });
    step('an order carrying a blend says so', () => {
      sp2SetQuick('all');
      if (sp2BlendOnly) sp2ToggleBlend();
      const blend = SP2_ORDERS.filter(sp2HasBlend);
      if (blend.length < 15) throw new Error('only ' + blend.length + ' orders carry a blend');
      const mixed = blend.filter(o => o.prods.some(pr => !sp2IsBlend(pr.p)));
      if (mixed.length < 3) throw new Error('only ' + mixed.length + ' mix a blend with a straight product');
      // every card that has one is labelled, and no card that has not
      [...document.querySelectorAll('.sp2-card')].forEach(c => {
        const id = c.querySelector('.sp2-ord').textContent;
        const o = SP2_ORDERS.filter(x => x.id === id)[0];
        const badged = !!c.querySelector('.sp2-pill-blend');
        if (sp2HasBlend(o) !== badged)
          throw new Error(id + (badged ? ' is labelled a blend and is not' : ' carries a blend and is not labelled'));
      });
      // the blend itself is a product with constituents, not a name on a list
      Object.keys(SP2_BLENDS).forEach(b => {
        const sum = SP2_BLENDS[b].parts.reduce((s, p) => s + p.pct, 0);
        if (sum !== 100) throw new Error(b + ' ratio adds to ' + sum + '%');
        if (SP2_BLENDS[b].seq.length !== SP2_BLENDS[b].parts.length)
          throw new Error(b + ' has no loading sequence');
      });
    });
    step('the blend filter narrows to them', () => {
      sp2SetQuick('all');
      if (sp2BlendOnly) sp2ToggleBlend();
      const all = document.querySelectorAll('.sp2-card').length;
      sp2ToggleBlend();
      const only = [...document.querySelectorAll('.sp2-card .sp2-ord')].map(e => e.textContent);
      if (!only.length || only.length >= all) throw new Error('the blend filter did not narrow: ' + only.length + ' of ' + all);
      only.forEach(id => {
        if (!sp2HasBlend(SP2_ORDERS.filter(o => o.id === id)[0]))
          throw new Error(id + ' has no blend but survived the filter');
      });
      sp2ToggleBlend();
      if (document.querySelectorAll('.sp2-card').length !== all) throw new Error('turning it off did not restore the list');
    });
    step('the card leads with the kind, and drops the repeated time', () => {
      sp2SetQuick('all');
      const card = document.querySelector('.sp2-card');
      const kind = card.querySelector('.sp2-kind');
      if (!kind) throw new Error('no order-kind mark');
      const id = card.querySelector('.sp2-ord').textContent;
      const o = SP2_ORDERS.filter(x => x.id === id)[0];
      if (kind.textContent !== o.type.charAt(0))
        throw new Error('the mark says ' + kind.textContent + ' for a ' + o.type);
      const cs = getComputedStyle(kind);
      if (parseFloat(cs.borderRadius) * 2 < parseFloat(cs.height) - 1) throw new Error('the mark is not a circle');
      if (card.querySelector('.sp2-time-lbl')) throw new Error('the card still repeats the time');
      // the status sits up with the order number now
      const top = card.querySelector('.sp2-card-top');
      if (!top.querySelector('.sp2-pill')) throw new Error('the status is not beside the order number');
      if (card.querySelector('.sp2-card-foot')) throw new Error('the old footer is still there');
      // the time is still on the rail beside it
      if (!document.querySelector('.sp2-vtime')) throw new Error('the time left the rail too');
    });
    step('the yard has rigs that have not started and are empty', () => {
      const yard = Object.keys(SP2_DRIVERS).filter(k => {
        const d = SP2_DRIVERS[k];
        return d.state !== 'off-duty' &&
               sp2ShiftState(d).kind === 'before' &&
               sp2RigFill(k).pct === 0;
      });
      if (yard.length < 6)
        throw new Error('only ' + yard.length + ' rigs are waiting on an unstarted shift with nothing in them');
      // a rig in the yard with orders already on it would be a contradiction
      yard.forEach(k => {
        if (SP2_ORDERS.some(o => o.driver === k))
          throw new Error(SP2_DRIVERS[k].name + ' has not started but already has orders');
        if (SP2_DRIVERS[k].trailer && SP2_DRIVERS[k].tload.some(l => l.q))
          throw new Error(SP2_DRIVERS[k].name + ' has fuel in a trailer but has not started');
        if (!sp2Avail(SP2_DRIVERS[k])) throw new Error(SP2_DRIVERS[k].name + ' is empty but does not count as available');
      });
      // and they are what Available offers first
      sp2SetDrvFilter('available');
      const lead = [...document.querySelectorAll('.sp2-ln')].slice(0, 6).map(l => l.dataset.k);
      lead.forEach(k => {
        if (yard.indexOf(k) < 0)
          throw new Error(SP2_DRIVERS[k].name + ' is above a yard rig in Available');
      });
      sp2SetDrvFilter('all');
    });
    step('Available holds its order while you work in it', () => {
      sp2SetDrvFilter('available');
      const before = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      if (before.length < 4) throw new Error('too few available drivers');
      const k = before[0];
      sp2PickDriver(k);
      const was = sp2RigFill(k).pct;
      // load it up, the way a dispatcher would
      SP2_ORDERS.filter(o => !o.driver).slice(0, 3).forEach(o => {
        sp2Drag = o.id;
        sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => o.id } }, 'auto', -1, k);
      });
      if (sp2RigFill(k).pct <= was) throw new Error('nothing actually loaded');
      const after = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      if (after[0] !== k) throw new Error('the card you were working on slid down the list');
      if (after.join() !== before.join()) throw new Error('the list re-sorted under you');
      // fill it right up: it still must not vanish mid-job
      SP2_ORDERS.filter(o => !o.driver).forEach(o => {
        if (sp2RigFill(k).pct >= 100) return;
        sp2Drag = o.id;
        sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => o.id } }, 'auto', -1, k);
      });
      if (![...document.querySelectorAll('.sp2-ln')].some(l => l.dataset.k === k))
        throw new Error('a rig you filled disappeared from under you');
      // leaving and coming back is the ask for a fresh order, and only then
      sp2SetDrvFilter('all');
      sp2SetDrvFilter('available');
      const fresh = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      if (sp2RigFill(k).pct >= 100 && fresh.indexOf(k) >= 0)
        throw new Error('a full rig is still offered as available after a fresh ask');
      sp2Unload(k);
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      sp2SetDrvFilter('available');
    });
    step('a card moves only when asked', () => {
      sp2SetDrvFilter('available');
      const lanes = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      const k = lanes[0];
      sp2PickDriver(k);
      if (!document.querySelector('.sp2-ln.on .sp2-ln-truck').textContent.match(/Move/))
        throw new Error('no way to move the card by hand');
      // give it a load so its place by space is no longer the top
      SP2_ORDERS.filter(o => !o.driver).slice(0, 2).forEach(o => {
        sp2Drag = o.id;
        sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => o.id } }, 'auto', -1, k);
      });
      if ([...document.querySelectorAll('.sp2-ln')][0].dataset.k !== k)
        throw new Error('it moved before being asked');
      sp2MoveLane({ stopPropagation(){} }, k);
      const moved = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      if (moved[0] === k) throw new Error('asking it to move did nothing');
      // and where it landed is where its space puts it
      const at = moved.indexOf(k);
      if (at > 0 && sp2RigFill(moved[at - 1]).pct > sp2RigFill(k).pct + 0.01)
        throw new Error('it landed above a rig with more room');
      sp2Unload(k);
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      sp2SetDrvFilter('all');
    });
    step('Available leads with the emptiest rig', () => {
      sp2SetDrvFilter('available');
      const lanes = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      if (lanes.length < 3) throw new Error('too few available drivers to order');
      const fill = lanes.map(k => +sp2RigFill(k).pct.toFixed(2));
      for (let i = 1; i < fill.length; i++)
        if (fill[i] < fill[i - 1] - 0.01)
          throw new Error('a fuller rig is listed above an emptier one: ' + fill.join(' → '));
      if (fill[0] >= fill[fill.length - 1]) throw new Error('the ordering did nothing');
      // and the other tabs are left in their own order
      sp2SetDrvFilter('all');
      const byKey = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      if (byKey.join() !== Object.keys(SP2_DRIVERS).filter(k => byKey.indexOf(k) >= 0).join())
        throw new Error('All is no longer in roster order');
    });
    step('the driver header sits on one line', () => {
      sp2ResetWidth();
      const hdr = document.querySelector('.sp2-col-unit .sp2-col-hdr');
      const mid = el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      const title = hdr.querySelector('.sp2-col-title');
      const tabs = hdr.querySelector('.sp2-drv-tabs');
      const search = hdr.querySelector('#sp2DrvSearch');
      if (Math.abs(mid(tabs) - mid(title)) > 2)
        throw new Error('the tabs sit ' + Math.round(mid(tabs) - mid(title)) + 'px off the title');
      if (Math.abs(mid(tabs) - mid(search)) > 2)
        throw new Error('the tabs sit ' + Math.round(mid(tabs) - mid(search)) + 'px off the search');
      if (parseFloat(getComputedStyle(tabs).marginBottom) > 0)
        throw new Error('the tabs still carry the margin from when they were in a panel');
    });
    step('the card splits: who and where left, what right', () => {
      sp2SetQuick('all');
      if (sp2BlendOnly) sp2ToggleBlend();
      const card = document.querySelector('.sp2-card');
      const L = card.querySelector('.sp2-card-l'), R = card.querySelector('.sp2-card-r');
      if (!L || !R) throw new Error('the card is not in two halves');
      if (L.getBoundingClientRect().left >= R.getBoundingClientRect().left)
        throw new Error('the halves are the wrong way round');
      // V2 lifts the order number, type and status onto their own row above the
      // split, because the number is the primary fact; the split below is still
      // who-and-where on the left, what on the right.
      const head = V2 ? card.querySelector('.sp2-card-top') : L;
      ['.sp2-kind', '.sp2-ord', '.sp2-pill'].forEach(sel => {
        if (!head.querySelector(sel)) throw new Error(sel + ' is not in the head');
      });
      ['.sp2-ship', '.sp2-addr'].forEach(sel => {
        if (!L.querySelector(sel)) throw new Error(sel + ' is not on the left');
      });
      if (V2) {
        if (!L.querySelector('.sp2-meta')) throw new Error('the window and the run are not on the left');
        if (!L.querySelector('.sp2-when')) throw new Error('the card does not state its delivery window');
        if (!L.querySelector('.sp2-trip')) throw new Error('the card does not state the run from the hub');
        if (!card.querySelector('.sp2-cbx')) throw new Error('the card cannot be picked');
        if (!card.querySelector('.sp2-open')) throw new Error('the card has no way into its sheet');
      }
      if (L.querySelector(V2 ? '.sp2-prow-q' : '.sp2-prow')) throw new Error('a product is on the left');
      const id = card.querySelector('.sp2-ord').textContent;
      const o = SP2_ORDERS.filter(x => x.id === id)[0];
      // a blend is two lines on the card — one per constituent — so the chips
      // are counted against what is actually racked, not against the order lines
      const want = sp2Lines(o).length;
      const seen = R.querySelectorAll(V2 ? '.sp2-prow-q' : '.sp2-prow').length;
      if (seen !== want) throw new Error(id + ' lists ' + seen + ' of ' + want + ' products');
      if (V2 && R.querySelectorAll('.sp2-chip').length !== want)
        throw new Error(id + ' does not give every product its own chip');
      R.querySelectorAll('.sp2-prow-q').forEach(q => {
        if (!/[\d,]+ gal/.test(q.textContent)) throw new Error('a product has no quantity');
      });
    });
    step('a blend is one chip per constituent, not one for the pair', () => {
      sp2SetQuick('all');
      if (!sp2BlendOnly) sp2ToggleBlend();
      // V2 draws each constituent as a chip with its share beside it, so a row
      // is the chip + the share + the quantity rather than one boxed line.
      const rows = V2
        ? [...document.querySelectorAll('.sp2-prow-b')]
            .filter(b => b.textContent.trim())
            .map(b => ({ name: b.previousElementSibling.textContent.trim(), share: b.textContent.trim() }))
        : [...document.querySelectorAll('.sp2-prow.blend')];
      if (!rows.length) throw new Error('no blended product on screen');
      if (V2) {
        rows.forEach(r => {
          if (SP2_BLENDS[r.name])
            throw new Error(r.name + ' is the blend itself — the constituents are still sharing a chip');
          const m = r.share.match(/^(\S+) \u00b7 (\d+)%$/);
          if (!m) throw new Error(r.name + ' does not name its blend and share: ' + r.share);
          const b = SP2_BLENDS[m[1]];
          if (!b) throw new Error(m[1] + ' is not a blend we carry');
          const part = b.parts.filter(x => x.p === r.name)[0];
          if (!part) throw new Error(r.name + ' is not part of ' + m[1]);
          if (String(part.pct) !== m[2])
            throw new Error(r.name + ' shows ' + m[2] + '% of ' + m[1] + ', not ' + part.pct + '%');
        });
      } else
      rows.forEach(r => {
        const name = r.querySelector('.sp2-prow-p').textContent;
        if (SP2_BLENDS[name])
          throw new Error(name + ' is the blend itself — the constituents are still sharing a chip');
        const pill = r.querySelector('.sp2-pill-blend');
        if (!pill) throw new Error(name + ' has no blend label beside it');
        const m = pill.textContent.match(/^(\S+) (\d+)%$/);
        if (!m) throw new Error(name + ' does not name its blend and share: ' + pill.textContent);
        const b = SP2_BLENDS[m[1]];
        if (!b) throw new Error(m[1] + ' is not a blend we carry');
        const part = b.parts.filter(x => x.p === name)[0];
        if (!part) throw new Error(name + ' is not part of ' + m[1]);
        if (String(part.pct) !== m[2])
          throw new Error(name + ' shows ' + m[2] + '% of ' + m[1] + ', not ' + part.pct + '%');
      });
      // both constituents are on the card, and the gallons split in ratio
      const o = SP2_ORDERS.filter(x => sp2HasBlend(x))[0];
      const on = [...document.querySelectorAll('.sp2-card')]
        .filter(c => c.querySelector('.sp2-ord').textContent === o.id)[0];
      if (on) {
        const bl = o.prods.filter(pr => sp2IsBlend(pr.p))[0], parts = SP2_BLENDS[bl.p].parts;
        const texts = V2
          ? [...on.querySelectorAll('.sp2-card-r')].map(r => r.innerText)
          : [...on.querySelectorAll('.sp2-prow')].map(r => r.innerText);
        parts.forEach(part => {
          const want = Math.round(bl.q * part.pct / 100).toLocaleString() + ' gal';
          if (!texts.some(x => x.indexOf(part.p) >= 0 && x.indexOf(want) >= 0))
            throw new Error(o.id + ' has no chip for ' + part.p + ' at ' + want);
        });
      }
      // and a straight product carries neither label nor share
      sp2ToggleBlend();
      if (V2) {
        // the share cell is there for every product and empty on a straight one
        const shares = [...document.querySelectorAll('.sp2-prow-b')];
        if (!shares.length) throw new Error('no products on screen to compare');
        const plain = shares.filter(b => !b.textContent.trim());
        if (!plain.length) throw new Error('no straight product to compare');
        plain.forEach(b => {
          const name = b.previousElementSibling.textContent.trim();
          if (SP2_BLENDS[name]) throw new Error(name + ' is a blend drawn as a straight product');
        });
      } else {
      const plain = [...document.querySelectorAll('.sp2-prow:not(.blend)')];
      if (!plain.length) throw new Error('no straight product to compare');
      plain.forEach(r => {
        if (r.querySelector('.sp2-pill-blend'))
          throw new Error(r.querySelector('.sp2-prow-p').textContent + ' is not a blend but reads like one');
      });
      }
    });
    step('a width set by hand is remembered', () => {
      const grip = document.getElementById('sp2Split');
      const col = document.querySelector('.sp2-col-orders');
      const body = document.getElementById('sp2Body');
      try { localStorage.removeItem('sp2ColWidth'); } catch (e) { return; }
      const r = body.getBoundingClientRect();
      grip.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: r.left + col.getBoundingClientRect().width }));
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + r.width * 0.45 }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      const kept = localStorage.getItem('sp2ColWidth');
      if (!kept) throw new Error('the width was not kept');
      if (Math.abs(parseFloat(kept) - 45) > 1) throw new Error('kept ' + kept + ', expected about 45%');
      if (col.style.flexBasis !== kept) throw new Error('what was kept is not what is showing');
      sp2ResetWidth();
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
      sp2ResetWidth();
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
    step('the run gives back the column width it borrowed', () => {
      sp2GiveWidthBack();
      let now = null;
      try { now = localStorage.getItem('sp2ColWidth'); } catch (e) { return; }
      if (now !== sp2TheirWidth)
        throw new Error('the width was ' + sp2TheirWidth + ' before the run and ' + now + ' after it');
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
  document.querySelectorAll('td,th,select,option,button,.comp-prod,.const-name,.bb-mode-name,.sp2-hos-c-top,.sp2-prow-top').forEach(e => {
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
