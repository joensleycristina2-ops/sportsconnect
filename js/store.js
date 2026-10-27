(function () {
  "use strict";
  const KEY = "sportsconnect_state_v2", OLD = "sportsconnect_state_v1";
  const base = { profile: null, sessions: [], user: null, users: [], joined: {}, created: [], notes: [], blocked: [], reports: [], responded: {} };
  let saved = {};
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD);
    if (raw) saved = JSON.parse(raw);
  } catch (e) { console.warn("Could not load saved state", e); }
  SC.state = Object.assign({}, base, saved);

  SC.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(SC.state)); }
    catch (e) { console.warn("Could not save state", e); }
  };
  SC.initials = n => n.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  SC.esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  SC.toast = msg => {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(SC._t); SC._t = setTimeout(() => t.classList.remove("show"), 1800);
  };
  SC.dialog = html => {
    const d = document.getElementById("dlg");
    d.innerHTML = html + '<form method="dialog" class="dlg-close"><button class="ghost">Close</button></form>';
    d.showModal();
    return d;
  };
  SC.note = text => { SC.state.notes.unshift({ text, at: new Date().toISOString() }); };
  SC.all = () => SC.activities.concat(SC.state.created);
  SC.spots = a => a.max - a.joined - (SC.state.joined[a.id] === "confirmed" ? 1 : 0);
  SC.fmt = a => new Date(a.date + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " \u00b7 " + a.time;
  // Prototype only: accounts live in this browser's localStorage, passwords are hashed but not salted.
  SC.hash = async s => {
    try {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, "0")).join("");
    } catch (e) { return btoa(unescape(encodeURIComponent(s))); }
  };
})();
