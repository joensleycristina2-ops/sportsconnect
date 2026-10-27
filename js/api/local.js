// Browser-only adapter: the same rules the server applies, stored in localStorage.
(function () {
  "use strict";
  const st = SC.state, find = id => SC.all().find(x => x.id === id);
  // Each account (and the guest) keeps its own joins, notes, blocks and profile in this browser.
  const PER = ["profile", "sessions", "joined", "notes", "blocked", "reports", "responded"];
  const fresh = () => ({ profile: null, sessions: [], joined: {}, notes: [], blocked: [], reports: [], responded: {} });
  const insecure = { error: "Accounts need a secure page. Open the site over https or as a local file." };
  st.created.forEach(a => { if (a.mine && !a.owner && st.user) a.owner = st.user.email; if (!a.organizerId) a.organizerId = a.owner || a.organizer; });
  function switchTo(email) {
    st.accounts[st.user ? st.user.email : ""] = Object.fromEntries(PER.map(k => [k, st[k]]));
    Object.assign(st, fresh(), st.accounts[email] || {});
    st.created.forEach(a => { a.mine = !!email && a.owner === email; });
  }
  SC.apiLocal = {
    async load() {},
    async register(name, email, pass) {
      if (!SC.canHash()) return insecure;
      if (st.users.some(u => u.email === email)) return { error: "That email already has an account. Sign in instead." };
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, "0")).join("");
      st.users.push({ name, email, salt, hash: await SC.hash(salt + pass) }); SC.save(); return {};
    },
    async signIn(email, pass) {
      if (!SC.canHash()) return insecure;
      const u = st.users.find(x => x.email === email);
      if (!u || u.hash !== await SC.hash((u.salt || "") + pass)) return { error: "Email or password is incorrect. Check your details or register." };
      switchTo(u.email); st.user = { name: u.name, email: u.email }; SC.save(); return {};
    },
    async signOut() { switchTo(""); st.user = null; SC.save(); },
    async join(id) {
      const a = find(id), s = SC.spots(a) > 0 ? "confirmed" : "waiting";
      st.joined[id] = s; SC.note(s === "confirmed" ? "You joined " + a.title : "You are on the waiting list for " + a.title); SC.save(); return s;
    },
    async leave(id) { const a = find(id); delete st.joined[id]; SC.note("You left " + a.title); SC.save(); },
    async createActivity(d) {
      st.created.push(Object.assign({ id: "c" + Date.now(), mine: true, owner: st.user.email, organizerId: st.user.email, joined: 1, organizer: st.user.name }, d));
      SC.note("Activity created" + (d.invitees.length ? ", " + d.invitees.length + " invitation" + (d.invitees.length > 1 ? "s" : "") + " sent" : ""));
      SC.save(); return {};
    },
    async respond(id, accept, why) {
      const a = find(id);
      if (!accept) { st.responded[id] = "declined"; SC.note("You declined " + a.title + (why ? ": " + why : "")); SC.save(); return "declined"; }
      const s = SC.spots(a) > 0 ? "confirmed" : "waiting";
      st.responded[id] = "accepted"; st.joined[id] = s;
      SC.note(s === "confirmed" ? "You accepted the invitation to " + a.title : a.title + " is full. You are on the waiting list");
      SC.save(); return s;
    },
    async report(activityId, reason, details, block) {
      const a = find(activityId);
      st.reports.push({ activity: activityId, reason, details, at: new Date().toISOString() });
      if (block && !st.blocked.some(b => b.id === a.organizerId)) st.blocked.push({ id: a.organizerId, name: a.organizer });
      SC.save();
    },
    async unblock(id) { st.blocked = st.blocked.filter(b => b.id !== id); SC.save(); },
    async saveProfile(p) {
      st.profile = p;
      if (p.name) { st.user.name = p.name; st.users.find(u => u.email === st.user.email).name = p.name; }
      SC.save();
    }
  };
})();
