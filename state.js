/* Turmanator per-tool field memory.
   Keeps whatever was typed into a tool page in this browser's localStorage,
   keyed by tool, so leaving for another page (or another tool) and coming
   back doesn't mean re-entering every field. Pure UI convenience: guarded
   like every other localStorage access in this project, and it never
   computes anything itself -- restoring a field replays the page's own
   change/click handlers so the verified math is always what runs.
*/
(function () {
  'use strict';

  var PREFIX = 'turmanator.state.';

  function save(key, obj) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(obj)); }
    catch (e) { /* storage unavailable or full */ }
  }
  function load(key) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // Set a <select>'s value only if that value is actually one of its options,
  // then fire the same 'change' event a user picking it would fire -- so
  // whatever the page already does on change (rebuilding dependent lists,
  // recalculating) happens exactly as it normally would.
  function setSelect(sel, val) {
    if (!sel || val === undefined || val === null) return false;
    var want = String(val);
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === want) {
        sel.value = want;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  // Same idea for a plain text/number <input>: set it and fire 'input'.
  function setText(el, val) {
    if (!el || val === undefined || val === null) return;
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Find a toggle-button/tab inside `container` by a data-attribute and
  // actually click it, so the page's own click handler runs unmodified.
  function click(container, attr, val) {
    if (!container || val === undefined || val === null) return false;
    var btn = container.querySelector('[' + attr + '="' + val + '"]');
    if (btn) { btn.click(); return true; }
    return false;
  }

  window.TState = { save: save, load: load, setSelect: setSelect, setText: setText, click: click };
})();
