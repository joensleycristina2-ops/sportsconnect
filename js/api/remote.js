// Azure adapter: calls the Functions API. After every change it reloads the cache the views read from.
(function () {
  "use strict";
  async function call(method, path, body) {
    const r = await fetch(SC.config.apiBase + path, {
      method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 401) { SC.needLogin("Sign in first"); throw new Error("Not signed in"); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const m = data.error || "Something went wrong"; SC.toast(m); throw new Error(m); }
    return data;
  }
  async function load() {
    const d = await call("GET", "/bootstrap");
    // The server stores UTC; show each activity in the viewer's own time zone.
    SC.activities = d.activities.map(a => { const s = new Date(a.startsAt);
      return Object.assign(a, { date: s.toLocaleDateString("en-CA"), time: s.toTimeString().slice(0, 5) }); });
    Object.assign(SC.state, { user: d.user, profile: d.profile, joined: d.joined, responded: d.responded, notes: d.notes, blocked: d.blocked, created: [] });
  }
  const go = async (method, path, body) => { const r = await call(method, path, body); await load(); return r; };
  const leave = () => new Promise(() => {}); // the page navigates away
  SC.apiRemote = {
    load,
    signIn() { location.href = SC.config.loginUrl; return leave(); },
    register() { location.href = SC.config.loginUrl; return leave(); },
    signOut() { location.href = SC.config.logoutUrl; return leave(); },
    join: async id => (await go("POST", "/activities/" + id + "/join")).status,
    leave: id => go("DELETE", "/activities/" + id + "/join"),
    createActivity: d => go("POST", "/activities", Object.assign({ startsAt: new Date(d.date + "T" + d.time).toISOString() }, d)),
    respond: async (id, accept, reason) => (await go("POST", "/activities/" + id + "/respond", { accept, reason })).status,
    unblock: id => go("DELETE", "/blocks/" + encodeURIComponent(id)),
    report: (activityId, reason, details, block) => go("POST", "/reports", { activityId, reason, details, block }),
    saveProfile: p => go("PUT", "/profile", p)
  };
})();
