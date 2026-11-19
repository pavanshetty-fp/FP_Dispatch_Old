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
    step('timeline scrolls horizontally', () => {
      const w = document.getElementById('sp2TlWrap');
      if (w.scrollWidth <= w.clientWidth) throw new Error('nothing to scroll');
    });
    step('an order follows to its driver', () => {
      const card = [...document.querySelectorAll('.sp2-card.planned')][0];
      if (!card) throw new Error('no planned order to click');
      card.click();
      if (!document.querySelector('.sp2-card.sel')) throw new Error('selection not shown');
      if (!document.querySelector('.sp2-drv-name').textContent.trim()) throw new Error('no driver card');
    });
    step('compartments report their state', () => {
      const comps = [...document.querySelectorAll('.sp2-comp')];
      if (!comps.length) throw new Error('no compartments');
      const words = comps.map(c => c.querySelector('.sp2-comp-word').textContent);
      const ok = words.every(w => ['Full','Partially full','Empty'].indexOf(w) >= 0);
      if (!ok) throw new Error('unexpected compartment state: ' + words.join(','));
    });
    step('every driver maps to a truck', () => {
      Object.keys(SP2_DRIVERS).forEach(k => {
        sp2PickDriver(k);
        if (!document.querySelector('.sp2-truck-id')) throw new Error(k + ' has no truck');
      });
    });
  }

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
