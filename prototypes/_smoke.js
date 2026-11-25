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
  // V2 asks before it empties a rig; V1 does not. Tests want the act itself.
  const unloadRig = k => (window.sp2UnloadGo || window.sp2Unload)(k);

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
    // One V2 lane is trying the side-by-side middle, where the drawing drops
    // its labels because the table beside it carries them. The checks that
    // read the drawing move to a lane that still draws them.
    // V2's open lane puts the compartments in a table and the truck beside it,
    // so the drawing no longer prints the product, the gallons or the fill —
    // the table does. Checks that read those read the table instead.
    const compNames = () =>
      [...document.querySelectorAll('.sp2-ln.on .sp2-ct-p')].map(e => e.innerText.trim());
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
      if (V2) {
        const f = SP2_FACETS.filter(x => x.k === 'shift')[0];
        if (!f || f.opts.join() !== 'AM,PM') throw new Error('shift is not a facet of AM and PM');
      } else if (document.querySelectorAll('[data-s]').length !== 3) {
        throw new Error('expected All, AM and PM');
      }
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
      if (V2 && +document.getElementById('sp2DrvCount').textContent !== avail.length)
        throw new Error('the count does not match what Available leaves');
      if (!V2 && document.getElementById('sp2dAv').textContent !== String(avail.length))
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
      if (off >= all || !off) throw new Error('state filter did nothing: ' + off + '/' + all);
      // and what it leaves really is off duty — leave is its own word now
      [...document.querySelectorAll('.sp2-ln')].forEach(l => {
        const d = SP2_DRIVERS[l.dataset.k];
        if (d.state !== 'off-duty' || (V2 && d.leave))
          throw new Error(d.name + ' is showing under Off duty');
      });
      sp2SetDrvFilter('all');
      const box = document.getElementById('sp2DrvSearch');
      box.value = SP2_DRIVERS.d0.name.split(' ')[0];
      sp2RenderUnit();
      if (document.querySelectorAll('.sp2-ln').length !== 1) throw new Error('search did not narrow to one');
      box.value = ''; sp2RenderUnit();
    });
    step('dragging an order loads the truck', () => {
      sp2SetQuick('all'); sp2PickDriver('d20'); unloadRig();
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
      unloadRig(); un.driver = '';
    });
    step('one product per compartment, blends aside', () => {
      sp2PickDriver('d20'); unloadRig();
      const o = SP2_ORDERS.filter(x => !x.driver)[0];
      const keep = JSON.parse(JSON.stringify(o.prods));
      o.prods = [{ p:'UNL87', q:600 }, { p:'CLR DSL', q:600 }];
      sp2Drag = o.id;
      sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => o.id } }, 'auto', -1);
      const used = SP2_DRIVERS.d20.load.filter(l => l.q > 0).map(l => l.p);
      if (new Set(used).size !== used.length) throw new Error('two products share a compartment');
      o.prods = keep; o.driver = ''; unloadRig();
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
        // V2 shows the compartments only where there is something in them; a
        // lane with nothing planned says so in a line instead
        const planned = SP2_ORDERS.some(o => o.driver === l.dataset.k);
        if (V2 && !planned) {
          if (l.querySelector('.sp2-bars')) throw new Error(l.dataset.k + ' draws empty boxes');
          if (!l.querySelector('.sp2-ln-none'))
            throw new Error(l.dataset.k + ' has nothing planned and does not say so');
        } else if (!l.querySelector('.sp2-bars')) {
          throw new Error(l.dataset.k + ' has no bars');
        }
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
      // V2's drawing names the compartment and nothing else — the table beside
      // it carries the product, so count the compartment labels
      const drawn = svg.querySelectorAll(V2 ? '.sp2-sv-c' : '.sp2-sv-p').length;
      if (drawn !== n) throw new Error('compartments drawn do not match the rig');
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
      // and every compartment still states its own facts — in V2 that is the
      // table beside the drawing, one row per compartment
      if (V2) {
        const names = compNames();
        if (names.length !== caps.length)
          throw new Error('the table lists ' + names.length + ' of ' + caps.length + ' compartments');
        const qty = document.querySelectorAll('.sp2-ln.on .sp2-ct input.sp2-cell');
        if (qty.length !== caps.length) throw new Error('a compartment has no quantity');
        caps.forEach((cap, i) => {
          const want = load[i].q > 0 ? load[i].p : 'Empty';
          if (names[i].indexOf(want) < 0)
            throw new Error('row ' + (i + 1) + ' reads ' + names[i] + ', not ' + want);
          if (qty[i].value !== load[i].q.toLocaleString())
            throw new Error('row ' + (i + 1) + ' reads ' + qty[i].value + ', not ' + load[i].q.toLocaleString());
        });
        // the drawing names the product \u2014 a coloured compartment with no word in
        // it is a colour nobody can read \u2014 but leaves the numbers to the table
        if (svg.querySelectorAll('.sp2-sv-q, .sp2-sv-s').length)
          throw new Error('the drawing repeats the numbers the table already carries');
        const drawn = [...svg.querySelectorAll('.sp2-sv-p')].map(e => e.textContent);
        const holding = load.filter(l => l.q > 0).map(l => l.p);
        if (drawn.length !== holding.length)
          throw new Error('the drawing names ' + drawn.length + ' products for ' +
                          holding.length + ' loaded compartments');
        holding.forEach((pn, i) => {
          if (drawn[i] !== pn) throw new Error('the drawing says ' + drawn[i] + ', the tank holds ' + pn);
        });
        // and every one of them is drawn in a fill of its own, never as nothing
        [...svg.querySelectorAll('.sp2-sv-liq')].forEach(e => {
          const f = e.getAttribute('fill');
          if (!f || f === 'transparent' || f === 'none')
            throw new Error('fuel in a tank is drawn as nothing');
        });
        return;
      }
      if (svg.querySelectorAll('.sp2-sv-p').length !== caps.length)
        throw new Error('a compartment has no product label');
      if (svg.querySelectorAll('.sp2-sv-q').length !== caps.length)
        throw new Error('a compartment has no quantity label');
    });
    step('the drawing survives a trailer', () => {
      const k = document.querySelector('.sp2-ln.on').dataset.k;
      const had = SP2_DRIVERS[k].trailer;
      const sel = V2 ? '.sp2-sv-c' : '.sp2-sv-p';
      const before = document.querySelector('.sp2-sv').querySelectorAll(sel).length;
      const rowsBefore = V2 ? compNames().length : 0;
      sp2AddTrailer('TR-660', k);
      const svg = document.querySelector('.sp2-sv');
      if (!svg) throw new Error('the tanker vanished when a trailer was hitched');
      if (svg.querySelectorAll(sel).length !== before + SP2_TRAILERS['TR-660'].caps.length)
        throw new Error('the trailer compartments were not drawn');
      // the table beside it grows with the rig
      if (V2 && compNames().length !== rowsBefore + SP2_TRAILERS['TR-660'].caps.length)
        throw new Error('the trailer compartments are not in the table');
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
    if (!V2) step('compact fits more drivers, and keeps the one you are on', () => {
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
      if (!document.querySelector('.sp2-ln.on .sp2-sv')) throw new Error('compact took the tanker away');
      [...document.querySelectorAll('.sp2-ln')].forEach((l, i) => {
        if (i === sel) return;
        if (!l.querySelector('.sp2-bars')) throw new Error('compact dropped the bars');
        if (!l.querySelector('.sp2-bar2-fill')) throw new Error('compact dropped the fuel');
        if (getComputedStyle(l.querySelector('.sp2-bar2-p')).display !== 'none')
          throw new Error('compact still writes the product on every bar');
      });
    });

    if (V2) step('one head narrows both columns', () => {
      sp2ResetWidth();
      // the presets and the filters sit ABOVE the columns, once
      const head = document.querySelector('.sp2-head');
      if (!head) throw new Error('there is no head above the columns');
      const body = document.getElementById('sp2Body');
      if (head.getBoundingClientRect().bottom > body.getBoundingClientRect().top + 1)
        throw new Error('the head is not above the columns');
      if (!head.querySelector('.sp2-vr')) throw new Error('the presets are not in the head');
      if (!head.querySelector('#sp2DrvSearch')) throw new Error('the search is not in the head');
      if (!head.querySelector('#sp2FpBtn')) throw new Error('Filters is not in the head');

      // and no column keeps a filter unit of its own
      ['.sp2-col-orders', '.sp2-col-unit'].forEach(sel => {
        const hdr = document.querySelector(sel + ' .sp2-col-hdr');
        if (hdr.querySelector('.sp2-vr, #sp2DrvSearch, #sp2FpBtn, [data-q], [data-d], [data-s]'))
          throw new Error(sel + ' still carries a filter of its own');
        // it keeps its name, its count and how it shows itself
        const id = hdr.querySelector('.sp2-col-id');
        const name = id.querySelector('.sp2-col-title').getBoundingClientRect();
        const n = id.querySelector('.sp2-count').getBoundingClientRect();
        if (n.left - name.right > 10)
          throw new Error(sel + ': the count sits off the name');
        if (!hdr.querySelector('.sp2-tools-r')) throw new Error(sel + ' lost its display tools');
        if (!hdr.querySelector('.sp2-shelf')) throw new Error(sel + ' has no chip shelf');
      });

      // every icon tool carries its own outline, and the timeline switch is
      // one bordered pill of two segments with the live view filled
      const sw = document.querySelector('.sp2-col-orders .sp2-vsw');
      if (!sw) throw new Error('the timeline icons are not in one box');
      if (parseFloat(getComputedStyle(sw).borderTopWidth) < 1)
        throw new Error('the timeline switch has no outline');
      if (sw.querySelectorAll('[data-v]').length !== 2)
        throw new Error('the switch does not hold both views');
      if (!sw.querySelector('[data-v].on')) throw new Error('neither view reads as the live one');
      const all = document.getElementById('sp2AllBtn');
      if (parseFloat(getComputedStyle(all).borderTopWidth) < 1)
        throw new Error('expand-all has no outline');

      // the orders column keeps only how it DRAWS itself: the timeline switch,
      // the expand-all and the way out to its own window. Sort orders a list,
      // so it went up with Filters.
      const o = document.querySelector('.sp2-col-orders .sp2-col-hdr');
      if (o.querySelector('#sp2SortBtn')) throw new Error('sort is still on the orders column');
      if (!head.querySelector('#sp2SortBtn')) throw new Error('sort is not in the head');
      const kept = [...o.querySelectorAll('.sp2-tools-r button')]
        .map(b => b.id || b.getAttribute('data-v') || (/sp2PopOut/.test(b.getAttribute('onclick') || '') ? 'pop' : '?'));
      if (kept.join() !== 'h,v,sp2AllBtn,pop')
        throw new Error('the orders column carries ' + kept.join(' ') +
                        ', not the switch, expand-all and pop-out');
      // and the band over the lanes is gone: the column already names itself
      if (document.querySelector('.sp2-ln-hdr'))
        throw new Error('the lanes still carry a header band');
      if (document.querySelector('.sp2-col-unit [data-v]'))
        throw new Error('the rigs column grew a view switch');
    });

    if (V2) step('a preset speaks for itself, and chips speak for you', () => {
      // back on the preset, unchanged
      sp2VrPick('vAvail');
      if (sp2ViewDirty()) throw new Error('the preset reads as changed the moment it is picked');
      const so = document.getElementById('sp2ShelfO'), sd = document.getElementById('sp2ShelfD');
      if (getComputedStyle(so).display !== 'none' || getComputedStyle(sd).display !== 'none')
        throw new Error('a preset showing unchanged still puts chips up');
      // the narrowing is real even though nothing is on the shelf
      if (!(sp2Facet.ostatus || []).length || !(sp2Facet.room || []).length)
        throw new Error('the preset applied nothing');

      // add one of your own and they come back, the whole set of them
      sp2FpToggle();
      sp2FpPick('Hubs');
      sp2FpTick('hub', SP2_DRIVERS[Object.keys(SP2_DRIVERS)[0]].hub);
      sp2FpApply();
      if (!sp2ViewDirty()) throw new Error('a filter on top of a preset did not change it');
      if (getComputedStyle(sd).display === 'none')
        throw new Error('a filter you applied yourself shows no chip');
      if (sd.textContent.indexOf('Hub') < 0) throw new Error('the chip does not name what you added');
      if (sd.textContent.indexOf('Available') < 0)
        throw new Error('the chips show only the change, not the whole narrowing');

      // and putting the preset back takes them away again
      sp2VrPick('vAvail');
      if (getComputedStyle(sd).display !== 'none') throw new Error('the chips stayed after the reset');
    });

    if (V2) step('each column wears its own chips', () => {
      // off the presets, so the chips answer only to what is applied — a
      // preset showing unchanged speaks for itself and puts none up
      sp2VrAll();
      sp2FpClear();
      sp2SetQuick('unplanned');                    // an order narrowing
      const shelfO = document.getElementById('sp2ShelfO');
      const shelfD = document.getElementById('sp2ShelfD');
      if (getComputedStyle(shelfO).display === 'none')
        throw new Error('the orders column shows no chip for its own filter');
      if (getComputedStyle(shelfD).display !== 'none')
        throw new Error('an order filter put a chip on the rigs column');
      if (shelfO.textContent.indexOf('Unplanned') < 0)
        throw new Error('the chip does not name the value');

      sp2SetDrvFilter('available');                // a rig narrowing
      if (getComputedStyle(shelfD).display === 'none')
        throw new Error('the rigs column shows no chip for its own filter');
      if (shelfD.textContent.indexOf('Available') < 0)
        throw new Error('the rig chip does not name the value');

      // and each shelf's Clear all clears only its own column
      shelfO.querySelector('.sp2-shelf-clr').click();
      if ((sp2Facet.ostatus || []).length) throw new Error('the orders chips did not clear');
      if (!(sp2Facet.room || []).length) throw new Error('clearing orders cleared the rigs too');
      sp2FpClear();
    });

    if (V2) step('sort and the rest of the filters live behind their own icons', () => {
      // the order narrowings are facets in the common panel now
      const st = SP2_FACETS.filter(f => f.k === 'ostatus')[0];
      if (!st || st.c !== 'orders') throw new Error('status is not an order facet');
      ['Unplanned', 'Planned', 'Outside'].forEach(v => {
        if (st.opts.indexOf(v) < 0) throw new Error(v + ' is not a status');
      });
      if (!SP2_FACETS.some(f => f.k === 'oblend' && f.c === 'orders'))
        throw new Error('Blend is not an order facet');
      if (document.getElementById('sp2Quick')) throw new Error('the quick filters are still here');

      // sorting is its own icon, and the two never stand open together
      const spop = document.getElementById('sp2SortPop');
      if (!spop) throw new Error('there is no sort icon');
      ['time', 'fit', 'driver'].forEach(o => {
        if (!spop.querySelector('[data-o="' + o + '"]')) throw new Error(o + ' is not a sort');
      });
      sp2SortToggle();
      if (getComputedStyle(spop).display === 'none') throw new Error('the sort does not open');
      sp2FpToggle();                              // the head's Filters
      if (getComputedStyle(spop).display !== 'none') throw new Error('both menus stand open');
      sp2FltClose();

      // picking a sort is one choice, so the menu closes behind it and the
      // button says what the list is now in
      sp2SortToggle();
      spop.querySelector('[data-o="driver"]').click();
      if (getComputedStyle(spop).display !== 'none')
        throw new Error('the sort menu stays open over the list it just re-ordered');
      if (document.getElementById('sp2SortN').textContent !== 'Driver')
        throw new Error('the Sort button does not say what the list is in');
      sp2SetSort('time');
      if (document.getElementById('sp2SortBtn').classList.contains('on'))
        throw new Error('the natural order still reads as sorted');

      // fit needs a rig; without one it is offered but not usable
      const keep = sp2Driver;
      sp2LaneClick(keep);                        // clicking the open lane lets go
      if (sp2Driver) throw new Error('the lane did not let go');
      if (!spop.querySelector('[data-o="fit"]').disabled)
        throw new Error('fit is offered with no rig to fit');
      if (sp2Sort !== 'time') throw new Error('the list is still ranked against nothing');
      sp2PickDriver(keep);
      if (spop.querySelector('[data-o="fit"]').disabled)
        throw new Error('fit is still locked with a rig chosen');
    });

    if (V2) step('sorting by driver puts each run together', () => {
      sp2SetQuick('all');
      sp2SetSort('driver');
      const seen = {};
      let last = '';
      sp2Visible().forEach(o => {
        const who = o.driver ? SP2_DRIVERS[o.driver].name : '';
        if (who !== last) {
          if (seen[who]) throw new Error(who + "'s orders are split up the list");
          seen[who] = true;
          if (!who && last === '') throw new Error('unplanned work leads a driver sort');
          last = who;
        }
      });
      // and the unplanned fall to the bottom, since this is a planned reading
      const list = sp2Visible();
      const firstBare = list.findIndex(o => !o.driver);
      if (firstBare >= 0 && list.slice(firstBare).some(o => o.driver))
        throw new Error('an unplanned order is above a planned one');
      // a time axis cannot carry it
      if (!document.querySelector('[data-v="h"]').disabled)
        throw new Error('the horizontal view is still offered under a driver sort');
      sp2SetSort('time');
      sp2SetQuick('unplanned');
    });

    if (V2) step('Outside is the orders a run does not reach in time', () => {
      sp2SetQuick('outside');
      const shown = sp2Visible();
      const late = {};
      Object.keys(SP2_DRIVERS).forEach(k => sp2Route(k).forEach(r => {
        if (r.kind === 'late') late[r.o.id] = true;
      }));
      if (!Object.keys(late).length) throw new Error('nothing in the day misses its window');
      shown.forEach(o => {
        if (!late[o.id]) throw new Error(o.id + ' is shown as outside and makes its window');
      });
      Object.keys(late).forEach(id => {
        if (!shown.some(o => o.id === id)) throw new Error(id + ' misses its window and is not shown');
      });
      const stf = SP2_FACETS.filter(f => f.k === 'ostatus')[0];
      if (sp2OrderCountFor(stf, 'Outside') !== Object.keys(late).length)
        throw new Error('the count does not match the list');
      sp2SetQuick('unplanned');
    });

    step('a lane takes the drop, whoever is selected', () => {
      if (V2) sp2SetQuick('all');        // the head opens narrowed to unplanned
      sp2SetDrvFilter('all');
      const lanes = [...document.querySelectorAll('.sp2-ln')];
      const target = lanes.find(l => l.dataset.k !== sp2Driver);
      const k = target.dataset.k;
      unloadRig(k);
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
      unloadRig(k); un.driver = ''; sp2RenderUnit();
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
    step('the rig faces left and leaves air either side', () => {
      sp2ResetWidth();
      sp2PickDriver('d0');
      const box = document.querySelector('.sp2-rig'), svg = box.querySelector('.sp2-sv');
      const slack = box.clientWidth - svg.getBoundingClientRect().width;
      if (V2) {
        // the split scales the drawing to the column it is given, so what has
        // to hold is that it fits — the fixed side padding is V1's rule
        const col = box.closest('.sp2-two-r');
        if (!col) throw new Error('the drawing is not beside the table');
        if (svg.getBoundingClientRect().width > col.getBoundingClientRect().width + 1)
          throw new Error('the rig spills past its column');
        // the drawing has a card of its own, built like the table's, and it
        // takes the band's height \u2014 whichever of the two is taller
        const card = col.querySelector('.sp2-rig-box');
        if (!card) throw new Error('the drawing has no box of its own');
        const cs2 = getComputedStyle(card);
        if (parseFloat(cs2.borderTopWidth) < 1) throw new Error('the drawing\u2019s box has no rim');
        if (parseFloat(cs2.borderRadius) <= 0) throw new Error('the drawing\u2019s box has square corners');
        const tbl = document.querySelector('.sp2-ln.on .sp2-two-l .sp2-ct');
        if (!tbl) throw new Error('there is no compartment card to measure against');
        const mid = card.querySelector('.sp2-rig-mid') || card;
        const cb = mid.getBoundingClientRect(), tb = tbl.getBoundingClientRect();
        const outer = card.getBoundingClientRect();
        if (Math.abs(outer.height - Math.max(tb.height, svg.getBoundingClientRect().height)) > 2)
          throw new Error('the box is ' + Math.round(outer.height) + 'px against a ' +
                          Math.round(tb.height) + 'px table');
        // and the truck sits in the middle of it, both ways
        const sb = svg.getBoundingClientRect();
        if (Math.abs((sb.top - cb.top) - (cb.bottom - sb.bottom)) > 2)
          throw new Error('the truck is not centred down the box');
        if (Math.abs((sb.left - cb.left) - (cb.right - sb.right)) > 2)
          throw new Error('the truck is not centred across the box');
      } else {
        // when the compartments are already at their floor the rig cannot give
        // back the full padding; it just must not spill past the lane
        const atFloor = svg.getBoundingClientRect().width >= box.clientWidth - 2 * TK_SIDE_PAD - 2;
        if (!atFloor && Math.abs(slack - 2 * TK_SIDE_PAD) > 6)
          throw new Error('leaves ' + Math.round(slack / 2) + 'px a side, not ' + TK_SIDE_PAD);
        if (slack < -2) throw new Error('the rig spills past the lane by ' + Math.round(-slack) + 'px');
      }
      // the tractor is flipped about its own middle, and drawn first
      const flipped = [...svg.querySelectorAll('g')].some(g => /scale\(-1,1\)/.test(g.getAttribute('transform') || ''));
      if (!flipped) throw new Error('the tractor is not mirrored');
      const cab = svg.querySelector('image[href^="data:"]').getBoundingClientRect();
      const tank = svg.querySelector('.sp2-sv-liq, .sp2-sv-p, .sp2-sv-c').getBoundingClientRect();
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
      // V2 made the lane two cards standing on a white column, so the lift
      // belongs to the cards; the lane itself is only the row that holds them
      const lifts = V2 ? [...on.querySelectorAll(':scope > .sp2-ln-drv, :scope > .sp2-ln-day')]
                       : [on];
      if (V2 && lifts.length !== 2) throw new Error('the lane is not two cards');
      lifts.forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.boxShadow === 'none') throw new Error('no shadow on the chosen lane');
        const bg = cs.backgroundColor.match(/\d+/g).map(Number);
        if (Math.min(bg[0], bg[1], bg[2]) < 250)
          throw new Error('the chosen lane is still tinted: ' + cs.backgroundColor);
      });
      if (V2) {
        // and the column they stand on is white, not a band
        const col = getComputedStyle(document.querySelector('.sp2-col-unit')).backgroundColor;
        const c = col.match(/\d+/g).map(Number);
        if (Math.min(c[0], c[1], c[2]) < 255) throw new Error('the lane column is not white: ' + col);
      }
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
        // the reading lives in the card's head now, as a pill beside the order
        // number, and it is there whatever the list is sorted by
        if (V2 && !c.querySelector('.sp2-card-top .sp2-fit'))
          throw new Error('an unplanned card carries no reading against the rig');
        if (!V2 && !c.querySelector('.sp2-fit'))
          throw new Error('an unplanned card has no fit on it');
      });
      // a planned order is already on a truck; fit means nothing for it
      sp2SetQuick('planned');
      if (document.querySelector('.sp2-card .sp2-fit'))
        throw new Error('a planned order still carries a fit');
      sp2SetQuick('unplanned');
    });
    step('the fit is the number a drop would really give', () => {
      // a rig with room for it, since a rig at its tanks now refuses the drop
      const planned = x => SP2_ORDERS.filter(y => y.driver === x).reduce((a, y) => a + sp2Gal(y), 0);
      const k = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k)
        .find(x => SP2_ORDERS.some(y => !y.driver && sp2Gal(y) <= sp2RigCap(x) - planned(x)));
      if (!k) throw new Error('no rig in the day has room for an unplanned order');
      sp2PickDriver(k);
      const room0 = sp2RigCap(k) - planned(k);
      const o = SP2_ORDERS.filter(x => !x.driver && sp2Gal(x) <= room0)[0];
      const said = sp2FitFor(k, o);
      const before = sp2Cells(k).reduce((s, c) => s + c.l.q, 0);
      sp2Drag = o.id;
      sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => o.id } }, 'auto', -1, k);
      const loaded = sp2Cells(k).reduce((s, c) => s + c.l.q, 0) - before;
      if (loaded !== said.fits)
        throw new Error('said ' + said.fits + ' gal would fit, ' + loaded + ' actually went on');
      sp2UnplanOrder({ stopPropagation(){} }, k, o.id);
    });
    if (V2) step('every product the catalogue carries can be drawn', () => {
      // a compartment whose product has no colour was drawn empty, which is
      // how a truck holding 7,750 gal of REC90 looked bare
      const missing = SP2_PRODS.concat(Object.keys(SP2_BLENDS))
        .filter(p => !SP2_PROD_COLORS[p]);
      if (missing.length)
        throw new Error(missing.length + ' products have no fill: ' + missing.slice(0, 4).join(', '));
      if (typeof sp2ProdCol !== 'function') throw new Error('there is no fallback fill');
      if (sp2ProdCol('nothing like a product') === 'transparent')
        throw new Error('an unknown product still draws as nothing');
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
      unloadRig(k);
      SP2_TRUCKS[SP2_DRIVERS[k].truck].comps.forEach((c, i) => {
        SP2_DRIVERS[k].load[i].p = 'UNL87'; SP2_DRIVERS[k].load[i].q = c.cap;
      });
      const o = SP2_ORDERS.filter(x => !x.driver)[0];
      if (sp2FitFor(k, o).fits !== 0) throw new Error('a full rig still claims room');
      unloadRig(k);
    });
    step('the fit follows the rig it is measured against', () => {
      sp2SetQuick('unplanned');
      sp2PickDriver('d0');
      // V2 reads the fit from the model, not the card — the card no longer
      // carries it, and the figure still has to answer to the chosen rig
      if (V2) {
        const o = SP2_ORDERS.filter(x => !x.driver)[0];
        const a2 = sp2FitFor('d0', o), b2 = sp2FitFor('d2', o);
        if (!a2 || !b2) throw new Error('the fit cannot be measured');
        if (a2.rigPct === b2.rigPct && a2.pct === b2.pct)
          throw new Error('the fit did not change with the driver');
        return;
      }
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
    step(V2 ? 'a lane gives the shift, and the hours one hover away'
            : 'every lane carries the four Samsara clocks', () => {
      const lanes = [...document.querySelectorAll('.sp2-ln')];
      if (!lanes.length) throw new Error('no lanes on screen');
      if (V2) {
        lanes.forEach(l => {
          const k = l.dataset.k, d = SP2_DRIVERS[k];
          // at rest the lane says who, when, and what is left — nothing else
          const shift = l.querySelector('.sp2-ln-shift');
          if (!shift) throw new Error(d.name + ' does not say when the shift runs');
          if (shift.textContent.trim() !== sp2ShiftLabel(d.shift))
            throw new Error(d.name + ' reads ' + shift.textContent.trim() + ' for a shift');
          const left = l.querySelector('.sp2-ln-left');
          if (!left) throw new Error(d.name + ' does not say how much shift is left');
          const st = sp2ShiftState(d);
          const want = d.state === 'off-duty' ? 'Off duty' : st.note;
          if (left.textContent.trim() !== want)
            throw new Error(d.name + ' reads ' + left.textContent.trim() + ', not ' + want);
          // the clocks are in the card behind the shift, and shut until hovered
          const card = l.querySelector('.sp2-hv-card');
          if (!card) throw new Error(d.name + ' has no card behind the shift');
          if (getComputedStyle(card).visibility !== 'hidden')
            throw new Error(d.name + ' shows the card before it is hovered');
          // and it can be reached: a bridge across the gap under the trigger,
          // and a held-open window on the way out
          if (!getComputedStyle(card, '::before').height.startsWith('10'))
            throw new Error(d.name + '\u2019s card has a dead gap under the trigger');
          if (!/visibility 0s/.test(getComputedStyle(card).transition))
            throw new Error(d.name + '\u2019s card snaps shut rather than holding');
          const hos = card.querySelector('.sp2-hos');
          if (!hos) throw new Error(d.name + ' has no clocks behind the shift');
          if (hos.querySelectorAll('.sp2-hos-c').length !== 4)
            throw new Error(d.name + ' shows ' + hos.querySelectorAll('.sp2-hos-c').length + ' clocks, not 4');
          if (hos.textContent.indexOf('Samsara') < 0)
            throw new Error('the clocks do not say where the numbers come from');
          // and the card carries the way into the record
          const cta = card.querySelector('.sp2-hv-cta');
          if (!cta) throw new Error(d.name + ' has no way into the detail page');
          // nothing about the hours is on the lane itself
          if (l.querySelector(':scope > .sp2-ln-drv > .sp2-hos'))
            throw new Error(d.name + ' still carries a strip on the lane');
        });
        // the numbers shown are the numbers in the pull
        const k = lanes[0].dataset.k, h = SP2_DRIVERS[k].hos;
        const shown = [...lanes[0].querySelectorAll('.sp2-hos-c-v')].map(e => e.textContent);
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
          // the binding clock is marked inside the card behind the shift
          const cell = lane.querySelectorAll('.sp2-hv-card .sp2-hos-c')[['brk','drv','shf','cyc'].indexOf(bind)];
          if (!cell) throw new Error(SP2_DRIVERS[k].name + ' has no clocks to mark');
          if (!cell.classList.contains('bind'))
            throw new Error(SP2_DRIVERS[k].name + ' is ' + bind + '-limited and the clock is not marked');
          return;
        }
        const cell = lane.querySelectorAll('.sp2-hos-c')[['brk','drv','shf','cyc'].indexOf(bind)];
        if (!cell.classList.contains('bind'))
          throw new Error(SP2_DRIVERS[k].name + ' is ' + bind + '-limited and the clock is not marked');
      });
      // and a rested driver has nothing underlined
      const rested = Object.keys(SP2_DRIVERS).filter(k => sp2HosWorst(SP2_DRIVERS[k].hos) === 'ok')[0];
      const rl = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === rested);
      if (rl && rl.querySelector('.sp2-hos-c.bind'))
        throw new Error(SP2_DRIVERS[rested].name + ' is clear of every limit but a clock is marked');
    });
    step(V2 ? 'the card behind the shift opens the driver record'
            : 'view detail opens the HOS side sheet', () => {
      const mid = Object.keys(SP2_DRIVERS).find(k => SP2_DRIVERS[k].state === 'driving' &&
        SP2_SHIFTS[SP2_DRIVERS[k].shift].from < SP2_NOW);
      const lane = [...document.querySelectorAll('.sp2-ln')].find(l => l.dataset.k === mid);
      // V2 moved the way in: the strip itself is a read-out inside the hover
      // card, and the record opens from that card's CTA or the lane's chevron
      if (V2) lane.querySelector('.sp2-hv-cta').click();
      else lane.querySelector('.sp2-hos').click();
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
        // V2 says it in the load band's foot ("3 products · 2 in a blend")
        // rather than as a sixth pill in the head; the round-3 card says it
        // on the line itself, because its table lists what was ordered
        // the round-3 card says it on the line itself when its table is open,
        // and on the summary line when it is shut — either way, every place an
        // order's products are listed says when one of them is a blend
        const badged = !V2 ? !!c.querySelector('.sp2-pill-blend')
          : c.classList.contains('sp2-v3')
            ? !!(c.querySelector('.sp2-lt.blended') || c.querySelector('.sp2-lsum .sp2-pill-blend'))
          : /in a blend/.test(c.querySelector('.sp2-load-n').textContent);
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
      unloadRig(k);
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      sp2SetDrvFilter('available');
    });
    step('a card moves only when asked', () => {
      sp2SetDrvFilter('available');
      const lanes = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k);
      const k = lanes[0];
      sp2PickDriver(k);
      // V2 swapped the Move link for six dots beside the driver — the shape a
      // row that can be moved has everywhere else
      if (V2) {
        const grip = document.querySelector('.sp2-ln.on .sp2-grip');
        if (!grip) throw new Error('no way to move the card by hand');
        if (document.querySelector('.sp2-ln.on .sp2-ln-truck').textContent.match(/Move/))
          throw new Error('the Move link is still there beside the grip');
      } else if (!document.querySelector('.sp2-ln.on .sp2-ln-truck').textContent.match(/Move/)) {
        throw new Error('no way to move the card by hand');
      }
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
      unloadRig(k);
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
;
    if (V2) step('the day has work small enough to try on most of the fleet', () => {
      // The orders are cut to fill whole rigs, so without re-cutting a few of
      // them "Fill the rest" would only ever fire on an empty truck. The pool
      // has to carry work that fits a part-loaded one, on most of the fleet.
      const on = Object.keys(SP2_DRIVERS).filter(k => SP2_DRIVERS[k].state !== 'off-duty');
      const able = on.filter(k => sp2Suggest(k, 1).picks.length);
      if (able.length < 15)
        throw new Error('only ' + able.length + ' drivers can be offered anything, not 15');
      // and it is not all empty rigs — a part-loaded one has to be offered something
      const part = able.filter(k => {
        const f = sp2RigFill(k);
        return f.pct > 10 && f.pct < 95;
      });
      if (part.length < 4)
        throw new Error('only ' + part.length + ' part-loaded rigs are offered anything');
      // nothing was invented to make this true: every suggestion is a real
      // unplanned order out of the day's own pool
      able.forEach(k => {
        sp2Suggest(k, 3).picks.forEach(o => {
          if (SP2_ORDERS.indexOf(o) < 0) throw new Error(o.id + ' is not one of the day\u2019s orders');
          if (o.driver) throw new Error(o.id + ' is offered and already planned');
        });
      });
    });

    if (V2) step('the open lane offers what would fill the rest of the rig', () => {
      sp2SetDrvFilter('all');
      const k = Object.keys(SP2_DRIVERS).find(x => SP2_DRIVERS[x].truck === 'HV-13');
      if (!k) throw new Error('no transport to plan onto');
      const keep = JSON.parse(JSON.stringify(SP2_DRIVERS[k].load));
      const kept = SP2_ORDERS.filter(o => o.driver === k).map(o => o.id);
      unloadRig(k);
      sp2PickDriver(k);

      // the strip belongs to the lane you are working in, and sits under the rig
      const lanes = [...document.querySelectorAll('.sp2-ln')];
      const open = lanes.find(l => l.classList.contains('on'));
      if (!open) throw new Error('no lane is open');
      lanes.forEach(l => {
        if (l !== open && l.querySelector('.sp2-sg'))
          throw new Error('a shut lane carries suggestions');
      });
      const sg = open.querySelector('.sp2-sg');
      if (!sg) throw new Error('the open lane offers nothing');
      const art = open.querySelector('.sp2-sv');
      if (art && sg.getBoundingClientRect().top < art.getBoundingClientRect().bottom - 2)
        throw new Error('the suggestions are not under the drawing');

      // the table and the drawing split the band in half, whatever the width
      const band = open.querySelector('.sp2-two');
      const lw = band.querySelector('.sp2-two-l').getBoundingClientRect().width;
      const rw = band.querySelector('.sp2-two-r').getBoundingClientRect().width;
      if (Math.abs(lw - rw) > 2)
        throw new Error('the band is ' + Math.round(lw) + ' / ' + Math.round(rw) + ', not half each');

      // one heading, whatever the rig is carrying — "the rest" named no part
      // of the truck, and a rig's mix of empty and part-filled is not the
      // reader's problem
      const ttl = sg.querySelector('.sp2-sg-ttl').textContent;
      if (/the rest/i.test(ttl)) throw new Error('the heading still says "the rest"');
      if (ttl !== 'Fill the compartments with room left')
        throw new Error('the heading is not the standard statement: ' + ttl);

      const picks = [...sg.querySelectorAll('.sp2-sg-item')];
      if (!picks.length) throw new Error('an emptied transport is offered nothing');
      // each one says where the fuel lands before it is added
      // the miles are measured from the RACK, not the yard, and the minutes are
      // everything driven to get there — both show their working on hover
      picks.forEach(it => {
        const why = it.querySelector('.sp2-why');
        if (!why) throw new Error('a suggestion gives no distance or time');
        if (!/mi from the rack/.test(why.textContent))
          throw new Error('the distance is not measured from the rack: ' + why.textContent);
        if (!/driving/.test(why.textContent)) throw new Error('it does not say the time is driving');
        if (!why.querySelector('.sp2-info')) throw new Error('there is no info icon');
        const card = why.querySelector('.sp2-why-card');
        if (!card) throw new Error('the info icon explains nothing');
        if (getComputedStyle(card).visibility !== 'hidden')
          throw new Error('the explanation is open before it is asked for');
        if (getComputedStyle(card, '::before').height === 'auto')
          throw new Error('the explanation has a dead gap under the icon');
        const legs = [...card.querySelectorAll('.sp2-why-row:not(.tot)')];
        if (legs.length < 2) throw new Error('the working does not show the legs');
        if (!/rack/.test(legs[0].textContent))
          throw new Error('the first leg is not the hub to the rack: ' + legs[0].textContent);
        const o2 = SP2_ORDERS.filter(x => x.id === it.querySelector('.sp2-sg-id').textContent)[0];
        if (legs[legs.length - 1].textContent.indexOf(o2.ship) < 0)
          throw new Error('the last leg does not reach this ship-to');
        // the legs add up to the total the card states
        const sum = legs.reduce((a, r) => a + parseFloat(r.querySelector('b').textContent), 0);
        const tot = parseFloat(card.querySelector('.sp2-why-row.tot').textContent);
        if (Math.abs(sum - tot) > 0.15)
          throw new Error('the legs make ' + sum.toFixed(1) + ', the total says ' + tot);
      });

      picks.forEach(it => {
        const to = it.querySelector('.sp2-sg-to');
        if (!to) throw new Error('a suggestion does not say where it goes');
        if (!/Rig at \d+%/.test(to.textContent)) throw new Error('it does not say where the rig lands');
        // the product as well as the compartment: a product only goes in beside
        // its own or into an empty tank, so which product it is decides this
        if (!/ into /.test(to.textContent))
          throw new Error('it does not name the product and the compartment: ' + to.textContent);
        const o3 = SP2_ORDERS.filter(x => x.id === it.querySelector('.sp2-sg-id').textContent)[0];
        const named = to.querySelector('.sp2-sg-to-c').textContent.split(' \u00b7 ')
          .map(x => x.split(' into ')[0]);
        named.forEach(pn => {
          if (!sp2Lines(o3).some(l => l.p === pn) && !o3.prods.some(pr => pr.p === pn))
            throw new Error(o3.id + ' does not carry ' + pn);
        });
        if (!/compartment/i.test(to.title)) throw new Error('the hover does not spell it out');
      });
      // a suggestion is an act, not a label — each one carries its own Add
      picks.forEach(it => {
        const add = it.querySelector('.sp2-sg-add');
        if (!add) throw new Error('a suggestion has no way to add it');
        if (add.tagName !== 'BUTTON') throw new Error('Add is not a button');
        if (add.textContent.trim() !== 'Add') throw new Error('the act is not named "Add"');
      });

      // every suggestion has to be a WHOLE order that this driver can run
      const cells = sp2Cells(k).map(c => ({ cap: c.cap, p: c.l.p, q: c.l.q }));
      picks.forEach(btn => {
        const id = btn.querySelector('.sp2-sg-id').textContent;
        const o = SP2_ORDERS.filter(x => x.id === id)[0];
        if (!o) throw new Error(id + ' is not an order');
        if (o.driver) throw new Error(id + ' is already planned on somebody');
        const trial = cells.map(c => ({ cap: c.cap, p: c.p, q: c.q }));
        if (sp2PackSim(trial, o) < sp2Gal(o))
          throw new Error(id + ' would have to be split to go on');
        const why = sp2CanRun(k, o);
        if (why) throw new Error(id + ' cannot be run: ' + why);
        if (sp2WinClash(o, k))
          throw new Error(id + ' clashes with the shift and is still offered');
      });

      // and taking one actually loads it, into the compartments it named
      const firstId = picks[0].querySelector('.sp2-sg-id').textContent;
      // "UNL87 into C2 \u00b7 UNL89 into C3" \u2014 every compartment it names, once
      const saidRaw = picks[0].querySelector('.sp2-sg-to-c').textContent;
      if (!/ into /.test(saidRaw))
        throw new Error('the preview does not say which product goes where: ' + saidRaw);
      const saidNames = saidRaw.split(' \u00b7 ').map(x => x.split(' into ')[1]);
      const said = saidNames.length === 1 ? saidNames[0] : saidNames.join(', ');
      const was = sp2Cells(k).map(c => c.l.q);
      const before = sp2RigFill(k).pct;
      picks[0].querySelector('.sp2-sg-add').click();
      const grew = sp2Cells(k)
        .map((c, i) => (c.l.q > was[i] ? sp2CompName(c.u, c.i) : null)).filter(Boolean);
      // what it named has to be what grew, however the names were grouped
      const flat = x => x.replace(/ and /g, ', ').split(/,\s*/).filter(Boolean).sort().join(',');
      if (!/\d+ compartments/.test(said) && flat(said) !== flat(sp2CompList(grew)))
        throw new Error('it said ' + said + ' and filled ' + sp2CompList(grew));
      const o1 = SP2_ORDERS.filter(x => x.id === firstId)[0];
      if (o1.driver !== k) throw new Error(firstId + ' was offered but not planned');
      if (sp2RigFill(k).pct <= before) throw new Error('taking a suggestion did not load the rig');

      // a full rig is offered nothing, and says so rather than going blank
      sp2Render();
      const sg2 = document.querySelector('.sp2-ln.on .sp2-sg');
      if (!sg2) throw new Error('the strip disappeared once the rig filled');
      if (!sg2.querySelectorAll('.sp2-sg-item').length && !sg2.querySelector('.sp2-sg-none'))
        throw new Error('nothing is offered and nothing says why');

      // put the lane back as it was
      SP2_ORDERS.forEach(o => { if (o.driver === k && kept.indexOf(o.id) < 0) o.driver = ''; });
      SP2_ORDERS.forEach(o => { if (kept.indexOf(o.id) >= 0) o.driver = k; });
      SP2_DRIVERS[k].load = keep;
      sp2Render();
    });

    if (V2) step('a planned rig runs four or five ship-tos, in its own region', () => {
      // the docs: "typical 3–4 deliveries per shift", and the consolidated
      // Corpus Christi day runs 4.0 stops per load
      const planned = Object.keys(SP2_DRIVERS)
        .filter(k => SP2_ORDERS.some(o => o.driver === k));
      if (planned.length < 8) throw new Error('only ' + planned.length + ' rigs have a day planned');
      const overfilled = [];
      planned.forEach(k => {
        const d = SP2_DRIVERS[k];
        const mine = SP2_ORDERS.filter(o => o.driver === k);
        const stops = new Set(mine.map(o => o.ship));
        if (stops.size < 4 || stops.size > 5)
          throw new Error(d.name + ' runs ' + stops.size + ' ship-tos, not four or five');

        // a driver owns a region; a Denver rig does not deliver in Tampa
        mine.forEach(o => {
          if (!sp2InRegion(d.hub, o.addr))
            throw new Error(d.name + ' out of ' + d.hub + ' is sent to ' + o.ship);
        });

        // and the run has to fit the rig it is on \u2014 bar the one rig the day
        // deliberately plans past its tanks, so the banner and the split are
        // on screen without a dispatcher having to break something first
        const gal = mine.reduce((a, o) => a + sp2Gal(o), 0);
        if (gal > sp2RigCap(k)) overfilled.push(k);
      });
      // exactly one, on purpose \u2014 two would be a packing bug, none would hide
      // the banner, its readings and the split
      if (overfilled.length !== 1)
        throw new Error(overfilled.length + ' rigs are planned past their tanks, not one');
      if (!sp2Overload(overfilled[0]))
        throw new Error('the overfilled rig does not read as overloaded');

      // the day carries all three readings, or the timeline proves nothing
      const kinds = {};
      planned.forEach(k => sp2Route(k).forEach(r => { kinds[r.kind] = (kinds[r.kind] || 0) + 1; }));
      ['ok', 'early', 'late'].forEach(x => {
        if (!kinds[x]) throw new Error('no stop in the day reads "' + x + '"');
      });
    });

    if (V2) step('an order card states its load and opens for the detail', () => {
      sp2SetQuick('all');
      sp2SetSort('time');
      sp2CardOpen = {};
      sp2RenderTimeline();

      // at rest every card is shut, and says what it is carrying in one line
      const cards = [...document.querySelectorAll('.sp2-card')];
      if (!cards.length) throw new Error('no order cards');
      if (document.querySelector('.sp2-card .sp2-lt'))
        throw new Error('a card opens with its table showing');
      const card = cards[0];
      const id = card.dataset.id;
      const o = SP2_ORDERS.filter(x => x.id === id)[0];
      const sum = card.querySelector('.sp2-lsum');
      if (!sum) throw new Error('a shut card does not state its load');
      const n = sp2Lines(o).length;
      if (sum.querySelector('.sp2-lsum-n').textContent.trim() !== n + ' product' + (n === 1 ? '' : 's'))
        throw new Error('the summary miscounts the products');
      if (sum.querySelector('.sp2-lsum-q').textContent.trim() !== sp2Totals(o).join(' \u00b7 '))
        throw new Error('the summary and the table disagree on the total');

      // the line carries no chevron \u2014 the line itself is the control
      if (sum.querySelector('svg'))
        throw new Error('the summary line still wears an icon');

      // shut, the line is the card's last band, so its wash turns the corner
      // with the card instead of ending square inside it
      const rad = getComputedStyle(sum);
      ['borderBottomLeftRadius', 'borderBottomRightRadius'].forEach(k => {
        if (parseFloat(rad[k]) < 4)
          throw new Error('the shut line\u2019s wash has a square ' + k.replace('border', '').replace('Radius', '') + ' corner');
      });
      ['borderTopLeftRadius', 'borderTopRightRadius'].forEach(k => {
        if (parseFloat(rad[k]) > 0)
          throw new Error('the line is rounded at the top, where the card is not');
      });

      // opening it keeps the line exactly where it was, at the same size, and
      // hangs the table off it
      const shutH = card.getBoundingClientRect().height;
      const cb0 = card.getBoundingClientRect(), sb0 = sum.getBoundingClientRect();
      const was = { t: sb0.top - cb0.top, l: sb0.left - cb0.left, w: sb0.width, h: sb0.height };
      sum.click();
      const open = document.querySelector('.sp2-card[data-id="' + id + '"]');
      const tbl = open.querySelector('.sp2-lt');
      if (!tbl) throw new Error('opening a card does not show the table');
      const sum2 = open.querySelector('.sp2-lsum');
      if (!sum2) throw new Error('the line left with the chevron');
      if (sum2.querySelector('svg'))
        throw new Error('the open line grew an icon');
      // open, the table carries the card's bottom edge, so the line is square
      if (parseFloat(getComputedStyle(sum2).borderBottomLeftRadius) > 0)
        throw new Error('the open line keeps a rounded corner mid-card');
      const cb1 = open.getBoundingClientRect(), sb1 = sum2.getBoundingClientRect();
      const now2 = { t: sb1.top - cb1.top, l: sb1.left - cb1.left, w: sb1.width, h: sb1.height };
      Object.keys(was).forEach(k => {
        if (Math.abs(was[k] - now2[k]) > 1)
          throw new Error('the clickable line moved or resized on opening (' + k + ': ' +
                          Math.round(was[k]) + ' \u2192 ' + Math.round(now2[k]) + ')');
      });
      if (sum2.querySelector('.sp2-lsum-q').textContent.trim() !== sp2Totals(o).join(' \u00b7 '))
        throw new Error('the open line drops the total');
      if (tbl.querySelectorAll('.sp2-lt-row').length !== n)
        throw new Error('the table does not draw every line');
      if (open.getBoundingClientRect().height <= shutH)
        throw new Error('an open card is no taller than a shut one');
      // the same line shuts it again
      sum2.click();
      if (document.querySelector('.sp2-card[data-id="' + id + '"] .sp2-lt'))
        throw new Error('it did not shut again');

      // and one act does the lot, the icon saying which way it will go
      const all = document.getElementById('sp2AllBtn');
      if (!all) throw new Error('there is no expand-all');
      if (!/Expand/.test(all.title)) throw new Error('with all shut it does not offer to expand');
      // the column tool wears the same pair as the cards it acts on
      if (all.querySelectorAll('circle').length !== 3)
        throw new Error('expand-all is not the three-line icon');
      all.click();
      if ([...document.querySelectorAll('.sp2-card')].some(c => !c.querySelector('.sp2-lt')))
        throw new Error('expand all left a card shut');
      if (!/Collapse/.test(all.title)) throw new Error('with all open it does not offer to collapse');
      if (all.querySelectorAll('circle').length !== 1)
        throw new Error('collapse-all is not the one-line icon');
      all.click();
      if (document.querySelector('.sp2-card .sp2-lt'))
        throw new Error('collapse all left a card open');

      // the horizontal view has to give a shut card room too
      sp2SetView('h');
      [...document.querySelectorAll('.sp2-card')].forEach(c => {
        const lane = c.closest('.sp2-lane');
        if (lane && c.getBoundingClientRect().bottom > lane.getBoundingClientRect().bottom + 2)
          throw new Error('a shut card hangs out of its lane');
      });
      sp2SetView('v');
      sp2SetQuick('unplanned');
    });

    if (V2) step('the presets each ask a question of both columns', () => {
      // a preset narrows the orders and the rigs together; an order list means
      // nothing without the rigs it could go on
      if (sp2Views.length < 5)
        throw new Error('only ' + sp2Views.length + ' presets to open the planner with');
      const was = sp2ViewOn;
      const seen = {};
      sp2Views.forEach(v => {
        if (seen[v.name]) throw new Error('two presets are called ' + v.name);
        seen[v.name] = 1;
        sp2VrPick(v.id);
        const os = sp2Visible(), ds = sp2DriverKeys();
        if (!os.length) throw new Error(v.name + ' shows no orders at all');
        if (!ds.length) throw new Error(v.name + ' shows no drivers at all');
        // every facet the preset sets has to be one the panel actually has
        Object.keys(v.state.facet).forEach(key => {
          const f = SP2_FACETS.filter(x => x.k === key)[0];
          if (!f) throw new Error(v.name + ' sets a facet nobody has: ' + key);
          if (f.opts) v.state.facet[key].forEach(val => {
            if (f.opts.indexOf(val) < 0)
              throw new Error(v.name + ' asks ' + key + ' for "' + val + '", which is not an option');
          });
        });
      });

      // Planned is the orders somebody has taken, and only those
      const planned = sp2Views.filter(v => v.name === 'Planned')[0];
      if (!planned) throw new Error('there is no Planned preset');
      sp2VrPick(planned.id);
      const shown = sp2Visible();
      if (!shown.length) throw new Error('Planned shows nothing');
      shown.forEach(o => {
        if (!o.driver) throw new Error(o.id + ' has no driver and is in Planned');
      });
      const missing = SP2_ORDERS.filter(o => o.driver && shown.indexOf(o) < 0);
      if (missing.length)
        throw new Error(missing.length + ' orders have a driver and are not in Planned');

      sp2VrPick(was);
    });

    if (V2) step('a planned order says whose it is, and the rig\u2019s own come first', () => {
      const wasDrv = sp2Driver, wasView = sp2ViewOn;
      sp2VrPick('vPlanned');
      // a preset narrows both columns, so both have to be drawn again
      if (document.querySelectorAll('.sp2-card').length !== sp2Visible().length)
        throw new Error('picking a preset left the orders column showing the list before it');
      const k = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k)
        .find(x => SP2_ORDERS.filter(o => o.driver === x).length >= 2);
      if (!k) throw new Error('no driver has two orders to float');
      sp2PickDriver(k);
      const seq = sp2Visible();
      const his = SP2_ORDERS.filter(o => o.driver === k).length;
      if (seq.length <= his) throw new Error('nothing else is in the list to rank against');
      seq.slice(0, his).forEach(o => {
        if (o.driver !== k)
          throw new Error(o.id + ' is not on ' + k + ' and is above the orders that are');
      });
      seq.slice(his).forEach(o => {
        if (o.driver === k) throw new Error(o.id + ' is on the selected rig and sits below the rest');
      });

      // and the card carries the driver: avatar, name, rig, between the window
      // and the products
      const card = document.querySelector('.sp2-card[data-id="' + seq[0].id + '"]');
      const row = card.querySelector('.sp2-ord-drv');
      if (!row) throw new Error('a planned card does not say whose order it is');
      const d = SP2_DRIVERS[k];
      if (row.textContent.indexOf(d.name) < 0) throw new Error('it does not name the driver');
      if (row.textContent.indexOf(d.truck) < 0) throw new Error('it does not name the rig');
      if (!row.querySelector('.sp2-av')) throw new Error('the driver has no avatar on the card');
      const win = card.querySelector('.sp2-win').getBoundingClientRect();
      const prod = card.querySelector('.sp2-lsum,.sp2-lt').getBoundingClientRect();
      const rb = row.getBoundingClientRect();
      if (rb.top < win.bottom - 1) throw new Error('the driver sits above the window');
      if (rb.bottom > prod.top + 1) throw new Error('the driver sits below the products');
      // an unplanned order has nobody, so it says nobody
      sp2VrPick('vAvail');
      if (document.querySelector('.sp2-card .sp2-ord-drv'))
        throw new Error('an unplanned card carries a driver');
      sp2VrPick(wasView);
      sp2PickDriver(wasDrv);
    });

    if (V2) step('the filter panel says which list it is filtering', () => {
      // an underline and a weight change were too quiet for the choice the
      // whole panel hangs on
      sp2FpToggle({ stopPropagation(){} });
      const tabs = [...document.querySelectorAll('.sp2-fp-tab')];
      if (tabs.length < 2) throw new Error('the panel has ' + tabs.length + ' lists to filter');
      if (!tabs[0].closest('.sp2-fp-seg'))
        throw new Error('the lists are not one control');
      const on = tabs.filter(t => t.classList.contains('on'));
      if (on.length !== 1) throw new Error(on.length + ' lists read as selected');
      // and it runs the width of the panel, the lists sharing it equally
      const seg = tabs[0].closest('.sp2-fp-seg');
      const panel = document.getElementById('sp2Fp');
      const sw = seg.getBoundingClientRect().width, pw = panel.getBoundingClientRect().width;
      if (pw - sw > 24)
        throw new Error('the control is ' + Math.round(sw) + 'px in a ' + Math.round(pw) + 'px panel');
      const widths = tabs.map(t => t.getBoundingClientRect().width);
      if (Math.max(...widths) - Math.min(...widths) > 2)
        throw new Error('the lists do not share the control equally');
      const off = tabs.find(t => !t.classList.contains('on'));
      const a = getComputedStyle(on[0]), b2 = getComputedStyle(off);
      if (a.backgroundColor === b2.backgroundColor)
        throw new Error('the selected list is not filled');
      if (/rgba\(0, 0, 0, 0\)|transparent/.test(a.backgroundColor))
        throw new Error('the selected list has no fill at all');
      if (a.color === b2.color) throw new Error('the selected list reads in the same ink');
      // and it moves with the choice \u2014 the panel redraws, so read it again
      const want = off.textContent.trim();
      off.click();
      const after = [...document.querySelectorAll('.sp2-fp-tab')];
      const nowOn = after.filter(t => t.classList.contains('on'));
      if (nowOn.length !== 1) throw new Error(nowOn.length + ' lists read as selected at once');
      if (nowOn[0].textContent.trim() !== want)
        throw new Error('clicking a list selected ' + nowOn[0].textContent.trim());
      after[0].click();
      sp2FpClose && sp2FpClose();
      document.getElementById('sp2Fp').classList.remove('on');
    });

    if (V2) step('both columns carry the same two tools', () => {
      // whatever one column can do to itself, the other can too
      const ords = document.querySelector('.sp2-col-orders .sp2-tools-r');
      const drvs = document.querySelector('.sp2-col-unit .sp2-tools-r');
      if (!ords || !drvs) throw new Error('a column has no tools');
      [['orders', ords], ['drivers', drvs]].forEach(([which, box]) => {
        const pop = box.querySelector('[onclick*="sp2PopOut"]');
        if (!pop) throw new Error(which + ' cannot be opened in its own window');
        if (pop.getAttribute('onclick').indexOf(which) < 0)
          throw new Error(which + '\u2019s pop-out opens the wrong column');
      });

      // and the lanes collapse the way the cards do, by the same icon
      const lb = document.getElementById('sp2LaneAllBtn');
      if (!lb) throw new Error('the driver column has no expand-all');
      if (!/Collapse/.test(lb.title)) throw new Error('lanes start open, so it should offer to collapse');
      if (lb.querySelectorAll('circle').length !== 1)
        throw new Error('collapse-all is not the one-line icon');
      const lanes = () => [...document.querySelectorAll('.sp2-ln')];
      if (!lanes().length) throw new Error('no lanes to collapse');
      const tall = lanes()[0].getBoundingClientRect().height;
      lb.click();
      if (document.querySelector('.sp2-ln .sp2-rt,.sp2-ln .sp2-ln-stops'))
        throw new Error('a collapsed lane still shows its day');
      if (!lanes().every(l => l.querySelector('.sp2-ln-truck')))
        throw new Error('a collapsed lane dropped its rig');
      if (lanes()[0].getBoundingClientRect().height >= tall)
        throw new Error('collapsing the lanes saved no height');
      if (!/Expand/.test(lb.title)) throw new Error('shut, it does not offer to expand');
      if (lb.querySelectorAll('circle').length !== 3)
        throw new Error('expand-all is not the three-line icon');
      lb.click();
      if (lanes()[0].getBoundingClientRect().height !== tall)
        throw new Error('expanding did not put the lanes back');
    });

    if (V2) step('the planner opens on a rig that can still be planned', () => {
      // It opened on the one rig the day plans past its tanks, where nothing
      // can be added: every order read "No room" and no split was on offer,
      // because none is possible there.
      const k0 = sp2Driver;
      const r0 = sp2RigRoom(k0);
      if (r0.over)
        throw new Error('the planner opens on a rig that is ' + r0.over + ' gal over capacity');
      if (!r0.free)
        throw new Error('the planner opens on a rig with no room to plan into');
      // and the over-committed rig is still there, with its banner and its split
      const over = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k)
        .filter(x => sp2RigRoom(x).over);
      if (!over.length) throw new Error('no rig in the day is over capacity any more');
      const lane0 = document.querySelector('.sp2-ln[data-k="' + over[0] + '"]');
      if (!lane0.querySelector('.sp2-over-warn')) throw new Error('it draws no banner');
      if (!lane0.querySelector('.sp2-over-s'))
        throw new Error('the order that broke it cannot be split');
    });

    if (V2) step('the planner opens on the lane it has selected', () => {
      // the selected lane was the eleventh of twenty: the outline said one
      // thing and the screen showed ten other rigs
      const sel = document.querySelector('.sp2-ln.on');
      if (!sel) throw new Error('no lane is selected');
      const host = document.getElementById('sp2V2');
      if (typeof sp2ShowSelected !== 'function')
        throw new Error('nothing brings the selected lane into view');
      host.scrollTop = 0;
      sp2ShowSelected();                       // what startup does
      const a = sel.getBoundingClientRect(), b = host.getBoundingClientRect();
      if (a.top > b.bottom - 40 || a.bottom < b.top + 40)
        throw new Error('the selected lane opens ' + Math.round(a.top - b.top) + 'px from the top of a ' +
                        Math.round(b.height) + 'px column');
      // and since that lane is the one over capacity, so is its banner
      if (sp2Overload(sel.dataset.k) && !sel.querySelector('.sp2-over-warn'))
        throw new Error('the lane is over capacity and draws no banner');
    });

    if (V2) step('the day shows a rig planned past its tanks', () => {
      // the banner, its readings and the split are all behind one state; a day
      // that never reaches it hides the lot
      const over = [...document.querySelectorAll('.sp2-ln')]
        .map(l => l.dataset.k).filter(k => !!sp2Overload(k));
      if (!over.length) throw new Error('no rig in the day is over capacity');
      const lane = document.querySelector('.sp2-ln[data-k="' + over[0] + '"]');
      if (!lane.querySelector('.sp2-over-warn')) throw new Error('the lane does not draw the banner');
      if (!lane.querySelector('.sp2-over-row')) throw new Error('the banner lists nothing');
      if (!lane.querySelector('.sp2-over-s'))
        throw new Error('nothing in the day can be split, so the split cannot be seen');
    });

    if (V2) step('an order too big for the room left can be split', () => {
      // fill a rig past its capacity, then split the one order the rig could
      // take part of: what fits stays, the rest becomes its own order
      sp2SetDrvFilter('available');
      // Build the state outright rather than inheriting whatever the run has
      // done to the day: one rig, one compartment part-filled with a product,
      // and one order of that product bigger than the rig. The order breaks
      // capacity AND the rig has room for part of it, which is the case a
      // split is for.
      const k = [...document.querySelectorAll('.sp2-ln')][0].dataset.k;
      sp2PickDriver(k);
      SP2_ORDERS.filter(x => x.driver === k).forEach(x => { x.driver = ''; });
      unloadRig(k);
      const cells0 = sp2Cells(k);
      const P = cells0[0].l.p || 'UNL87';
      cells0[0].l.p = P;
      cells0[0].l.q = Math.round(cells0[0].cap / 2);
      const grow = SP2_ORDERS.filter(x => !x.driver && x.prods.length === 1)[0];
      if (!grow) throw new Error('no unplanned order to work with');
      const wasProds = JSON.parse(JSON.stringify(grow.prods));
      grow.prods = [{ p:P, q: sp2RigCap(k) + 500 }];
      grow.driver = k;
      sp2RenderUnit();
      const lane = () => document.querySelector('.sp2-ln[data-k="' + k + '"]');
      const btn = lane().querySelector('.sp2-over-s');
      if (!btn) throw new Error('no order on this rig can be split');
      const row = btn.closest('.sp2-over-row');
      const id = row.querySelector('.sp2-over-id').textContent.trim();
      const o = SP2_ORDERS.filter(x => x.id === id)[0];

      // the split is offered only where there is room for part of it
      [...lane().querySelectorAll('.sp2-over-row')].forEach(r => {
        const rid = r.querySelector('.sp2-over-id').textContent.trim();
        const ro = SP2_ORDERS.filter(x => x.id === rid)[0];
        const can = sp2SplitPlan(k, ro).fits > 0;
        if (can !== !!r.querySelector('.sp2-over-s'))
          throw new Error(rid + (can ? ' can be split and is not offered it'
                                     : ' cannot be split and is offered it'));
      });
      // one line forking into two: three strokes out of a single point, not
      // the two crossing strokes of a shuffle
      const paths = [...btn.querySelectorAll('path')].map(p2 => p2.getAttribute('d'));
      if (paths.length < 3) throw new Error('the split icon is drawn with ' + paths.length + ' strokes');
      if (!paths.filter(d2 => /^M9 12/.test(d2)).length)
        throw new Error('the split icon does not fork from one stem');

      // the label waits for the cursor, like the remove beside it
      const lbl = btn.querySelector('.sp2-over-x-l');
      if (!lbl || !/Split order/.test(lbl.textContent))
        throw new Error('the split does not name itself');
      if (lbl.getBoundingClientRect().width > 2)
        throw new Error('the split label is open before it is hovered');

      const plan = sp2SplitPlan(k, o);
      const req = sp2Gal(o);
      if (!plan.fits || !plan.left) throw new Error('this order does not need splitting');

      // it says what it will do before it does it
      btn.click();
      const dlg = document.getElementById('sp2CfmScrim');
      if (!dlg.classList.contains('on')) throw new Error('splitting does not ask first');
      const said = document.getElementById('sp2CfmP').textContent;
      [req, plan.fits, plan.left].forEach(n => {
        if (said.indexOf(n.toLocaleString()) < 0)
          throw new Error('the dialog does not state ' + n.toLocaleString() + ' gal: ' + said);
      });
      if (sp2Gal(o) !== req) throw new Error('it split before the answer');

      document.getElementById('sp2CfmOk').click();
      // the number the customer was given stays on the part that ships
      const kid = SP2_ORDERS.filter(x => x.split && x.split.of === id)[0];
      if (!kid) throw new Error('the remainder did not become an order');
      if (kid.id !== id + '-2') throw new Error('the remainder is called ' + kid.id);
      if (kid.driver) throw new Error('the remainder went onto a truck by itself');
      if (sp2Gal(kid) !== plan.left)
        throw new Error('the remainder is ' + sp2Gal(kid) + ' gal, not ' + plan.left);
      if (sp2Gal(o) !== plan.fits)
        throw new Error('what stayed is ' + sp2Gal(o) + ' gal, not ' + plan.fits);
      if (sp2Gal(o) + sp2Gal(kid) !== req)
        throw new Error('the two halves do not add up to what was ordered');

      // and both say so afterwards, in the toast and on the cards
      const toast = document.getElementById('sp2Toast').textContent;
      [req, plan.fits, plan.left].forEach(n => {
        if (toast.indexOf(n.toLocaleString()) < 0)
          throw new Error('the toast does not state ' + n.toLocaleString() + ' gal: ' + toast);
      });
      if (toast.indexOf(kid.id) < 0) throw new Error('the toast does not name the new order');
      sp2SetQuick('all');
      const kidCard = document.querySelector('.sp2-card[data-id="' + kid.id + '"]');
      if (!kidCard) throw new Error('the remainder is not in the orders column');
      const pill = kidCard.querySelector('.sp2-pill-split');
      if (!pill) throw new Error('the remainder does not read as a split');
      [req, plan.fits, plan.left].forEach(n => {
        if (pill.title.indexOf(n.toLocaleString()) < 0)
          throw new Error('the pill does not account for ' + n.toLocaleString() + ' gal');
      });
      // put the day back
      SP2_ORDERS.splice(SP2_ORDERS.indexOf(kid), 1);
      grow.prods = wasProds;
      grow.driver = '';
      delete grow.split;
      unloadRig(k);
      sp2SetQuick('unplanned');
      sp2RenderUnit();
    });

    if (V2) step('ranked by fit, the list answers what fills this rig', () => {
      // One compartment half full of UNL87, one full of something else, three
      // empty. The order that tops up the UNL87 and fills an empty tank should
      // come first, and the card should say what it would do.
      sp2SetDrvFilter('all');
      const k = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k)
        .find(x => sp2Cells(x).length >= 4);
      if (!k) throw new Error('no rig with four compartments');
      sp2PickDriver(k);
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      unloadRig(k);
      const cells = sp2Cells(k);
      cells[0].l.p = 'UNL87'; cells[0].l.q = Math.round(cells[0].cap / 2);
      sp2Render();

      // the reading is about the rig, not about the sort: a driver is selected,
      // so it stands in time order too
      sp2SetSort('time');
      if (!document.querySelector('.sp2-card .sp2-fit'))
        throw new Error('the reading vanishes when the list is not ranked by it');

      sp2SetSort('fit');
      const cards = [...document.querySelectorAll('.sp2-card')];
      if (!cards.length) throw new Error('nothing in the list');
      const first = cards[0];
      if (!first.querySelector('.sp2-fit'))
        throw new Error('ranked by fit, the card does not say what the fit is');

      // every reading is the model's, and it is a percentage
      cards.slice(0, 8).forEach(c => {
        const o = SP2_ORDERS.filter(x => x.id === c.dataset.id)[0];
        if (!o || o.driver) return;
        const f = sp2FitFor(k, o);
        const said = c.querySelector('.sp2-fit');
        if (!said) throw new Error(o.id + ' carries no reading');
        // Read against the capacity that is actually free. Only an order that
        // goes on whole is a percentage of anything: one that would have to be
        // split is not 100% of the free space, and one no compartment can take
        // is not a percentage at all.
        if (!f.fits) {
          if (!/No room/.test(said.textContent))
            throw new Error(o.id + ' can load nothing and does not say so: ' + said.textContent);
          if (/%/.test(said.textContent))
            throw new Error(o.id + ' can load nothing and still shows a percentage');
        } else if (f.splits) {
          if (!/Needs a split/.test(said.textContent))
            throw new Error(o.id + ' cannot go on whole and does not say so: ' + said.textContent);
          if (/%/.test(said.textContent))
            throw new Error(o.id + ' needs a split and still shows a percentage');
        } else {
          const want = Math.round(f.total / f.room * 100);
          if (said.textContent.indexOf(want + '%') < 0)
            throw new Error(o.id + ' says "' + said.textContent.trim() + '", it takes ' + want +
                            '% of the free space');
          if (!/free space/.test(said.textContent))
            throw new Error('the reading does not say what it is of: ' + said.textContent);
          if (want > 100)
            throw new Error(o.id + ' takes more than the free space and reads as whole');
        }
        if (said.closest('.sp2-card-top') === null)
          throw new Error('the fit pill is not beside the order number');
        // and the split is a sentence in gallons, not a second percentage
        const sp = c.querySelector('.sp2-fitsplit');
        if (!!sp !== !!f.splits)
          throw new Error(o.id + (f.splits ? ' can be split and does not say so'
                                           : ' cannot be split and says it can'));
        if (sp) {
          if (sp.tagName === 'SPAN' && /pill/.test(sp.className))
            throw new Error('the split reads as a pill');
          if (sp.textContent.indexOf(f.fits.toLocaleString() + ' gal') < 0)
            throw new Error(o.id + '\u2019s split does not say the gallons: ' + sp.textContent);
          if (sp.textContent.indexOf(f.over.toLocaleString() + ' gal') < 0)
            throw new Error(o.id + '\u2019s split does not say what is left over');
          if (/%/.test(sp.textContent))
            throw new Error('the split is still a percentage: ' + sp.textContent);
        }
      });

      // a rig with room still offers splits \u2014 further down, after the matches
      if (sp2RigRoom(k).free > 0) {
        const anySplit = [...cards].some(c => c.querySelector('.sp2-fitsplit'));
        const anyBig = SP2_ORDERS.some(o2 => !o2.driver && sp2Gal(o2) > sp2RigRoom(k).free &&
                                             sp2FitFor(k, o2).fits > 0);
        if (anyBig && !anySplit)
          throw new Error('orders too big for the room left carry no split line');
      }

      // the list runs: what goes on whole, by how much of the free space it
      // takes; then what would need splitting; then what no tank can take
      const fitOf = id => sp2FitFor(k, SP2_ORDERS.filter(x => x.id === id)[0]);
      const tier = f2 => !f2.fits ? 0 : f2.splits ? 1 : 2;
      const seq = cards.map(c => c.dataset.id)
        .filter(id => { const o = SP2_ORDERS.filter(x => x.id === id)[0]; return o && !o.driver; });
      if (seq.length < 3) throw new Error('too few unplanned orders to judge the order');
      for (let i = 1; i < seq.length; i++) {
        const a = fitOf(seq[i - 1]), b2 = fitOf(seq[i]);
        if (tier(b2) > tier(a))
          throw new Error(seq[i] + ' is a better match than ' + seq[i - 1] + ' and ranks below it');
        if (tier(a) === 2 && tier(b2) === 2) {
          const pa = Math.round(a.total / a.room * 100), pb = Math.round(b2.total / b2.room * 100);
          if (pb > pa)
            throw new Error(seq[i] + ' takes ' + pb + '% of the free space and ranks below ' +
                            seq[i - 1] + ' at ' + pa + '%');
        }
      }

      // nothing may be offered that the rig has no room to be committed to
      const sg3 = document.querySelector('.sp2-ln.on .sp2-sg');
      if (sg3) {
        const rr = sp2RigRoom(k);
        const offered = [...sg3.querySelectorAll('.sp2-sg-id')].map(e => e.textContent);
        const sum = offered.reduce((a, id) =>
          a + sp2Gal(SP2_ORDERS.filter(x => x.id === id)[0] || { prods: [] }), 0);
        if (sum > rr.free)
          throw new Error('the row offers ' + sum + ' gal onto ' + rr.free + ' gal of room');
        if (rr.over && offered.length)
          throw new Error('an over-committed rig is still offered orders');
      }

      // and the rig states what is committed, what is in the tanks, and what
      // may still be added \u2014 which is the number every pill is read against
      const foot = document.querySelector('.sp2-ln.on .sp2-rig-foot');
      if (!foot) throw new Error('the rig does not say what is planned, loaded and free');
      const room = sp2RigRoom(k);
      // two readings, not three \u2014 loaded said the same as planned on every rig
      // whose orders fit, and the tanks are read in the compartment table
      if (/loaded/.test(foot.textContent))
        throw new Error('the truck box still carries a third reading');
      [[room.plan, 'planned']].forEach(([gal, word]) => {
        const el = [...foot.querySelectorAll('span')].find(x => x.textContent.indexOf(word) >= 0);
        if (!el) throw new Error('nothing says what is ' + word);
        if (el.textContent.indexOf(gal.toLocaleString() + ' gal') < 0)
          throw new Error(word + ' reads "' + el.textContent.trim() + '", the rig has ' +
                          gal.toLocaleString());
      });
      const lastEl = [...foot.querySelectorAll('span')].pop();
      if (room.over) {
        if (lastEl.textContent.indexOf('over capacity') < 0)
          throw new Error('a rig planned past its tanks does not say so: ' + lastEl.textContent);
        if (lastEl.textContent.indexOf(room.over.toLocaleString() + ' gal') < 0)
          throw new Error('it does not say by how much');
        if (/free/.test(foot.textContent))
          throw new Error('a rig with nothing to give still offers free space');
      } else {
        if (lastEl.textContent.indexOf(room.free.toLocaleString() + ' gal') < 0)
          throw new Error('free reads "' + lastEl.textContent.trim() + '", the rig has ' +
                          room.free.toLocaleString());
        if (room.plan + room.free !== room.cap)
          throw new Error('planned and free do not add up to the rig');
      }
      // the one number the column and the drop gate must agree on
      const gate = sp2RigCap(k) - SP2_ORDERS.filter(o => o.driver === k)
        .reduce((a, o) => a + sp2Gal(o), 0);
      if (room.free !== Math.max(0, gate))
        throw new Error('the column sees ' + room.free + ' gal free and the drop gate sees ' + gate);

      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      unloadRig(k);
      sp2SetSort('time');
      sp2SetDrvFilter('available');
      sp2Render();
    });

    if (V2) step('every compartment says whose gallons are in it', () => {
      // Four orders of one grade pour into the same tanks, so the table has to
      // name them or the card can say C1 holds 2,500 gal and never say who put
      // them there.
      const k = [...document.querySelectorAll('.sp2-ln')].map(l => l.dataset.k)
        .find(x => SP2_ORDERS.filter(o => o.driver === x).length >= 3 && sp2RigRoom(x).used > 0);
      if (!k) throw new Error('no loaded rig with three orders on it');
      sp2PickDriver(k);

      // the books balance: every compartment's owners sum to its gallons, and
      // every order's gallons are somewhere
      sp2Cells(k).forEach(c => {
        const sum = (c.l.by || []).reduce((a, x) => a + x.q, 0);
        if (sum !== c.l.q)
          throw new Error(sp2CompName(c.u, c.i) + ' holds ' + c.l.q + ' gal and accounts for ' + sum);
        (c.l.by || []).forEach(x => {
          const o = SP2_ORDERS.filter(y => y.id === x.id)[0];
          if (!o) throw new Error(sp2CompName(c.u, c.i) + ' names ' + x.id + ', which is not an order');
          if (o.driver !== k) throw new Error(x.id + ' is in the tanks and not on this rig');
        });
      });
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => {
        const held = sp2Cells(k).reduce((a, c) =>
          a + (c.l.by || []).filter(x => x.id === o.id).reduce((b, x) => b + x.q, 0), 0);
        if (held > sp2Gal(o))
          throw new Error(o.id + ' has ' + held + ' gal in the tanks and ordered ' + sp2Gal(o));
      });

      // and the table shows it, compartment by compartment
      const rows = [...document.querySelectorAll('.sp2-ln.on .sp2-ct-row')];
      if (!rows.length) throw new Error('the open lane has no compartment table');
      rows.forEach((r, i) => {
        const c = sp2Cells(k)[i];
        if (!c) return;
        const who = r.querySelector('.sp2-ct-who');
        const ids = sp2ByIds(c.l);
        if (!ids.length) {
          if (who) throw new Error(sp2CompName(c.u, c.i) + ' names orders it does not hold');
          return;
        }
        if (!who) throw new Error(sp2CompName(c.u, c.i) + ' does not say whose gallons it holds');
        ids.forEach(id => {
          if (who.textContent.indexOf(id) < 0)
            throw new Error(sp2CompName(c.u, c.i) + ' holds ' + id + ' and does not name it');
        });
      });

      // taking an order off takes its own gallons, not someone else's
      const first = SP2_ORDERS.filter(o => o.driver === k)[0];
      const others = SP2_ORDERS.filter(o => o.driver === k && o.id !== first.id).map(o => o.id);
      const before = {};
      others.forEach(id => {
        before[id] = sp2Cells(k).reduce((a, c) =>
          a + (c.l.by || []).filter(x => x.id === id).reduce((b, x) => b + x.q, 0), 0);
      });
      sp2UnplanOrder({ stopPropagation(){} }, k, first.id);
      others.forEach(id => {
        const now = sp2Cells(k).reduce((a, c) =>
          a + (c.l.by || []).filter(x => x.id === id).reduce((b, x) => b + x.q, 0), 0);
        if (now !== before[id])
          throw new Error('taking ' + first.id + ' off moved ' + id + '\u2019s gallons too');
      });
      if (sp2Cells(k).some(c => (c.l.by || []).some(x => x.id === first.id)))
        throw new Error(first.id + ' came off the rig and its gallons are still in a tank');
    });

    if (V2) step('a rig cannot be planned past its tanks', () => {
      // Fill a rig to its capacity one order at a time, then try to add more.
      // The planner does not take it and go red: it says what the room is, and
      // the only way more goes on is a split.
      sp2SetDrvFilter('all');
      const k = [...document.querySelectorAll('.sp2-ln')][0].dataset.k;
      sp2PickDriver(k);
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      unloadRig(k);
      const cap = sp2RigCap(k);
      const planned = () => SP2_ORDERS.filter(o => o.driver === k).reduce((a, o) => a + sp2Gal(o), 0);
      const put = id => {
        sp2Drag = [id];
        sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => id } },
                'auto', -1, k);
      };
      // fill it as far as whole orders go
      SP2_ORDERS.filter(o => !o.driver).forEach(o => {
        if (sp2Gal(o) <= cap - planned()) put(o.id);
        if (planned() > cap) throw new Error('it planned ' + planned() + ' onto ' + cap);
      });
      const full = planned();
      if (!full) throw new Error('nothing could be planned on an empty rig');
      if (full > cap) throw new Error('the rig is planned past its tanks');

      // now one that does not fit: it is not taken, and the room is stated
      const left = cap - full;
      const big = SP2_ORDERS.filter(o => !o.driver && sp2Gal(o) > left)[0];
      if (!big) throw new Error('nothing left that the rig has no room for');
      const t = document.getElementById('sp2Toast');
      t.textContent = ''; t.className = '';
      sp2CfmClose();
      put(big.id);
      if (big.driver === k) throw new Error(big.id + ' went on a rig with ' + left + ' gal of room');
      if (planned() !== full) throw new Error('the rig took something anyway');
      const dlg = document.getElementById('sp2CfmScrim').classList.contains('on');
      const said = dlg ? document.getElementById('sp2CfmP').textContent : t.textContent;
      if (!said) throw new Error('it refused the order and said nothing');
      if (said.indexOf(cap.toLocaleString()) < 0)
        throw new Error('it does not say what the rig holds: ' + said);

      // and if a split is on offer, taking it fills the rig rather than
      // overfilling it
      if (dlg) {
        if (!/Split/.test(document.getElementById('sp2CfmT').textContent))
          throw new Error('the dialog is not the split offer');
        document.getElementById('sp2CfmOk').click();
        if (planned() > cap)
          throw new Error('the split planned ' + planned() + ' onto ' + cap);
        if (big.driver !== k) throw new Error('the split did not put any of it on');
        const kid = SP2_ORDERS.filter(x => x.split && x.split.of === big.id)[0];
        if (!kid) throw new Error('the remainder did not become an order');
        if (kid.driver) throw new Error('the remainder went onto the rig too');
        SP2_ORDERS.splice(SP2_ORDERS.indexOf(kid), 1);
      }

      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; delete o.split; });
      unloadRig(k);
      t.textContent = ''; t.className = ''; t.style.display = 'none';
      sp2SetDrvFilter('available');
      sp2RenderUnit();
    });

    if (V2) step('an order the rig has no room for is refused, not absorbed', () => {
      // 9,000 gal onto a 2,800 gal wagon. The rig cannot be planned past its
      // tanks, so the order is not taken at all: nothing loads, nothing is
      // assigned, and the line says what the room is.
      sp2SetDrvFilter('available');
      // a rig with every compartment already spoken for: a new product has
      // nowhere to go, however much room is left inside those compartments
      const small = [...document.querySelectorAll('.sp2-ln')]
        .map(l => l.dataset.k)
        .filter(k => sp2Cells(k).length && sp2Cells(k).every(c => c.l.p))
        .sort((a, b) => sp2RigCap(a) - sp2RigCap(b))[0];
      if (!small) throw new Error('no rig has all its compartments loaded');
      const taken = {};
      sp2Cells(small).forEach(c => { taken[c.l.p] = 1; });
      const big = SP2_ORDERS.filter(o => !o.driver && sp2Lines(o).every(l => !taken[l.p]))
        .sort((a, b) => sp2Gal(b) - sp2Gal(a))[0];
      if (!big || sp2Gal(big) <= sp2RigCap(small))
        throw new Error('no order big enough to swamp ' + small);
      const cells = () => sp2Cells(small).map(c => c.l.q).join(',');
      const was = cells();
      const t = document.getElementById('sp2Toast');
      t.textContent = ''; t.className = '';
      sp2Drag = [big.id];
      sp2Drop({ preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData: () => big.id } },
              'auto', -1, small);
      if (cells() !== was) throw new Error('it loaded fuel there was no room for');
      if (big.driver === small) throw new Error('it took an order the rig cannot carry');
      const said = t.textContent;
      if (!said) throw new Error('nothing was said at all');
      if (/loaded onto/.test(said)) throw new Error('a refusal reads as a receipt: ' + said);
      if (!t.classList.contains('warn')) throw new Error('a refusal looks like any other toast');
      if (said.indexOf(sp2RigCap(small).toLocaleString()) < 0)
        throw new Error('it does not say what the rig holds');
      if (!/holding another product|is full/.test(said))
        throw new Error('it does not say why none of it can go on: ' + said);
      // and nothing has been quietly planned past the tanks
      const plannedNow = SP2_ORDERS.filter(o => o.driver === small)
        .reduce((a, o) => a + sp2Gal(o), 0);
      if (plannedNow > sp2RigCap(small))
        throw new Error('the rig is planned to ' + plannedNow + ' on ' + sp2RigCap(small));
      t.textContent = ''; t.className = ''; t.style.display = 'none';
      sp2RenderUnit();
    });

    if (V2) step('the chips say how well each order fits, and which fit best', () => {
      sp2SetDrvFilter('available');
      const lane = [...document.querySelectorAll('.sp2-ln')]
        .find(l => SP2_ORDERS.filter(o => o.driver === l.dataset.k).length >= 3);
      if (!lane) throw new Error('no lane carries three orders');
      const k = lane.dataset.k;
      const mine = SP2_ORDERS.filter(o => o.driver === k);
      const chips = [...lane.querySelectorAll('.sp2-stopw')];
      if (chips.length !== mine.length)
        throw new Error('the lane shows ' + chips.length + ' chips for ' + mine.length + ' orders');

      // every chip states its own fit, and it is the fit the model computes
      chips.forEach(c => {
        const id = c.dataset.id;
        const o = SP2_ORDERS.filter(x => x.id === id)[0];
        const said = c.querySelector('.sp2-stop-fit');
        if (!said) throw new Error(id + ' does not say how well it fits');
        if (said.textContent.trim() !== sp2OrderFit(k, o).pct + '% of truck')
          throw new Error(id + ' says ' + said.textContent.trim() + ', the rig says ' +
                          sp2OrderFit(k, o).pct + '%');
      });

      // and the marked ones are the ones that fill it best
      const best = sp2BestFits(k, mine);
      const lit = chips.filter(c => c.classList.contains('fit'));
      if (!lit.length) throw new Error('nothing is marked as the best fit');
      if (lit.length !== Object.keys(best).length)
        throw new Error(lit.length + ' chips lit for ' + Object.keys(best).length + ' best fits');
      const top = Math.max(...mine.map(o => sp2OrderFit(k, o).pct));
      lit.forEach(c => {
        const id = c.dataset.id;
        if (!best[id]) throw new Error(id + ' is lit and is not a best fit');
        if (top - sp2OrderFit(k, SP2_ORDERS.filter(x => x.id === id)[0]).pct > 2)
          throw new Error(id + ' is lit and is not within two points of the best');
      });
      // the highlight is the violet one, as every highlight is \u2014 and it has to
      // actually resolve: an undeclared token takes the whole color-mix with it
      // the violet marks the ORDER \u2014 the fit chip is busy saying how good the
      // fit is \u2014 and it has to actually resolve: an undeclared token takes the
      // whole color-mix with it
      const other = chips.find(c => !c.classList.contains('fit'));
      const pillOf = w => w.querySelector('.sp2-stop');
      const cs = getComputedStyle(pillOf(lit[0]));
      if (/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor))
        throw new Error('the best-fit tint did not resolve');
      if (cs.boxShadow === 'none') throw new Error('the best-fit order chip has no rim');
      if (other && cs.backgroundColor === getComputedStyle(pillOf(other)).backgroundColor)
        throw new Error('a best fit looks like every other chip');
      if (other && cs.boxShadow === getComputedStyle(pillOf(other)).boxShadow)
        throw new Error('the best fit carries no rim the others lack');

      // the share is of the WHOLE rig, not of the compartments it lands in:
      // three orders on one truck cannot all read 100%
      chips.forEach(c => {
        const o = SP2_ORDERS.filter(x => x.id === c.dataset.id)[0];
        const pct = sp2OrderFit(k, o).pct;
        if (pct !== Math.round(sp2Gal(o) / sp2RigCap(k) * 100))
          throw new Error(c.dataset.id + ' is not measured against the rig');
      });
      const hundreds = chips.filter(c => /^100%/.test(c.querySelector('.sp2-stop-fit').textContent));
      if (hundreds.length > 1)
        throw new Error(hundreds.length + ' orders on one truck each fill 100% of it');
      const sum = SP2_ORDERS.filter(o => o.driver === k)
        .reduce((a, o) => a + sp2OrderFit(k, o).pct, 0);
      if (!sp2Overload(k) && sum > 105)
        throw new Error('the shares add up to ' + sum + '% of a rig that is not over capacity');

      // and it is coloured by the verdict, not by nothing
      const bands = { low:0, mid:0, high:0 };
      chips.forEach(c => {
        const o = SP2_ORDERS.filter(x => x.id === c.dataset.id)[0];
        const pct = sp2OrderFit(k, o).pct;
        const want = pct > 100 ? 'low' : pct >= 40 ? 'high' : pct >= 15 ? 'mid' : 'low';
        const t = c.querySelector('.sp2-stop-fit');
        if (!t.classList.contains(want))
          throw new Error(c.dataset.id + ' at ' + pct + '% is not read as ' + want);
        bands[want]++;
      });
      // the three readings are three colours, and none of them is the chip grey
      const seen = {};
      ['low', 'mid', 'high'].forEach(b => {
        const t = document.querySelector('.sp2-stop-fit.' + b);
        if (!t) return;
        const c = getComputedStyle(t).color, bg = getComputedStyle(t).backgroundColor;
        Object.keys(seen).forEach(other => {
          if (seen[other].c === c) throw new Error(b + ' and ' + other + ' read in the same ink');
          if (seen[other].bg === bg) throw new Error(b + ' and ' + other + ' are the same fill');
        });
        seen[b] = { c, bg };
      });
      if (Object.keys(seen).length < 2)
        throw new Error('the day never shows two different fits');

      // the fit is its own chip, docked to the order's: 1px of air at the top
      // and bottom of the join, and a left edge cut to the pill's own end
      chips.forEach(c => {
        const pill = c.querySelector('.sp2-stop'), t = c.querySelector('.sp2-stop-fit');
        if (!pill.contains(t) === false) throw new Error('the fit is still inside the order chip');
        const a = pill.getBoundingClientRect(), b = t.getBoundingClientRect();
        if (Math.abs(a.height - b.height) > 1) throw new Error('the two chips are different heights');
        if (Math.abs((a.right - b.left) - 7) > 1.5)
          throw new Error('the fit chip overlaps the pill by ' + (a.right - b.left).toFixed(1) +
                          'px, not the 7px the cutout needs');
        const m = getComputedStyle(t).maskImage || getComputedStyle(t).webkitMaskImage;
        if (!m || m === 'none' || m.indexOf('radial-gradient') < 0)
          throw new Error('the fit chip has no cutout on its left edge');
        const rad = getComputedStyle(t).borderRadius;
        if (/^0px 0px 0px 0px/.test(rad) || rad.indexOf('0px') !== 0)
          throw new Error('the fit chip is rounded on the wrong side: ' + rad);
      });

      // what is over capacity is in the banner, and only there
      const cap = sp2RigCap(k);
      let run = 0;
      SP2_ORDERS.filter(o => !o.driver).forEach(o => {
        if (run > cap * 1.2) return;
        o.driver = k; run += sp2Gal(o) + cap;
      });
      sp2RenderUnit();
      const l2 = document.querySelector('.sp2-ln[data-k="' + k + '"]');
      const over = sp2Overload(k);
      if (!over) throw new Error('the rig did not go over capacity');
      const ids = [...l2.querySelectorAll('.sp2-stopw')].map(c => c.dataset.id);
      over.past.forEach(o => {
        if (ids.indexOf(o.id) >= 0) throw new Error(o.id + ' is over capacity and still chipped outside the banner');
        if (!l2.querySelector('.sp2-over-warn').textContent.match(o.id))
          throw new Error(o.id + ' is over capacity and not in the banner');
      });
      // and the fit stays outside it
      if (l2.querySelector('.sp2-over-warn .sp2-stop-fit'))
        throw new Error('the banner reads out a fit');
      SP2_ORDERS.filter(o => o.driver === k).forEach(o => { o.driver = ''; });
      unloadRig(k);
      mine.forEach(o => { o.driver = k; });
      sp2RenderUnit();
    });

    if (V2) step('the route reads point to point, and a stop can be dropped there', () => {
      sp2SetDrvFilter('available');
      const k = SP2_ORDERS.filter(o => o.driver)[0].driver;
      sp2PickDriver(k);
      const rows = [...document.querySelectorAll('.sp2-ln[data-k="' + k + '"] .sp2-rt-row')];
      if (!rows.length) throw new Error('no stops on the route');

      // no box around a stop \u2014 the dot and the thread are the whole of it
      rows.forEach(r => {
        const cs = getComputedStyle(r);
        if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')
          throw new Error('a stop is still filled: ' + cs.backgroundColor);
        if (cs.boxShadow !== 'none') throw new Error('a stop is still ringed');
        if (parseFloat(cs.borderRadius) > 0) throw new Error('a stop still reads as a box');
        if (!r.querySelector('.sp2-rt-dot')) throw new Error('a stop has no point');
      });
      // selection moved onto the point itself
      sp2PickOrder(rows[0].querySelector('.sp2-rt-id').textContent.trim());
      const sel = document.querySelector('.sp2-ln[data-k="' + k + '"] .sp2-rt-row.sel');
      if (!sel) throw new Error('picking a stop does not mark it');
      if (getComputedStyle(sel).boxShadow !== 'none') throw new Error('the picked stop is boxed again');
      const dot = getComputedStyle(sel.querySelector('.sp2-rt-dot')).backgroundColor;
      const plain = getComputedStyle(document.querySelector('.sp2-ln[data-k="' + k +
        '"] .sp2-rt-row:not(.sel) .sp2-rt-dot')).backgroundColor;
      if (dot === plain) throw new Error('the picked stop looks like every other');

      // the remove waits on the row and is reached from the stop
      const row = [...document.querySelectorAll('.sp2-ln[data-k="' + k + '"] .sp2-rt-row')][0];
      const x = row.querySelector('.sp2-rt-x');
      if (!x) throw new Error('a stop cannot be taken off from the route');
      if (parseFloat(getComputedStyle(x).opacity) > 0.01)
        throw new Error('the remove is showing before the row is hovered');
      if (row.tagName === 'BUTTON') throw new Error('a button cannot hold the remove button');
      const id = row.querySelector('.sp2-rt-id').textContent.trim();
      x.click();
      if (SP2_ORDERS.filter(o => o.id === id)[0].driver === k)
        throw new Error('removing from the route left the order on the rig');
    });

    if (V2) step('a rig is only emptied on purpose', () => {
      sp2SetDrvFilter('available');
      const k = [...document.querySelectorAll('.sp2-ln')][0].dataset.k;
      sp2PickDriver(k);
      unloadRig(k);
      sp2RenderUnit();
      const btn = () => [...document.querySelectorAll('.sp2-ln.on .sp2-link')]
        .find(b => /Unload/.test(b.textContent));
      if (btn()) throw new Error('an empty rig still offers to be unloaded');

      // put something in it and the button comes back, named for what it does
      const d = SP2_DRIVERS[k];
      d.load[0].p = 'UNL87';
      d.load[0].q = Math.min(500, SP2_TRUCKS[d.truck].comps[0].cap);
      sp2RenderUnit();
      const b = btn();
      if (!b) throw new Error('a loaded rig does not offer to be unloaded');
      if (b.textContent.trim() !== 'Unload all')
        throw new Error('the button reads "' + b.textContent.trim() + '"');

      // it asks before it throws the morning away
      b.click();
      const dlg = document.getElementById('sp2CfmScrim');
      if (!dlg.classList.contains('on')) throw new Error('it emptied the rig without asking');
      if (d.load[0].q === 0) throw new Error('it emptied the rig before the answer');
      if (!/Unload all/.test(document.getElementById('sp2CfmOk').textContent))
        throw new Error('the confirm does not name the act');
      if (!/stay planned/.test(document.getElementById('sp2CfmP').textContent))
        throw new Error('the confirm does not say what survives it');
      sp2CfmClose();
      if (d.load[0].q === 0) throw new Error('cancelling emptied it anyway');
      b.click();
      document.getElementById('sp2CfmOk').click();
      if (sp2Cells(k).some(c => c.l.q)) throw new Error('confirming did not empty it');
      if (dlg.classList.contains('on')) throw new Error('the dialog stayed up');
    });

    if (V2) step('the tank monitor reads top-down, with room of its own', () => {
      const k = sp2Driver || [...document.querySelectorAll('.sp2-ln')][0].dataset.k;
      sp2PickDriver(k);
      const d = SP2_DRIVERS[k];
      d.load[0].p = 'UNL87';
      d.load[0].q = Math.round(SP2_TRUCKS[d.truck].comps[0].cap * 0.48);
      sp2RenderUnit();
      const cell = document.querySelector('.sp2-ln.on .sp2-ct .sp2-ct-f');
      if (!cell) throw new Error('no tank monitor cell');
      const bar = cell.querySelector('.sp2-ct-bar'), pct = cell.querySelector('.sp2-ct-pct');
      if (!bar || !pct) throw new Error('the monitor is missing its bar or its reading');
      const br = bar.getBoundingClientRect(), pr = pct.getBoundingClientRect();
      if (br.bottom > pr.top + 1) throw new Error('the bar is not above the reading');
      if (Math.abs(br.left - pr.left) > 2) throw new Error('the bar and the reading are not aligned');
      // the bar now runs the column rather than fighting the number for it
      const cr = cell.getBoundingClientRect();
      if (br.width < cr.width * 0.6)
        throw new Error('the bar is ' + Math.round(br.width) + 'px in a ' + Math.round(cr.width) + 'px column');
      if (cr.right - br.right < 10)
        throw new Error('the monitor has only ' + Math.round(cr.right - br.right) + 'px on its right');
      if (parseFloat(getComputedStyle(pct).fontSize) >= parseFloat(getComputedStyle(cell.parentElement.querySelector('.sp2-ct-p')).fontSize))
        throw new Error('the reading is not the smaller text');
      // and it did not take that room from the gallons
      const gal = document.querySelector('.sp2-ln.on .sp2-ct input.sp2-cell');
      if (gal.scrollWidth > gal.clientWidth + 2) throw new Error('the gallons no longer fit');
    });

    if (V2) step('a planned order answers with its own rig, and only its own', () => {
      sp2SetQuick('planned');
      sp2SetDrvFilter('available');
      const card = document.querySelector('.sp2-card');
      if (!card) throw new Error('nothing planned to select');
      const id = card.dataset.id;
      const o = SP2_ORDERS.filter(x => x.id === id)[0];
      if (!o.driver) throw new Error('the planned list is showing an unplanned order');

      // a planned order cannot be gathered up and dragged — it is already on a rig
      [...document.querySelectorAll('.sp2-card')].forEach(c => {
        if (c.querySelector('.sp2-cbx')) throw new Error(c.dataset.id + ' still offers a tick');
      });

      card.click();
      const lanes = [...document.querySelectorAll('.sp2-ln')];
      if (lanes.length !== 1)
        throw new Error('the column still shows ' + lanes.length + ' rigs');
      if (lanes[0].dataset.k !== o.driver)
        throw new Error('the column shows the wrong rig');
      if (!lanes[0].classList.contains('on')) throw new Error("the rig's day is not open");
      if (sp2Driver !== o.driver) throw new Error('the open rig is not the order\'s');
      // and it is the whole day, not just this drop
      if (!lanes[0].querySelector('.sp2-rt-row')) throw new Error("the day's route is not shown");
      if (!lanes[0].querySelector('.sp2-ct')) throw new Error('the load is not shown');
      // the stop for THIS order reads as the selected one
      const mine = [...lanes[0].querySelectorAll('.sp2-rt-row')]
        .filter(r => r.textContent.indexOf(id) >= 0);
      if (!mine.length) throw new Error(id + ' is not a stop on its own rig');
      if (!mine[0].classList.contains('sel')) throw new Error('the stop is not marked as the one selected');

      // picking another planned order moves the column to that rig
      const other = [...document.querySelectorAll('.sp2-card')]
        .find(c => SP2_ORDERS.filter(x => x.id === c.dataset.id)[0].driver !== o.driver);
      if (other) {
        const o2 = SP2_ORDERS.filter(x => x.id === other.dataset.id)[0];
        other.click();
        const now = [...document.querySelectorAll('.sp2-ln')];
        if (now.length !== 1 || now[0].dataset.k !== o2.driver)
          throw new Error('picking another planned order did not move the column');
      }

      // an unplanned order puts the whole fleet back, because any rig might take it
      sp2SetQuick('unplanned');
      const free = document.querySelector('.sp2-card');
      if (free) {
        free.click();
        if (document.querySelectorAll('.sp2-ln').length < 2)
          throw new Error('an unplanned order still shows one rig');
      }
      // so does asking the column a question of your own
      sp2SetQuick('planned');
      document.querySelector('.sp2-card').click();
      if (document.querySelectorAll('.sp2-ln').length !== 1) throw new Error('the pin did not take');
      sp2SetDrvFilter('all');
      if (document.querySelectorAll('.sp2-ln').length < 2)
        throw new Error('the filters cannot get the fleet back');
      sp2SetDrvFilter('available');
      sp2SetQuick('unplanned');
      sp2SelOrder = null;
      sp2Render();
    });

    if (V2) step('the driver column is headed by the unified view', () => {
      sp2ResetWidth();
      const hdr = document.querySelector('.sp2-head');

      // the presets, then a control row under them
      const vr = hdr.querySelector('.sp2-vr');
      const tb = hdr.querySelector('.sp2-tools');
      const shelf = document.getElementById('sp2ShelfD');
      if (!vr || !tb || !shelf) throw new Error('a unit of the head is missing');
      if (vr.textContent.trim().indexOf('All') !== 0) throw new Error('the first tab is not All');
      if (!vr.querySelector('.sp2-vr-add')) throw new Error('there is no + View');
      if (vr.querySelector('.sp2-vr-end')) throw new Error('Export is still on the row');
      if (tb.getBoundingClientRect().top < vr.getBoundingClientRect().bottom - 1)
        throw new Error('the controls are not under the presets');
      // the planner has no header of its own any more; the date is on the row
      if (document.querySelector('.sp2-hdr')) throw new Error('the planner header is still here');
      const date = tb.querySelector('.sp2-date');
      if (!date) throw new Error('the date control is not on the row');
      const mid = e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; };
      const leftC = tb.querySelector('.sp2-tools-l');
      if (Math.abs(mid(date) - mid(leftC)) > 4) throw new Error('the date is off the control row');
      if (date.getBoundingClientRect().left < leftC.getBoundingClientRect().right)
        throw new Error('the date is not to the right of the filters');
      if (tb.getBoundingClientRect().right - date.getBoundingClientRect().right > 4)
        throw new Error('the date is not against the right edge');
      // and a preset narrows BOTH columns at once
      const both = sp2Views.filter(v => /Available orders and drivers/.test(v.name))[0];
      if (!both) throw new Error('the preset that opens the planner is gone');
      if (!(both.state.facet.ostatus || []).length || !(both.state.facet.room || []).length)
        throw new Error('the preset narrows only one column');

      // search, then Filters, then Sort — narrowing before ordering
      const ctl = [...leftC.children].map(c => c.className);
      if (ctl.length !== 3) throw new Error('the controls are ' + ctl.length + ', not three');
      if (ctl[0].indexOf('sp2-srch') < 0) throw new Error('search does not lead the controls');
      const fb = leftC.querySelector('#sp2FpBtn'), sb = leftC.querySelector('#sp2SortBtn');
      if (!fb || !sb) throw new Error('Filters and sort are not on the row');
      if (fb.getBoundingClientRect().left > sb.getBoundingClientRect().left)
        throw new Error('sort comes before Filters');
      if (tb.querySelector('[data-d],[data-s],[data-q]')) throw new Error('a quick filter is still on the row');
      if (document.getElementById('sp2GbBtn')) throw new Error('Group by is still here');
      if (typeof sp2Group !== 'undefined') throw new Error('grouping left its state behind');
      if (ctl.some(c => c.indexOf('sp2-seg') >= 0)) throw new Error('a segment is still on the row');

      // ── the filter panel narrows, and says how far before you commit
      sp2SetDrvFilter('all');
      sp2FpClear();                 // start from nothing, whatever ran before
      sp2FpToggle();
      const fp = document.getElementById('sp2Fp');
      if (getComputedStyle(fp).display === 'none') throw new Error('Filters does not open');
      // two tabs, one per list, so there is no doubt what a tick narrows
      const tabs = [...fp.querySelectorAll('.sp2-fp-tab')].map(b => b.textContent.replace(/\d+$/, '').trim());
      if (tabs.join('|') !== 'Orders|Drivers and trucks')
        throw new Error('the panel is not two tabs: ' + tabs.join('|'));
      SP2_FACETS.forEach(f => {
        const tab = (SP2_GROUP_COL[f.g] || 'drivers');
        if (tab !== (f.c || 'drivers')) throw new Error(f.label + ' is under the wrong tab');
      });
      // each tab's menu lists only its own groups
      sp2FpTabs('orders');
      if (fp.querySelectorAll('.sp2-fp-f').length !== sp2TabGroups('orders').length)
        throw new Error('the Orders tab lists the wrong groups');
      if (!/order/.test(fp.querySelector('.sp2-fp-n').textContent))
        throw new Error('the Orders tab counts rigs');
      sp2FpTabs('drivers');
      if (fp.querySelectorAll('.sp2-fp-f').length !== sp2TabGroups('drivers').length)
        throw new Error('the Drivers tab lists the wrong groups');
      if (!/rig/.test(fp.querySelector('.sp2-fp-n').textContent))
        throw new Error('the Drivers tab counts orders');
      // the menu lists the GROUPS; each group's dimensions are headed sections
      if (fp.querySelectorAll('.sp2-fp-f').length === SP2_GROUPS.length)
        throw new Error('the tabs are not splitting the groups');
      SP2_FACETS.forEach(f => {
        if (SP2_GROUPS.indexOf(f.g) < 0) throw new Error(f.label + ' is in no group');
      });
      // driver and shift are their own groups, and every group's dimensions
      // are headed inside its pane
      ['Driver', 'Shift', 'Hubs', 'Truck & trailer', 'Truck capacity'].forEach(g => {
        if (SP2_GROUPS.indexOf(g) < 0) throw new Error(g + ' is not a group');
        if (!sp2GroupFacets(g).length) throw new Error(g + ' holds no dimension');
      });
      if (sp2GroupFacets('Driver').some(f => f.k === 'shift'))
        throw new Error('shift is still mixed in with the driver');
      SP2_GROUPS.forEach(g => {
        sp2FpTabs(SP2_GROUP_COL[g] || 'drivers');
        sp2FpPick(g);
        const fs = sp2GroupFacets(g);
        if (fs.length < 2) return;                     // one dimension needs no heading
        const secs = [...fp.querySelectorAll('.sp2-fp-sec')].map(e => e.textContent.trim());
        fs.forEach(f => {
          if (secs.indexOf(f.label) < 0) throw new Error(f.label + ' has no heading in ' + g);
        });
      });

      // a rig says what it is on its own line, and a long list can be searched
      sp2FpTabs('drivers');
      sp2FpPick('Truck & trailer');
      const tk = SP2_FACETS.filter(f => f.k === 'rig')[0];
      if (!tk) throw new Error('the truck and the trailer are not one list');
      if (SP2_FACETS.some(f => f.k === 'truck' || f.k === 'trailer'))
        throw new Error('the old truck or trailer facet is still here');
      if (!tk.searchable) throw new Error('thirty rigs with no search');
      if (!fp.querySelector('.sp2-fp-srch input')) throw new Error('the search box is not drawn');
      if (!/number/.test(fp.querySelector('.sp2-fp-srch input').placeholder))
        throw new Error('the search does not say it takes a number');
      // every truck AND every trailer, each wearing which it is
      Object.keys(SP2_TRUCKS).concat(Object.keys(SP2_TRAILERS)).forEach(n => {
        if (sp2FacetOpts(tk).indexOf(n) < 0) throw new Error(n + ' is not listed');
        if (!/compartments/.test(tk.desc(n))) throw new Error(n + ' does not say what it holds');
      });
      const firstTruck = fp.querySelector('.sp2-fp-o');
      const desc = firstTruck.querySelector('.sp2-fp-o-d');
      if (!desc) throw new Error('a rig does not say what it is');
      if (!/compartments/.test(desc.textContent) || !/gal/.test(desc.textContent))
        throw new Error('the rig line misses its compartments or gallons: ' + desc.textContent);
      const kinds = [...fp.querySelectorAll('.sp2-fp-o .sp2-pill-kind')].map(e => e.textContent);
      if (kinds.indexOf('Truck') < 0) throw new Error('a truck wears no Truck pill');

      // the segment narrows the list to one kind, and All puts it back
      if (!fp.querySelector('.sp2-fp-seg')) throw new Error('there is no all/trucks/trailers segment');
      if (fp.querySelectorAll('.sp2-fp-seg .sp2-seg-btn.on').length !== 1)
        throw new Error('the segment does not open on one choice');
      if (fp.querySelector('.sp2-fp-seg .sp2-seg-btn.on').textContent !== 'All')
        throw new Error('the segment does not open on All');
      // the name is the text node; the pill is a span beside it
      const shown = () => [...fp.querySelectorAll('.sp2-fp-o .sp2-fp-o-v')]
        .map(e => e.firstChild.textContent.trim());
      sp2FpSegPick('rig', 'trailer');
      if (shown().some(v => SP2_TRUCKS[v])) throw new Error('a truck is listed under Trailers');
      if (!Object.keys(SP2_TRAILERS).every(n => shown().indexOf(n) >= 0))
        throw new Error('Trailers does not list every trailer');
      sp2FpSegPick('rig', 'truck');
      if (shown().some(v => SP2_TRAILERS[v])) throw new Error('a trailer is listed under Trucks');
      if (!Object.keys(SP2_TRUCKS).every(n => shown().indexOf(n) >= 0))
        throw new Error('Trucks does not list every truck');
      sp2FpSegPick('rig', 'all');
      // a trailer number picked on its own keeps the rigs pulling it
      const someTrl = Object.keys(SP2_TRAILERS).find(n =>
        Object.keys(SP2_DRIVERS).some(k2 => SP2_DRIVERS[k2].trailer === n));
      if (someTrl) {
        sp2FpTick('rig', someTrl); sp2FpApply();
        const got = sp2DriverKeys();
        if (!got.length) throw new Error('a trailer number matches no rig');
        got.forEach(k2 => {
          if (SP2_DRIVERS[k2].trailer !== someTrl)
            throw new Error('a rig without ' + someTrl + ' is shown');
        });
        sp2FpClear(); sp2FpToggle(); sp2FpTabs('drivers'); sp2FpPick('Truck & trailer');
      }
      sp2FpSearch('rig', 'nothing-matches-this');
      if (!fp.querySelector('.sp2-fp-none')) throw new Error('a search with no hits says nothing');
      sp2FpSearch('rig', '');

      // ── capacity is a range you slide, and it takes itself off at full width
      sp2FpTabs('drivers');
      sp2FpPick('Truck capacity');
      const cap = SP2_FACETS.filter(f => f.k === 'cap')[0];
      if (cap.kind !== 'range') throw new Error('capacity is not a range');
      if (fp.querySelectorAll('.sp2-rng-i').length !== 2) throw new Error('the range has no two ends');
      sp2FpRange('cap', 'lo', 2000);
      sp2FpRange('cap', 'hi', 8000);
      if ((sp2FpStage.cap || [])[0] !== '2000-8000') throw new Error('the range did not take');
      const want = Object.keys(SP2_DRIVERS).filter(k2 => {
        const free = sp2RigFill(k2).free; return free >= 2000 && free <= 8000; });
      sp2FpApply();
      if (sp2DriverKeys().length !== want.length)
        throw new Error('the range left ' + sp2DriverKeys().length + ' of ' + want.length);
      if (!document.querySelector('.sp2-chipf').textContent.indexOf('2,000'))
        throw new Error('the chip does not read the range');
      sp2FpToggle();
      sp2FpRange('cap', 'lo', cap.lo);
      sp2FpRange('cap', 'hi', cap.hi);
      if ((sp2FpStage.cap || []).length) throw new Error('a full-width range is still a filter');
      sp2FpApply();

      // ── a product shows the rigs that can actually take it
      const takes = SP2_FACETS.filter(f => f.k === 'takes')[0];
      sp2FpToggle();
      sp2FpTick('takes', 'Kerosene');
      sp2FpApply();
      const canTake = sp2DriverKeys();
      if (!canTake.length) throw new Error('no rig can take Kerosene');
      if (canTake.length === Object.keys(SP2_DRIVERS).length)
        throw new Error('every rig takes it — the filter says nothing');
      canTake.forEach(k2 => {
        if (takes.of(SP2_DRIVERS[k2], k2).indexOf('Kerosene') < 0)
          throw new Error(SP2_DRIVERS[k2].truck + ' cannot take Kerosene and is shown');
      });
      // a rig with no empty compartment only takes what it already carries
      const shut = Object.keys(SP2_DRIVERS).find(k2 =>
        !sp2Cells(k2).some(c => !c.l.q && c.cap > 0));
      if (shut) {
        const can = takes.of(SP2_DRIVERS[shut], shut);
        can.forEach(pr => {
          if (!sp2Cells(shut).some(c => c.l.p === pr && c.l.q < c.cap))
            throw new Error(SP2_DRIVERS[shut].truck + ' is full and still offers ' + pr);
        });
      }
      sp2FpClear();
      // on leave is a word under Hours of service, and the rigs behind it are real
      const duty = SP2_FACETS.filter(f => f.k === 'duty')[0];
      if (duty.label.indexOf('HOS') < 0) throw new Error('duty is not headed as hours of service');
      if (duty.opts.indexOf('On leave') < 0) throw new Error('On leave is not a duty');
      if (!Object.keys(SP2_DRIVERS).some(k => sp2Duty(SP2_DRIVERS[k]) === 'On leave'))
        throw new Error('nobody is on leave, so the option is a dead control');
      // the blocks above close the panel on Apply; the footer only redraws
      // while it is open, so reopen before reading it
      if (getComputedStyle(fp).display === 'none') sp2FpToggle();
      const before = sp2DriverKeys().length;
      sp2FpTabs('drivers');
      sp2FpPick('Hubs');
      const hub = SP2_DRIVERS[Object.keys(SP2_DRIVERS)[0]].hub;
      sp2FpTick('hub', hub);
      if (sp2DriverKeys().length !== before)
        throw new Error('a staged tick changed the list before Apply');
      const said = +fp.querySelector('.sp2-fp-n b').textContent;
      sp2FpApply();
      const after = sp2DriverKeys();
      if (after.length !== said)
        throw new Error('the footer promised ' + said + ' and gave ' + after.length);
      after.forEach(k => {
        if (SP2_DRIVERS[k].hub !== hub) throw new Error('a rig from another hub is still shown');
      });
      if (document.getElementById('sp2FpN').textContent !== '1')
        throw new Error('Filters does not count what is applied');

      // ── the chip shelf shows it on the column it narrows
      if (getComputedStyle(shelf).display === 'none') throw new Error('a narrowed list has no chips');
      const chip = shelf.querySelector('.sp2-chipf');
      if (!chip || chip.textContent.indexOf(hub) < 0) throw new Error('the chip does not name the value');
      chip.querySelector('.sp2-chipf-x').click();
      if (sp2DriverKeys().length !== before) throw new Error('dropping the chip did not widen the list');
      if (getComputedStyle(shelf).display !== 'none') throw new Error('the shelf stayed up with nothing on it');

      // ── a view saves the whole narrowing, and opens in it
      sp2FpToggle(); sp2FpTabs('drivers'); sp2FpPick('Hubs'); sp2FpTick('hub', hub); sp2FpApply();
      sp2VrNew();
      const sug = document.getElementById('sp2DlgI').placeholder;
      if (!sug || sug.indexOf(hub) < 0) throw new Error('the view does not name itself from the filters');
      sp2DlgSave();
      if (!sp2ViewOn) throw new Error('the view was not made active');
      if (sp2ViewDirty()) throw new Error('a just-saved view reads as changed');
      const made = sp2Views.filter(v => v.id === sp2ViewOn)[0];
      if (made.name !== sug) throw new Error('saving with an empty box did not take the suggestion');

      // All puts it back; the view tab brings it all back
      sp2VrAll();
      if (sp2ViewOn) throw new Error('All did not leave the view');
      if ((sp2Facet.hub || []).length) throw new Error('All kept the view\'s filters');
      sp2VrPick(made.id);
      if ((sp2Facet.hub || [])[0] !== hub) throw new Error('the view did not restore its filters');

      // changing anything marks it, and one press updates it
      sp2FpToggle(); sp2FpTabs('drivers'); sp2FpPick('Truck & trailer');
      sp2FpSegPick('rig', 'all');
      sp2FpTick('class', SP2_TRUCKS[SP2_DRIVERS[Object.keys(SP2_DRIVERS)[0]].truck].type);
      sp2FpApply();
      if (!sp2ViewDirty()) throw new Error('a changed view does not read as changed');
      if (!document.querySelector('.sp2-vr-wrap .sp2-vr-ico[title="Update changes"]'))
        throw new Error('a changed view offers no update');
      sp2VrUpdate(made.id);
      if (sp2ViewDirty()) throw new Error('updating did not clean the view');
      sp2VrDelete(made.id);
      if (sp2Views.some(v => v.id === made.id)) throw new Error('the view was not deleted');
      if (!sp2Views.some(v => /Available orders and drivers/.test(v.name)))
        throw new Error('deleting a view took the preset with it');

      // put the column back
      sp2FpClear();
      sp2SetDrvFilter('available');
    });

    if (V2) step('an order is filtered by what it carries and who it is for', () => {
      const fp = document.getElementById('sp2Fp');
      if (getComputedStyle(fp).display === 'none') sp2FpToggle();
      sp2FpTabs('orders');

      // ── the product list is the real catalogue, blends a small part of it
      sp2FpPick('Products');
      const pf = SP2_FACETS.filter(f => f.k === 'oprod')[0];
      if (!pf) throw new Error('there is no product filter');
      const opts = sp2FacetOpts(pf);
      if (opts.length < 20) throw new Error('only ' + opts.length + ' products are listed');
      const blends = opts.filter(v => SP2_BLENDS[v]);
      if (!blends.length) throw new Error('no blend is listed as a product');
      if (blends.length > opts.length / 4)
        throw new Error('blends are ' + blends.length + ' of ' + opts.length + ' \u2014 not a small part');
      // no ratio anywhere on the option \u2014 that belongs to the order
      if (/%|\d+\s*:\s*\d+/.test(fp.querySelector('.sp2-fp-opts').textContent))
        throw new Error('the product list names a ratio');
      if (!pf.searchable) throw new Error('a list this long has no search');

      // every product listed is one an order actually carries
      const carried = {};
      SP2_ORDERS.forEach(o => o.prods.forEach(pr => { carried[pr.p] = 1; }));
      opts.forEach(v => { if (!carried[v]) throw new Error(v + ' is on no order'); });

      // and ticking one leaves only the orders carrying it
      const pick = opts.find(v => sp2OrderCountFor(pf, v) > 0);
      sp2FpTick('oprod', pick);
      sp2FpApply();
      SP2_ORDERS.filter(o => sp2OrderMatch(o, sp2Facet)).forEach(o => {
        if (!o.prods.some(pr => pr.p === pick))
          throw new Error(o.id + ' does not carry ' + pick + ' and is shown');
      });
      sp2FpClear();

      // ── customer, ship-to and the window stand on their own in the menu
      if (getComputedStyle(fp).display === 'none') sp2FpToggle();
      sp2FpTabs('orders');
      ['Customers', 'Ship-tos', 'Delivery window'].forEach(g => {
        if (sp2TabGroups('orders').indexOf(g) < 0)
          throw new Error(g + ' is not its own group on the Orders tab');
        if (sp2GroupFacets(g).length !== 1) throw new Error(g + ' holds more than its own filter');
      });
      if (sp2GroupFacets('Order').some(f => /cust|shipto|win/.test(f.k)))
        throw new Error('one of the three is still nested under Order');
      sp2FpPick('Customers');
      const cf = SP2_FACETS.filter(f => f.k === 'cust')[0];
      const sf = SP2_FACETS.filter(f => f.k === 'shipto')[0];
      if (!cf || !sf) throw new Error('customer and ship-to are not both filters');
      if (sp2FacetOpts(cf).length >= sp2FacetOpts(sf).length)
        throw new Error('a customer is not fewer than its ship-tos');
      if (sp2FacetOpts(cf).some(v => /\u2014/.test(v)))
        throw new Error('a customer still carries its site name');
      const cust = sp2FacetOpts(cf)[0];
      sp2FpTick('cust', cust);
      sp2FpApply();
      SP2_ORDERS.filter(o => sp2OrderMatch(o, sp2Facet)).forEach(o => {
        if (sp2CustOf(o.ship) !== cust) throw new Error(o.id + ' is another customer\u2019s');
      });
      sp2FpClear();

      // ── the delivery window is a filter of its own
      if (getComputedStyle(fp).display === 'none') sp2FpToggle();
      sp2FpTabs('orders');
      sp2FpPick('Delivery window');
      const wf = SP2_FACETS.filter(f => f.k === 'win')[0];
      if (!wf) throw new Error('there is no delivery window filter');
      if (wf.opts.length < 3) throw new Error('the window bands are too few to plan against');
      // a window that straddles two bands answers with both
      const straddles = SP2_ORDERS.find(o2 => wf.ord(o2).length > 1);
      if (!straddles) throw new Error('no window spans two bands — the bands are not overlapping');
      const band = wf.opts.find(v2 => sp2OrderCountFor(wf, v2) > 0);
      sp2FpTick('win', band);
      sp2FpApply();
      const bd = SP2_WIN_BANDS.filter(b2 => b2.k === band)[0];
      SP2_ORDERS.filter(o2 => sp2OrderMatch(o2, sp2Facet)).forEach(o2 => {
        const w2 = sp2Win(o2);
        if (!(w2.from < bd.to && w2.to > bd.from))
          throw new Error(o2.id + ' does not touch ' + band + ' and is shown');
      });
      sp2FpClear();

      // ── planning is gone from the rigs
      if (SP2_GROUPS.indexOf('Planning') >= 0) throw new Error('Planning is still a group');
      if (SP2_FACETS.some(f => f.k === 'plan' || f.k === 'risk'))
        throw new Error('a planning filter is still here');
      sp2SetDrvFilter('available');
    });

    if (V2) step('a loaded driver card runs the day down a rail', () => {
      sp2SetDrvFilter('all');
      const k = Object.keys(SP2_DRIVERS)
        .find(x => SP2_ORDERS.filter(o => o.driver === x).length >= 2);
      if (!k) throw new Error('nobody has a run to show');
      sp2Render();

      // a rig with nothing on it has no route to draw
      const bare = Object.keys(SP2_DRIVERS)
        .find(x => !SP2_ORDERS.filter(o => o.driver === x).length);
      if (bare && document.querySelector('.sp2-ln[data-k="' + bare + '"] .sp2-rt'))
        throw new Error('an empty rig still draws a route');

      const card = document.querySelector('.sp2-ln[data-k="' + k + '"] .sp2-ln-drv');
      if (!card) throw new Error('no driver card');
      const rt = card.querySelector('.sp2-rt');
      if (!rt) throw new Error('a loaded driver card draws no route');

      // the route lives with the DRIVER, not with the truck
      if (document.querySelector('.sp2-ln[data-k="' + k + '"] .sp2-ln-day .sp2-rt'))
        throw new Error('the route is in the truck card');

      const rows = [...rt.querySelectorAll('.sp2-rt-row')];
      const run = sp2Route(k);
      if (!run.length) throw new Error('sp2Route says there is no run');
      if (rows.length !== Math.min(run.length, k === sp2Driver ? run.length : 5))
        throw new Error('the rail skips stops');

      let last = -1;
      rows.forEach((row, i) => {
        const r = run[i];
        // order number, expected time, and the verdict on the window
        const ship = row.querySelector('.sp2-rt-ship');
        const id = row.querySelector('.sp2-rt-id');
        const eta = row.querySelector('.sp2-rt-eta');
        const note = row.querySelector('.sp2-rt-note');
        if (!ship || ship.textContent.trim() !== r.o.ship)
          throw new Error('stop ' + i + ' does not name where it is going');
        if (!id || id.textContent.trim() !== r.o.id)
          throw new Error('stop ' + i + ' does not name its order');
        if (!eta || eta.textContent.trim() !== sp2Hhmm(r.eta))
          throw new Error(r.o.id + ' does not carry the time it is expected');
        if (!note || !note.textContent.trim())
          throw new Error(r.o.id + ' does not say whether it makes its window');
        // the ship-to leads, the time sits at the right-hand edge
        const sr = ship.getBoundingClientRect(), er = eta.getBoundingClientRect();
        if (sr.left >= er.left) throw new Error('the time is not to the right of the ship-to');
        if (sr.top > note.getBoundingClientRect().top)
          throw new Error('the order number is above the ship-to');

        // time runs DOWN the rail
        if (r.eta < last) throw new Error('the stops are out of order');
        last = r.eta;

        // the verdict has to be the arithmetic, not a decoration
        const want = r.eta + 10 < r.w.from ? 'early' : r.eta <= r.w.to ? 'ok' : 'late';
        if (want !== r.kind) throw new Error(r.o.id + ': ' + r.kind + ' but the window says ' + want);
        if (!row.classList.contains(want))
          throw new Error(r.o.id + ' is ' + want + ' and the row does not say so');
        if (want === 'ok' && !/In window/.test(note.textContent))
          throw new Error(r.o.id + ' makes its window and does not say so');
        if (want === 'late' && !/late/.test(note.textContent))
          throw new Error(r.o.id + ' misses its window and does not say so');

        // and the dot is the only colour — one fact, one form
        if (!row.querySelector('.sp2-rt-dot')) throw new Error('stop ' + i + ' has no node');
      });

      // the run has its own question: does the driver get home inside the shift
      const end = rt.querySelector('.sp2-rt-end');
      const e = sp2RunEnd(k);
      if (!end) throw new Error('the run does not say when the rig is back');
      if (end.textContent.indexOf(sp2Hhmm(e.back)) < 0)
        throw new Error('the hub time is not ' + sp2Hhmm(e.back));
      if (e.over && !end.querySelector('.sp2-rt-over'))
        throw new Error('the run ends ' + sp2Dur(e.over) + ' past the shift and does not say so');
      if (!e.over && end.querySelector('.sp2-rt-over'))
        throw new Error('a run inside its shift is flagged as over');
      // the return leg always counts, so the hub time is after the last stop
      if (e.back <= run[run.length - 1].eta)
        throw new Error('the rig is back before it left the last stop');

      // and somewhere in the day a run DOES overrun, or the line proves nothing
      if (!Object.keys(SP2_DRIVERS).some(x => { const r = sp2RunEnd(x); return r && r.over; }))
        throw new Error('no run in the day ends past its shift');

      // a stop is a way into its order
      const sel = SP2_ORDERS.filter(o => o.driver === k)[0];
      rows[0].click();
      if (sp2SelOrder !== run[0].o.id) throw new Error('a stop does not select its order');
      sp2PickOrder(sp2SelOrder);
      if (sel) sp2Render();
    });

    if (V2) step('every order card is the round-3 card', () => {
      // the new shape is given to whatever is FIRST, so the list has to be in
      // a settled order before anything is typed into it — sorted by fit, a
      // changed quantity reorders the column and the first card is somebody else
      sp2SetQuick('all');
      sp2SetSort('time');
      if (sp2BlendOnly) sp2ToggleBlend();
      const all = [...document.querySelectorAll('.sp2-card')];
      if (!all.length) throw new Error('no cards on screen');
      const other = all.filter(c2 => !c2.classList.contains('sp2-v3'));
      if (other.length)
        throw new Error(other.length + ' cards are still on the old shape');
      let c = all[0];

      // the head says which order it is, and nothing about fit
      ['.sp2-ord', '.sp2-kind', '.sp2-pill', '.sp2-chev'].forEach(sel => {
        if (!c.querySelector('.sp2-card-top ' + sel)) throw new Error(sel + ' is not in the head');
      });
      // the tick is only on what can still be dragged somewhere
      const o0 = SP2_ORDERS.filter(x => x.id === c.dataset.id)[0];
      if (!!c.querySelector('.sp2-card-top .sp2-cbx') === !!o0.driver)
        throw new Error(o0.driver ? 'a planned order carries a tick' : 'an unplanned order has no tick');
      if (c.querySelector('.sp2-card-top .sp2-open'))
        throw new Error('the head still uses the old open icon');
      // the status and the way in share the right edge
      const head = c.querySelector('.sp2-card-top');
      const pill = head.querySelector('.sp2-pill').getBoundingClientRect();
      const chev = head.querySelector('.sp2-chev').getBoundingClientRect();
      const kind = head.querySelector('.sp2-kind').getBoundingClientRect();
      if (pill.left <= kind.right) throw new Error('the status is not at the right edge');
      if (chev.left <= pill.right) throw new Error('the chevron is not last');
      if (head.getBoundingClientRect().right - chev.right > 4)
        throw new Error('the chevron is not against the card edge');
      if (c.querySelector('.sp2-who')) throw new Error('the old who-has-it chip is back');
      if (c.querySelector('.sp2-trip')) throw new Error('the run from the hub is still on the card');

      // where it goes: a pin, the name, and the address one hover away
      if (!c.querySelector('.sp2-ship-row .sp2-pin')) throw new Error('the ship-to has no pin');
      const o = SP2_ORDERS.filter(x => x.id === c.querySelector('.sp2-ord').textContent)[0];
      const tip = c.querySelector('.sp2-tip');
      if (!tip || tip.textContent !== o.addr) throw new Error('the address is not in the tooltip');
      if (getComputedStyle(tip).display !== 'none') throw new Error('the tooltip shows before it is hovered');
      if (c.innerText.indexOf(o.addr) >= 0) throw new Error('the address is still printed on the card');

      // the window reads as a time of day
      const w = c.querySelector('.sp2-win').textContent;
      if (!/^\d{1,2}:\d{2} (AM|PM) – \d{1,2}:\d{2} (AM|PM)$/.test(w))
        throw new Error('the window does not read as a clock time: ' + w);

      // the products are a SECTION of the card, not a card inside it: one rule
      // divides them from the head, and the table runs to the card's edges
      // the table is a click away at rest, so open it to read it
      if (!c.querySelector('.sp2-lt')) {
        c.querySelector('.sp2-lsum').click();
        c = document.querySelector('.sp2-card[data-id="' + c.dataset.id + '"]');
      }
      const lt0 = c.querySelector('.sp2-lt');
      if (!lt0) throw new Error('the two units are not divided');
      // the rule sits on the summary line the table hangs from
      if (parseFloat(getComputedStyle(c.querySelector('.sp2-lsum')).borderTopWidth) < 1)
        throw new Error('nothing divides the two units');
      const cs = getComputedStyle(lt0);
      ['borderTopWidth', 'borderLeftWidth', 'borderRightWidth', 'borderBottomWidth'].forEach(side => {
        if (parseFloat(cs[side]) > 0) throw new Error('the products are still boxed in a card');
      });
      if (parseFloat(cs.borderRadius) > 0) throw new Error('the products still read as a card');
      if (c.querySelector('.sp2-rule')) throw new Error('a second rule stacks on the divider');
      const cb = c.getBoundingClientRect(), tb = lt0.getBoundingClientRect();
      const inset = { left: tb.left - cb.left, right: cb.right - tb.right, bottom: cb.bottom - tb.bottom };
      Object.keys(inset).forEach(side => {
        if (inset[side] > 4)
          throw new Error('the products sit ' + Math.round(inset[side]) + 'px off the ' +
                          side + ' edge — they should run to it');
      });

      // the blend ratio is a column only when a line carries a blend
      const lt = c.querySelector('.sp2-lt');
      if (!lt) throw new Error('the lines table is missing');
      const heads = [...lt.querySelectorAll('.sp2-lt-head>span')].map(e => e.textContent);
      const racked = sp2Lines(o);
      const wantsRatio = racked.some(pr => pr.blend);
      if (wantsRatio !== (heads.indexOf('Ratio') >= 0))
        throw new Error(wantsRatio ? 'a blended order has no ratio column'
                                   : 'an order with no blend still has a ratio column');

      // the table lists what the terminal racks — a blend is its constituents,
      // one row each, every row naming its own blend and share
      const names = [...c.querySelectorAll('.sp2-lt-p')].map(e => e.innerText.trim());
      if (names.length !== racked.length)
        throw new Error('the table lists ' + names.length + ' of ' + racked.length + ' racked lines');
      racked.forEach((pr, i) => {
        if (names[i].indexOf(pr.p) < 0) throw new Error('line ' + (i + 1) + ' is not ' + pr.p);
      });
      if (wantsRatio) {
        if (!lt.classList.contains('blended')) throw new Error('the table is not in its blended shape');
        const cells = [...lt.querySelectorAll('.sp2-lt-ratio')];
        racked.forEach((pr, i) => {
          // a constituent carries its SHARE, never the blend's name — UNL87 is
          // not "E10", it is one of the two products an E10 is made from
          const want = pr.blend ? pr.pct + '%' : '—';
          if (cells[i].textContent.trim() !== want)
            throw new Error(pr.p + ' reads ' + cells[i].textContent.trim() + ', not ' + want);
          if (pr.blend && cells[i].textContent.indexOf(pr.blend) >= 0)
            throw new Error(pr.p + ' is still labelled ' + pr.blend);
          if (pr.blend && !/Blended with/.test(cells[i].title || ''))
            throw new Error(pr.p + ' does not say what it is blended with');
          // the rows of one blend are bracketed together; a straight product is not
          const bracketed = cells[i].classList.contains('g');
          if (!!pr.blend !== bracketed)
            throw new Error(pr.p + (bracketed ? ' is bracketed and is not a blend'
                                              : ' is in a blend and is not bracketed'));
          if (pr.blend) {
            const want2 = pr.n === 0 ? 'g-first' : pr.n === pr.of - 1 ? 'g-last' : 'g-mid';
            if (!cells[i].classList.contains(want2))
              throw new Error(pr.p + ' is not the ' + want2 + ' of its blend');
          }
        });
        // two blends on one order are two brackets, not one
        const firsts = cells.filter(x => x.classList.contains('g-first')).length;
        const blends = new Set(racked.filter(pr => pr.blend).map(pr => pr.src)).size;
        if (firsts !== blends) throw new Error(blends + ' blends drew ' + firsts + ' brackets');
      }

      // every racked line's quantity and type are correctable in place; the
      // product itself is not
      const cellsQ = [...c.querySelectorAll('input.sp2-cell')];
      const units = [...c.querySelectorAll('select.sp2-cell-u')];
      if (cellsQ.length !== racked.length) throw new Error('not every quantity is editable');
      if (units.length !== racked.length) throw new Error('not every line names its type');
      if (units[0].options.length < 3) throw new Error('the type picker has too few choices');
      if (units[0].value !== 'gal') throw new Error('the type does not default to gallons');
      if (c.querySelector('.sp2-lt-p input,.sp2-lt-p select'))
        throw new Error('the product name is editable and should not be');

      // the total follows what is typed, and a blend keeps its ratio
      const tot = () => document.querySelector('.sp2-card.sp2-v3 .sp2-lsum').innerText.replace(/\s+/g, ' ');
      if (tot().indexOf(sp2Gal(o).toLocaleString() + ' gal') < 0)
        throw new Error('the total does not state the order: ' + tot());
      const keep = o.prods.map(pr => pr.q);
      const row0 = racked[0];
      const cell = document.querySelector('.sp2-card.sp2-v3 input.sp2-cell');
      cell.value = '1,000'; cell.dispatchEvent(new Event('change', { bubbles: true }));
      const now = SP2_ORDERS.filter(x => x.id === o.id)[0];
      if (row0.blend) {
        // typing into a constituent moves the whole blend; its partner follows
        const after = sp2Lines(now);
        if (after[0].q !== 1000)
          throw new Error('the constituent reads ' + after[0].q + ' after 1,000 was typed');
        const grp = after.filter(l => l.src === row0.src);
        const sum = grp.reduce((a, l) => a + l.q, 0);
        grp.forEach(l => {
          if (Math.abs(Math.round(l.q / sum * 100) - l.pct) > 1)
            throw new Error(l.p + ' left the ratio: ' + Math.round(l.q / sum * 100) + '% for ' + l.pct + '%');
        });
      } else if (now.prods[row0.src].q !== 1000) {
        throw new Error('typing a quantity did not reach the order');
      }
      const want = now.prods.reduce((a, pr) => a + pr.q, 0).toLocaleString() + ' gal';
      if (tot().indexOf(want) < 0) throw new Error('the total reads ' + tot() + ', not ' + want);
      keep.forEach((q, i) => { now.prods[i].q = q; });
      sp2Render();

      // a unit that is not gallons is counted on its own, never folded in
      const u = document.querySelector('.sp2-card.sp2-v3 select.sp2-cell-u');
      u.value = 'case'; u.dispatchEvent(new Event('change', { bubbles: true }));
      if (tot().indexOf('case') < 0) throw new Error('the total ignores the unit it was given');
      const u2 = document.querySelector('.sp2-card.sp2-v3 select.sp2-cell-u');
      u2.value = 'gal'; u2.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // The bands were V2's second round and are V1's design now; V2's own card
    // is checked by its own step above.
    if (!V2) step('the card splits: who and where left, what right', () => {
      sp2SetQuick('all');
      if (sp2BlendOnly) sp2ToggleBlend();
      // the first card is the round-3 trial; the bands still govern the rest
      const card = document.querySelector(V2 ? '.sp2-card:not(.sp2-v3)' : '.sp2-card');
      const L = card.querySelector('.sp2-card-l'), R = card.querySelector('.sp2-card-r');
      if (!L || !R) throw new Error('the card is missing a band');
      if (!V2 && L.getBoundingClientRect().left >= R.getBoundingClientRect().left)
        throw new Error('the halves are the wrong way round');
      // V2 does not split side by side at all — it reads down in three bands:
      // which order it is, where it goes, what is on it.
      const head = V2 ? card.querySelector('.sp2-card-top') : L;
      ['.sp2-kind', '.sp2-ord', '.sp2-pill'].forEach(sel => {
        if (!head.querySelector(sel)) throw new Error(sel + ' is not in the head');
      });
      ['.sp2-ship', '.sp2-addr'].forEach(sel => {
        if (!L.querySelector(sel)) throw new Error(sel + ' is not in the destination band');
      });
      if (V2) {
        // unplanned: how it would fit · planned: who already has it
        if (!head.querySelector('.sp2-fit,.sp2-who'))
          throw new Error('the head says neither the fit nor who has it');
        if (!L.querySelector('.sp2-meta')) throw new Error('the window and the run are not in the band');
        if (!L.querySelector('.sp2-when')) throw new Error('the card does not state its delivery window');
        if (!L.querySelector('.sp2-trip')) throw new Error('the card does not state the run from the hub');
        if (!card.querySelector('.sp2-cbx')) throw new Error('the card cannot be picked');
        if (!card.querySelector('.sp2-open')) throw new Error('the card has no way into its sheet');
        // the bands stack, one under the next
        const tops = ['.sp2-card-top', '.sp2-card-l', '.sp2-card-r', '.sp2-load-foot']
          .map(sel => { const e = card.querySelector(sel);
                        if (!e) throw new Error(sel + ' band is missing');
                        return e.getBoundingClientRect().top; });
        tops.forEach((t, i) => {
          if (i && t <= tops[i - 1]) throw new Error('the bands do not read top to bottom');
        });
        // the load band closes with the order's total
        const tot = card.querySelector('.sp2-load-tot').textContent;
        const ord = SP2_ORDERS.filter(x => x.id === card.querySelector('.sp2-ord').textContent)[0];
        if (tot !== sp2Gal(ord).toLocaleString() + ' gal')
          throw new Error('the load band closes with ' + tot + ', not ' + sp2Gal(ord).toLocaleString() + ' gal');
      }
      if (L.querySelector(V2 ? '.sp2-prow-q' : '.sp2-prow')) throw new Error('a product is in the wrong band');
      const id = card.querySelector('.sp2-ord').textContent;
      const o = SP2_ORDERS.filter(x => x.id === id)[0];
      // a blend is two lines on the card — one per constituent — so the chips
      // are counted against what is actually racked, not against the order lines
      const want = sp2Lines(o).length;
      // V2 caps the load band: the first two, then a "+N" that opens the rest
      const cap = V2 ? Math.min(want, SP2_PROD_CAP) : want;
      const seen = R.querySelectorAll(V2 ? '.sp2-prow-q' : '.sp2-prow').length;
      if (seen !== cap) throw new Error(id + ' lists ' + seen + ' of ' + cap + ' products');
      if (V2) {
        if (R.querySelectorAll('.sp2-chip').length !== cap)
          throw new Error(id + ' does not give every shown product its own chip');
        const more = card.querySelector('.sp2-more');
        if (want > SP2_PROD_CAP) {
          if (!more) throw new Error(id + ' hides ' + (want - cap) + ' products with no way to them');
          if (more.textContent !== '+' + (want - cap))
            throw new Error(id + ' says ' + more.textContent + ', not +' + (want - cap));
          // opening re-renders the column, so the card has to be found again
          more.click();
          const re = document.querySelector('.sp2-card[data-id="' + id + '"]');
          if (!re) throw new Error(id + ' left the column when its load band opened');
          const opened = re.querySelectorAll('.sp2-prow-q').length;
          if (opened !== want) throw new Error(id + ' opened to ' + opened + ' of ' + want);
          const less = re.querySelector('.sp2-more');
          if (!less || less.textContent !== 'Show less')
            throw new Error(id + ' is open with no way to fold it back');
          less.click();
        } else if (more) {
          throw new Error(id + ' has nothing hidden but still offers a "+N"');
        }
      }
      R.querySelectorAll('.sp2-prow-q').forEach(q => {
        if (!/[\d,]+ gal/.test(q.textContent)) throw new Error('a product has no quantity');
      });
    });
    // V2 lists what was ORDERED — a blend is one line with a ratio column, and
    // the constituents the terminal racks live in the order sheet.
    if (!V2) step('a blend is one chip per constituent, not one for the pair', () => {
      sp2SetQuick('all');
      if (!sp2BlendOnly) sp2ToggleBlend();
      // V2 draws each constituent as a chip with its share beside it, so a row
      // is the chip + the share + the quantity rather than one boxed line.
      const rows = V2
        ? [...document.querySelectorAll('.sp2-card:not(.sp2-v3) .sp2-prow-b')]
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
      if (on && !on.classList.contains('sp2-v3')) {
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
      unloadRig(k);
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
      if (!V2) {
        if (!/over by/.test(warn.textContent)) throw new Error('it does not say by how much');
      } else {
        // two readings, and only those: what the tanks hold, and the surplus
        const head = warn.querySelector('.sp2-over-head');
        const cap = head.querySelector('.sp2-over-cap'), by = head.querySelector('.sp2-over-by');
        if (!cap || !by) throw new Error('the banner does not split the two readings');
        const want = 'Tank capacity: ' + sp2RigCap(k).toLocaleString() + ' gal';
        if (cap.textContent.trim() !== want)
          throw new Error('the banner reads "' + cap.textContent.trim() + '", not "' + want + '"');
        const wantBy = 'Exceeded by: ' + over.over.toLocaleString() + ' gal';
        if (by.textContent.trim() !== wantBy)
          throw new Error('the banner reads "' + by.textContent.trim() + '", not "' + wantBy + '"');
        // the fact is in ink, the surplus is in red, side by side
        if (getComputedStyle(cap).color === getComputedStyle(by).color)
          throw new Error('both readings are the same colour');
        const cb = cap.getBoundingClientRect(), bb = by.getBoundingClientRect();
        if (Math.abs(cb.top - bb.top) > 2) throw new Error('the two readings are not on one line');
        if (bb.left - cb.right < 10)
          throw new Error('only ' + Math.round(bb.left - cb.right) + 'px between the two readings');
      }
      if (!V2) {
        const fixes = warn.querySelectorAll('.sp2-fix');
        if (fixes.length < 2) throw new Error('only ' + fixes.length + ' way out offered');
        const before = sp2Overload(k).over;
        sp2TrimOrder({ stopPropagation(){} }, k, over.trim.id, over.over);
        if (sp2Overload(k)) throw new Error('cutting ' + before + ' gal did not clear the overload');
        return;
      }
      // one kind of chip in the banner: a reading you can remove, nothing else
      if (warn.querySelector('.sp2-fix,button:not(.sp2-over-act)'))
        throw new Error('the banner carries a second kind of control');
      if (typeof window.sp2SwapOrder === 'function')
        throw new Error('the swap is still reachable');

      // one order broke it, and that is the one named \u2014 listing everything
      // behind it read as "all five of these are over capacity"
      const rows = [...warn.querySelectorAll('.sp2-over-row')];
      if (!rows.length) throw new Error('nothing says which order is over');
      if (rows.length !== 1)
        throw new Error('it lists ' + rows.length + ' orders, not the one that broke it');
      if (over.past.length !== 1)
        throw new Error('the model holds ' + over.past.length + ' orders past capacity, not one');
      // and it is the stop where the running total crosses, by the clock
      const byTime = SP2_ORDERS.filter(o => o.driver === k).sort((a, b) => a.t - b.t);
      let run2 = 0, want2 = null;
      byTime.forEach(o => { run2 += sp2Gal(o); if (run2 > sp2RigCap(k) && !want2) want2 = o.id; });
      if (over.past[0].id !== want2)
        throw new Error('it names ' + over.past[0].id + ', but ' + want2 + ' is where it crosses');
      rows.forEach((r, i) => {
        const id = r.querySelector('.sp2-over-id').textContent.trim();
        if (id !== over.past[i].id) throw new Error('row ' + i + ' names ' + id);
        if (r.querySelector('.sp2-over-q').textContent.trim() !== sp2Gal(over.past[i]).toLocaleString() + ' gal')
          throw new Error(id + ' does not say what it adds');
        if (!r.querySelector('.sp2-over-x')) throw new Error(id + ' has no remove');
      });
      // they stand side by side rather than stacking down the card
      if (rows.length > 1) {
        const a = rows[0].getBoundingClientRect(), b2 = rows[1].getBoundingClientRect();
        if (Math.abs(a.top - b2.top) > 2)
          throw new Error('the orders past capacity still stack one per line');
        if (a.width > warn.getBoundingClientRect().width * 0.6)
          throw new Error('each reading is still as wide as the card');
      }
      // the gallons are never quietly rewritten \u2014 nothing cuts an order down
      if (/\bCut\b/.test(warn.textContent)) throw new Error('it still offers to cut an order');
      if (typeof window.sp2TrimOrder === 'function') throw new Error('the cut is still reachable');
      // the remove is an icon that names itself when reached for
      const x = rows[0].querySelector('.sp2-over-x');   // the remove, never the split
      const lbl = x.querySelector('.sp2-over-x-l');
      if (!lbl || !/Remove order/.test(lbl.textContent))
        throw new Error('the remove does not say what it does');
      if (lbl.getBoundingClientRect().width > 2)
        throw new Error('the label is open before it is hovered');

      // the timeline says where the day stops fitting
      const line = card.querySelector('.sp2-rt-cap');
      if (!line) throw new Error('the route does not mark the capacity breach');
      if (!/Tank capacity exceeded\. Remove orders\./.test(line.textContent))
        throw new Error('the capacity line does not read as asked: ' + line.textContent);
      const red = getComputedStyle(line).color;
      if (red === getComputedStyle(card.querySelector('.sp2-rt-hd')).color)
        throw new Error('the capacity line is not called out in red');
      // it sits where it breaks: every stop above it fits, the one below does not
      const shown = [...card.querySelectorAll('.sp2-rt-row,.sp2-rt-cap')];
      const at = shown.indexOf(line);
      if (at >= 0) {
        const rigCap = sp2RigCap(k), route = sp2Route(k);
        let run = 0;
        for (let i = 0; i < at; i++) run += sp2Gal(route[i].o);
        if (run > rigCap) throw new Error('the line sits past the stop that breaks it');
        if (at < shown.length - 1 && run + sp2Gal(route[at].o) <= rigCap)
          throw new Error('the line sits before the stop that breaks it');
      }

      // taking one off is what the row does
      const firstId = over.past[0].id;
      const wasOver = over.over;
      x.click();
      if (SP2_ORDERS.filter(o => o.id === firstId)[0].driver === k)
        throw new Error('the remove left the order on the rig');
      const after = sp2Overload(k);
      if (after && after.over >= wasOver) throw new Error('removing it did not help');
    });
    step(V2 ? 'the load is a table you balance' : 'fuel moves in the quantity you choose', () => {
      sp2PickDriver('d0');
      const d = SP2_DRIVERS.d0;
      unloadRig('d0');
      d.load[1].p = 'HO DSL'; d.load[1].q = Math.min(800, SP2_TRUCKS[d.truck].comps[1].cap);
      sp2RenderUnit();

      if (V2) {
        // moving fuel is no longer a mode: the compartments are a table and
        // the gallons are typed in place
        if (document.querySelector('.sp2-sv [onclick*="sp2CompClick"]'))
          throw new Error('the drawing still carries the two-click move');
        const t = document.querySelector('.sp2-ln.on .sp2-ct');
        if (!t) throw new Error('the open lane has no compartment table');
        const cells = [...t.querySelectorAll('input.sp2-cell')];
        if (cells.length !== sp2Cells('d0').length)
          throw new Error('the table lists ' + cells.length + ' of ' + sp2Cells('d0').length + ' compartments');
        const foot = () => t.parentElement.querySelector('.sp2-ct-foot').innerText;
        if (!/Balanced/.test(foot())) throw new Error('a settled load does not read as balanced');

        // take some out: it is held, not lost, and the card says so
        const was = d.load[1].q, take = 200;
        const type = (n, v) => {
          const el = document.querySelectorAll('.sp2-ln.on .sp2-ct input.sp2-cell')[n];
          el.value = String(v); el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        type(1, was - take);
        if (d.load[1].q !== was - take) throw new Error('typing did not reach the compartment');
        const loose = document.querySelector('.sp2-ln.on .sp2-ct-loose');
        if (!loose) throw new Error('the gallons taken out are not held anywhere');
        if (loose.textContent.indexOf(take.toLocaleString()) < 0)
          throw new Error('it holds ' + loose.textContent + ', not ' + take + ' gal');
        const sum = () => sp2Cells('d0').reduce((a, c) => a + c.l.q, 0);
        if (sum() !== was - take) throw new Error('the placed total did not drop by what came out');

        // an empty compartment names what is waiting for it
        const labels = [...document.querySelectorAll('.sp2-ln.on .sp2-ct-p')].map(e => e.innerText);
        if (!labels.some(x => /takes HO DSL/.test(x)))
          throw new Error('no compartment says what it would take');

        // a second product cannot be loosened while something is still loose
        const other = d.load.findIndex((l, i) => i !== 1 && l.q > 0);
        if (other >= 0) {
          const held = d.load[other].q;
          type(other, held - 50);
          if (d.load[other].q !== held)
            throw new Error('it loosened a second product while one was still loose');
          if (!/Place the/.test(document.getElementById('sp2Toast').textContent))
            throw new Error('it did not say why');
        }

        // put it back in by typing, and the card balances again
        type(1, was);
        if (d.load[1].q !== was) throw new Error('typing it back did not land');
        if (document.querySelector('.sp2-ln.on .sp2-ct-loose'))
          throw new Error('it still thinks something is loose');
        if (!/Balanced/.test(foot())) throw new Error('it did not read as balanced again');

        // a compartment never takes more than it holds
        const cap = SP2_TRUCKS[d.truck].comps[1].cap;
        type(1, cap + 5000);
        if (d.load[1].q > cap)
          throw new Error('C2 took ' + d.load[1].q + ' gal into a ' + cap + ' gal compartment');

        // and one press puts whatever is loose where it fits
        type(1, 0);
        if (!document.querySelector('.sp2-ln.on .sp2-ct-loose'))
          throw new Error('emptying a compartment loosened nothing');
        document.querySelector('.sp2-ln.on .sp2-ct-btn').click();
        if (document.querySelector('.sp2-ln.on .sp2-ct-loose'))
          throw new Error('"Put it where it fits" left fuel loose');

        // undo puts the whole round back
        const undo = document.querySelector('.sp2-ln.on .sp2-ct-btn.out');
        if (!undo) throw new Error('there is no way back');
        undo.click();
        if (sp2Pend) throw new Error('undo left something loose');
        return;
      }

      const from = 1, to = 0;
      const moved = { p: d.load[from].p, q: d.load[from].q };
      const stop = { stopPropagation() {}, currentTarget: document.querySelector('.sp2-sv') };
      sp2CompClick(stop, 'd0', 'truck', from);
      if (!sp2MoveFrom) throw new Error('the compartment was not picked up');
      if (!document.querySelector('.sp2-sv-held')) throw new Error('nothing shows it is held');
      sp2CompClick(stop, 'd0', 'truck', to);
      const n = document.getElementById('sp2MoveN');
      if (!n) throw new Error('it did not ask how much to move');
      if (+n.value !== Math.min(moved.q, SP2_TRUCKS[d.truck].comps[to].cap))
        throw new Error('it did not default to as much as fits');
      if (d.load[to].q) throw new Error('it moved before being told how much');
      const part = Math.round(moved.q / 4 / 50) * 50 || 50;
      sp2MoveSync(part);
      sp2DoMove('d0');
      if (d.load[to].q !== part) throw new Error('moved ' + d.load[to].q + ' gal, not ' + part);
      if (d.load[from].q !== moved.q - part) throw new Error('the source did not keep the rest');
      if (d.load[from].p !== moved.p) throw new Error('the source forgot its product');
      if (sp2MoveFrom || sp2MoveTo) throw new Error('the move did not finish');
      if (sp2MoveMax > SP2_TRUCKS[d.truck].comps[to].cap)
        throw new Error('it would allow more than the compartment holds');
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
      if (document.querySelectorAll('.sp2-col-hdr .sp2-ico-btn,.sp2-col-hdr .sp2-ico-tool').length < 2)
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
        const planned = SP2_ORDERS.some(o => o.driver === l.dataset.k);
        if (V2) {
          // what the rig IS, always; what is ON it, only when something is
          const comps = l.querySelector('.sp2-ln-comps');
          if (!comps) throw new Error('a lane does not say what the rig is');
          if (planned) {
            if (!l.querySelector('.sp2-ln-cap')) throw new Error('a loaded lane does not say how full it is');
            if (!l.querySelector('.sp2-ln-orders')) throw new Error('a loaded lane does not say how many orders');
            if (!l.querySelector('.sp2-stopw,.sp2-stop-none')) throw new Error('a loaded lane has no order chips');
          } else if (!l.classList.contains('on')) {
            if (l.querySelector('.sp2-ln-cap')) throw new Error('an empty lane still reads out 0%');
            if (l.querySelector('.sp2-ln-orders')) throw new Error('an empty lane still counts orders');
            if (!/gal/.test(comps.textContent)) throw new Error('an empty lane does not state its capacity');
            if (!l.querySelector('.sp2-ln-none')) throw new Error('an empty lane does not say planning has not started');
          }
          return;
        }
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
    // color-mix() computes to oklab(), and a colour this cannot read is a
    // layer the sweep silently skips \u2014 which is how a tinted chip gets
    // measured against the white page instead of its own fill.
    const okl = (L, A, B) => {
      const l = (L + 0.3963377774*A + 0.2158037573*B) ** 3;
      const m = (L - 0.1055613458*A - 0.0638541728*B) ** 3;
      const s2 = (L - 0.0894841775*A - 1.2914855480*B) ** 3;
      return [+4.0767416621*l - 3.3077115913*m + 0.2309699292*s2,
              -1.2684380046*l + 2.6097574011*m - 0.3413193965*s2,
              -0.0041960863*l - 0.7034186147*m + 1.7076147010*s2]
        .map(v => { const c = v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(Math.max(v, 0), 1/2.4) - 0.055;
                    return Math.min(255, Math.max(0, c*255)); });
    };
    const px = c => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m) return { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] };
      const o = c.match(/oklab\(([\d.-]+) ([\d.-]+) ([\d.-]+)(?: \/ ([\d.]+))?\)/);
      if (o) { const v = okl(+o[1], +o[2], +o[3]);
               return { r:v[0], g:v[1], b:v[2], a: o[4] === undefined ? 1 : +o[4] }; }
      return null;
    };
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
  // An escape written into MARKUP is not an escape \u2014 it is six characters of
  // text, and it overflows whatever box was sized for the glyph. Catch it
  // anywhere on the page, menus and popups included.
  document.querySelectorAll('body *').forEach(e => {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(e.tagName)) return;   // source, not text
    [...e.childNodes].forEach(n => {
      if (n.nodeType === 3 && /\\u[0-9a-fA-F]{4}/.test(n.nodeValue))
        out.layout.push('raw escape in text: "' + n.nodeValue.trim().slice(0, 30) + '"');
    });
    ['title', 'aria-label', 'placeholder'].forEach(a2 => {
      const v = e.getAttribute && e.getAttribute(a2);
      if (v && /\\u[0-9a-fA-F]{4}/.test(v))
        out.layout.push('raw escape in @' + a2 + ': "' + v.slice(0, 30) + '"');
    });
  });

  return JSON.stringify(out, null, 1);
})();
