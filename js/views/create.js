(function () {
  "use strict";
  const st = SC.state, $ = id => document.getElementById(id);

  $("c-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (SC.needLogin("Sign in to create an activity")) return;
    const f = new FormData(e.target), g = k => (f.get(k) || "").toString().trim(), max = parseInt(g("max"), 10);
    if (!g("area") || !g("place") || !g("date") || !g("time") || !(max >= 2)) {
      $("c-error").textContent = "Add an area, a place, a date, a time and at least 2 participants."; return;
    }
    if (new Date(g("date") + "T" + g("time")) <= new Date()) { $("c-error").textContent = "Pick a date and time in the future."; return; }
    // Invitations go by email, the same rule the server applies.
    const invitees = [...new Set(g("invite").split(",").map(x => x.trim().toLowerCase()).filter(Boolean))], bad = invitees.filter(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
    if (bad.length) { $("c-error").textContent = "These are not email addresses: " + bad.join(", "); return; }
    if (invitees.length > 50) { $("c-error").textContent = "Invite at most 50 people."; return; }
    $("c-error").textContent = "";
    const r = await SC.api.createActivity({ title: g("title") || g("sport") + " session", sport: g("sport"), level: g("level"),
      area: g("area"), place: g("place"), date: g("date"), time: g("time"), max, invitees });
    if (r && r.error) { $("c-error").textContent = r.error; return; }
    e.target.reset(); SC.toast("Activity created"); SC.goTo("activities");
  });

  SC.views.create = () => { SC.needLogin("Sign in to create an activity"); };
})();
