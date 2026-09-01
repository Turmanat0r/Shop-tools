/* Turmanator job store.
   Jobs live in this browser's localStorage: no account, no server, works with
   no signal. That also means a job belongs to the device that made it, and
   clearing site data erases it -- print the sheet for anything you need to keep.

   Each tool page defines window.jobEntry(), returning:
     { title, summary: [[label, value], ...], materials: [{desc, qty, unit, lb}] }
   and drops <div id="jobbar"></div> where the bar should appear. */
(function () {
  'use strict';

  var KEY = 'turmanator.jobs.v1';
  var CURRENT = 'turmanator.job.current';

  // Every read and write is guarded: Safari private mode throws on access.
  function readAll() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      return (data && Object.prototype.toString.call(data.jobs) === '[object Array]') ? data : { seq: 1000, jobs: [] };
    } catch (e) { return { seq: 1000, jobs: [] }; }
  }
  function writeAll(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }
  function currentId() {
    try { return localStorage.getItem(CURRENT) || ''; } catch (e) { return ''; }
  }
  function setCurrentId(id) {
    try { localStorage.setItem(CURRENT, id || ''); } catch (e) { /* storage unavailable */ }
  }

  function uid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var Jobs = {
    available: (function () {
      try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; }
      catch (e) { return false; }
    })(),
    list: function () { return readAll().jobs; },
    get: function (id) {
      var jobs = readAll().jobs;
      for (var i = 0; i < jobs.length; i++) if (jobs[i].id === id) return jobs[i];
      return null;
    },
    current: function () { return this.get(currentId()); },
    setCurrent: function (id) { setCurrentId(id); },
    create: function (name) {
      var data = readAll();
      data.seq = (data.seq || 1000) + 1;
      var job = { id: String(data.seq), name: name || '', created: Date.now(), entries: [] };
      data.jobs.unshift(job);
      writeAll(data);
      setCurrentId(job.id);
      return job;
    },
    rename: function (id, name) {
      var data = readAll();
      for (var i = 0; i < data.jobs.length; i++) if (data.jobs[i].id === id) data.jobs[i].name = name;
      writeAll(data);
    },
    remove: function (id) {
      var data = readAll();
      data.jobs = data.jobs.filter(function (j) { return j.id !== id; });
      writeAll(data);
      if (currentId() === id) setCurrentId(data.jobs.length ? data.jobs[0].id : '');
    },
    // One entry per tool per save. Saving the same tool again appends a new
    // entry, so a job can hold several beams or several circuits.
    addEntry: function (jobId, tool, entry) {
      var data = readAll();
      for (var i = 0; i < data.jobs.length; i++) {
        if (data.jobs[i].id !== jobId) continue;
        data.jobs[i].entries.push({
          id: uid(), tool: tool, at: Date.now(),
          title: entry.title || tool,
          summary: entry.summary || [],
          materials: entry.materials || []
        });
        return writeAll(data);
      }
      return false;
    },
    removeEntry: function (jobId, entryId) {
      var data = readAll();
      for (var i = 0; i < data.jobs.length; i++) {
        if (data.jobs[i].id !== jobId) continue;
        data.jobs[i].entries = data.jobs[i].entries.filter(function (e) { return e.id !== entryId; });
      }
      writeAll(data);
    },
    // Everything on this device, as one plain object ready for JSON.stringify.
    // Jobs are per-device by design (see file header) -- this is the escape
    // hatch for moving them to another device by hand.
    exportData: function () {
      var data = readAll();
      return { app: 'turmanator-shop-tools', kind: 'jobs', version: 1, exportedAt: Date.now(), jobs: data.jobs };
    },
    // mode 'merge' (default) adds the imported jobs alongside what's already
    // here, renumbered so ids never collide. mode 'replace' wipes this
    // device's jobs first. Returns { ok, count }.
    importData: function (payload, mode) {
      if (!payload || Object.prototype.toString.call(payload.jobs) !== '[object Array]') {
        return { ok: false, count: 0 };
      }
      var data = (mode === 'replace') ? { seq: 1000, jobs: [] } : readAll();
      var newJobs = payload.jobs.map(function (j) {
        data.seq = (data.seq || 1000) + 1;
        var entries = Object.prototype.toString.call(j.entries) === '[object Array]' ? j.entries : [];
        return {
          id: String(data.seq),
          name: j.name || '',
          created: j.created || Date.now(),
          entries: entries.map(function (e) {
            return {
              id: uid(), tool: e.tool || '', at: e.at || Date.now(),
              title: e.title || e.tool || '', summary: e.summary || [], materials: e.materials || []
            };
          })
        };
      });
      data.jobs = newJobs.concat(data.jobs);
      var ok = writeAll(data);
      if (ok && newJobs.length) setCurrentId(newJobs[0].id);
      return { ok: ok, count: newJobs.length };
    },
    // Roll every entry's materials into one list, merged by description.
    totals: function (job) {
      var byDesc = {}, order = [], lb = 0, sticks = 0;
      (job.entries || []).forEach(function (e) {
        (e.materials || []).forEach(function (m) {
          var k = m.desc;
          if (!byDesc[k]) { byDesc[k] = { desc: k, qty: 0, unit: m.unit || '', lb: 0 }; order.push(k); }
          byDesc[k].qty += (m.qty || 0);
          byDesc[k].lb += (m.lb || 0);
          lb += (m.lb || 0);
          if ((m.unit || '') === 'stick') sticks += (m.qty || 0);
        });
      });
      return { lines: order.map(function (k) { return byDesc[k]; }), weight: lb, sticks: sticks };
    }
  };
  window.TJobs = Jobs;

  /* ---- the save bar, rendered into #jobbar if the page has one ---- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderBar() {
    var host = document.getElementById('jobbar');
    if (!host) return;
    host.innerHTML = '';

    if (!Jobs.available) {
      host.appendChild(el('div', 'jobbar-msg', 'Job saving needs browser storage, which is unavailable here.'));
      return;
    }

    var sel = el('select', 'jobbar-sel');
    sel.setAttribute('aria-label', 'Current job');
    var jobs = Jobs.list();
    var cur = currentId();
    var none = el('option', null, jobs.length ? '— no job selected —' : '— no jobs yet —');
    none.value = '';
    sel.appendChild(none);
    jobs.forEach(function (j) {
      var o = el('option', null, 'Job ' + j.id + (j.name ? ' — ' + j.name : ''));
      o.value = j.id;
      sel.appendChild(o);
    });
    var mk = el('option', null, '+ New job…');
    mk.value = '__new';
    sel.appendChild(mk);
    sel.value = Jobs.get(cur) ? cur : '';

    sel.addEventListener('change', function () {
      if (this.value === '__new') {
        var name = window.prompt('Name this job (optional)', '');
        if (name === null) { this.value = currentId(); return; }
        Jobs.create(name.trim());
      } else {
        Jobs.setCurrent(this.value);
      }
      renderBar();
    });

    var save = el('button', 'jobbar-btn', 'Save to job');
    save.type = 'button';
    var msg = el('span', 'jobbar-msg');

    save.addEventListener('click', function () {
      var job = Jobs.current();
      if (!job) { msg.textContent = 'Pick or create a job first.'; return; }
      if (typeof window.jobEntry !== 'function') { msg.textContent = 'Nothing to save on this page.'; return; }
      var entry;
      try { entry = window.jobEntry(); } catch (e) { entry = null; }
      if (!entry) { msg.textContent = 'Nothing to save yet.'; return; }
      var ok = Jobs.addEntry(job.id, entry.tool || 'tool', entry);
      msg.textContent = ok
        ? 'Saved to job ' + job.id + ' (' + (Jobs.get(job.id).entries.length) + ' items)'
        : 'Could not save — storage is full or blocked.';
      setTimeout(function () { msg.textContent = ''; }, 4000);
    });

    var link = el('a', 'jobbar-link', 'Job sheet →');
    link.href = (window.JOB_SHEET_PATH || '../job/');

    host.appendChild(sel);
    host.appendChild(save);
    host.appendChild(link);
    host.appendChild(msg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBar);
  } else {
    renderBar();
  }
  window.TJobsRenderBar = renderBar;
})();
