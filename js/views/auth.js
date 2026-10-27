(function () {
  "use strict";
  const st = SC.state, $ = id => document.getElementById(id);
  let mode = "signin";

  function paint(msg) {
    document.querySelectorAll("#auth [data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    $("f-signin").hidden = mode !== "signin";
    $("f-register").hidden = mode !== "register";
    $("auth-msg").textContent = msg || ""; $("auth-msg").hidden = !msg;
    $("auth-err").textContent = "";
  }
  function header() {
    $("auth-btn").textContent = st.user ? "Sign out" : "Sign in";
    $("auth-btn").title = st.user ? "Signed in as " + st.user.name : "";
  }

  document.querySelectorAll("#auth [data-mode]").forEach(b => b.addEventListener("click", () => { mode = b.dataset.mode; paint(); }));
  $("auth-btn").addEventListener("click", async () => {
    if (st.user) { await SC.api.signOut(); header(); SC.toast("Signed out"); SC.goTo("home"); }
    else if (SC.config.mode === "remote") SC.api.signIn();
    else { mode = "signin"; SC.goTo("auth"); }
  });

  $("f-signin").addEventListener("submit", async e => {
    e.preventDefault();
    const r = await SC.api.signIn($("si-email").value.trim().toLowerCase(), $("si-pass").value);
    if (r.error) { $("auth-err").textContent = r.error; return; }
    e.target.reset(); header(); SC.toast("Welcome back, " + st.user.name); SC.goTo("activities");
  });

  $("f-register").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("rg-name").value.trim(), email = $("rg-email").value.trim().toLowerCase(), pass = $("rg-pass").value;
    const err = !name || !email.includes("@") ? "Enter your name and a valid email."
      : pass.length < 8 ? "Use a password of at least 8 characters."
      : !$("rg-privacy").checked ? "Accept the privacy policy to create an account." : "";
    if (err) { $("auth-err").textContent = err; return; }
    const r = await SC.api.register(name, email, pass);
    if (r.error) { $("auth-err").textContent = r.error; return; }
    e.target.reset();
    if (r.signedIn) { header(); SC.toast("Welcome, " + st.user.name); SC.goTo("activities"); return; }
    mode = "signin"; paint(r.message || "Account created. Please sign in."); $("si-email").value = email;
  });

  SC.header = header;
  SC.views.auth = () => paint();
  header();
})();
