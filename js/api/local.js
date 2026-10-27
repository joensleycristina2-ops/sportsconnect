// Browser-only adapter: the same rules the server applies, stored in localStorage.
(function () {
  "use strict";
  const st = SC.state, find = id => SC.all().find(x => x.id === id);
  SC.apiLocal = {
    async load() {},
    async register(name, email, pass) {
      if (st.users.some(u => u.email === email)) return { error: "That email already has an account. Sign in instead." };
      st.users.push({ name, email, hash: await SC.hash(pass) }); SC.save(); return {};
    },
    async signIn(email, pass) {
      const h = await SC.hash(pass), u = st.users.find(x => x.email === email && x.hash === h);
      if (!u) return { error: "Email or password is incorrect. Check your details or register." };
      st.user = { name: u.name, email: u.email }; SC.save(); return {};
    },
    async signOut() { st.user = null; SC.save(); },
    async join(id) {
      const a = find(id), s = SC.spots(a) > 0 ? "confirmed" : "waiting";
      st.joined[id] = s; SC.note(s === "confirmed" ? "You joined " + a.title : "You are on the waiting list for " + a.title); SC.save(); return s;
    },
    async leave(id) { const a = find(id); delete st.joined[id]; SC.note("You left " + a.title); SC.save(); },
    async createActivity(d) {
      st.created.push(Object.assign({ id: "c" + Date.now(), mine: true, joined: 1, organizer: st.user.name }, d));
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
      if (block && !st.blocked.includes(a.organizer)) st.blocked.push(a.organizer);
      SC.save();
    },
    async saveProfile(p) { st.profile = p; SC.save(); }
  };
})();
