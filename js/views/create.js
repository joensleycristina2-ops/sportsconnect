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
    $("c-error").textContent = "";
    const invitees = g("invite").split(",").map(x => x.trim()).filter(Boolean);
    const r = await SC.api.createActivity({ title: g("title") || g("sport") + " session", sport: g("sport"), level: g("level"),
      area: g("area"), place: g("place"), date: g("date"), time: g("time"), max, invitees });
    if (r && r.error) { $("c-error").textContent = r.error; return; }
    e.target.reset(); SC.toast("Activity created"); SC.goTo("activities");
  });

  SC.views.create = () => { SC.needLogin("Sign in to create an activity"); };
})();
