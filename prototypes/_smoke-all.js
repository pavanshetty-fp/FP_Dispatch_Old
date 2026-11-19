// Runs each screen's flow inside the combined file, one after another.
// Paste-run in the console on fleetpanda.html.
(async function () {
  const src = await (await fetch('_smoke.js')).text();
  const screens = [
    ['create', 'create-order.html'],
    ['edit',   'load-order-unassigned.html'],
    ['plan',   'shift-planner.html'],
  ];
  const results = [];
  for (const [key, as] of screens) {
    showScreen(key);
    await new Promise(r => setTimeout(r, 120));   // let the screen lay out
    window.__SMOKE_PAGE__ = as;
    results.push(JSON.parse(await eval(src)));
  }
  delete window.__SMOKE_PAGE__;

  const failed = results.flatMap(r =>
    r.steps.filter(s => s.startsWith('FAIL')).map(s => r.page + ': ' + s));
  const errored = results.flatMap(r => r.errors.map(e => r.page + ': ' + e));
  const layout  = results.flatMap(r => r.layout.map(l => r.page + ': ' + l));

  return JSON.stringify({
    screens: results.map(r => r.page + ' — ' + r.steps.length + ' steps, ' +
      r.steps.filter(s => s.startsWith('ok')).length + ' ok'),
    failed: failed.length ? failed : 'none',
    errors: errored.length ? errored : 'none',
    layout: layout.length ? layout : 'none',
  }, null, 1);
})();
