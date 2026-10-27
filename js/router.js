(function () {
  "use strict";
  const views = ["home", "discover", "activities", "create", "sessions", "profile", "auth"];
  SC.goTo = v => {
    if (!views.includes(v)) v = "home";
    if (v === "profile" && SC.needLogin("Sign in to see your profile")) return;   // the profile belongs to an account
    document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.view === v));
    document.querySelectorAll(".view").forEach(x => x.classList.toggle("active", x.id === v));
    if (SC.views[v]) SC.views[v]();
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  SC.refresh = () => ["activities", "sessions", "profile"].forEach(v => SC.views[v] && SC.views[v]());
  SC.needLogin = msg => {
    if (SC.state.user) return false;
    SC.toast(msg || "Sign in first");
    SC.goTo("auth");
    return true;
  };
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-view],[data-go]");
    if (t) { const d = document.getElementById("dlg"); if (d.open) d.close(); SC.goTo(t.dataset.view || t.dataset.go); }
  });
})();
