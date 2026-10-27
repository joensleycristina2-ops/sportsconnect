(function () {
  "use strict";
  const KEY = "sportsconnect_state_v2", OLD = "sportsconnect_state_v1";
  const base = { profile: null, sessions: [], user: null, users: [], joined: {}, created: [], notes: [], blocked: [], reports: [], responded: {}, accounts: {} };
  let saved = {};
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD);
    if (raw) saved = JSON.parse(raw);
  } catch (e) { console.warn("Could not load saved state", e); }
  SC.state = Object.assign({}, base, saved);
  // Blocks used to be stored as names; they are now { id, name } so people who share a name are not blocked together.
  const toBlock = b => typeof b === "string" ? { id: (SC.partners.find(p => p.name === b) || { id: b }).id, name: b } : b;
  SC.state.blocked = SC.state.blocked.map(toBlock);
  Object.values(SC.state.accounts).forEach(a => { a.blocked = (a.blocked || []).map(toBlock); });

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
  SC.isBlocked = a => SC.state.blocked.some(b => b.id === a.organizerId);
  SC.upcoming = a => new Date(a.date + "T" + a.time) > new Date();
  SC.fmt = a => new Date(a.date + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " \u00b7 " + a.time;
  // Prototype only: accounts live in this browser's localStorage, passwords are salted and hashed.
  // crypto.subtle only exists on secure pages (https, localhost, local files); there is no reversible fallback.
  SC.canHash = () => !!(window.crypto && crypto.subtle);
  SC.hash = async s => {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, "0")).join("");
  };
})();
