(function () {
  "use strict";
  const st = SC.state, $ = id => document.getElementById(id);
  let mode = "signin";

  function paint(msg) {
    document.querySelectorAll("#auth [data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    ["signin", "register", "forgot", "reset"].forEach(m => { $("f-" + m).hidden = mode !== m; });
    document.querySelector("#auth .tabs").hidden = mode === "reset";
    $("forgot-link").hidden = !SC.api.requestReset;   // reset by email only exists in the Supabase version
    $("auth-msg").textContent = msg || ""; $("auth-msg").hidden = !msg;
    $("auth-err").textContent = "";
  }
  // Shows who is signed in next to the Sign out button; clicking it opens the profile.
  function header() {
    const u = st.user;
    $("auth-btn").textContent = u ? "Sign out" : "Sign in";
    $("who").hidden = !u;
    document.querySelector('nav [data-view="profile"]').hidden = !u;   // only signed-in users have a profile
    if (!u) { if ($("profile").classList.contains("active")) SC.goTo("home"); return; }
    $("who-name").textContent = u.name;
    $("who-avatar").textContent = SC.initials(u.name);
    $("who").title = "Signed in as " + u.name + " (" + u.email + ")";
    $("who").setAttribute("aria-label", "Signed in as " + u.name + ". Open your profile");
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

  $("f-forgot").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("fg-email").value.trim().toLowerCase();
    if (!email.includes("@")) { $("auth-err").textContent = "Enter a valid email."; return; }
    const r = await SC.api.requestReset(email);
    if (r.error) { $("auth-err").textContent = r.error; return; }
    e.target.reset(); mode = "signin"; $("si-email").value = email;
    paint("If there is an account for " + email + ", we sent it a link to choose a new password. Check your inbox and spam folder.");
  });

  $("f-reset").addEventListener("submit", async e => {
    e.preventDefault();
    const pass = $("rs-pass").value;
    const err = pass.length < 8 ? "Use a password of at least 8 characters."
      : pass !== $("rs-pass2").value ? "The two passwords are not the same." : "";
    if (err) { $("auth-err").textContent = err; return; }
    const r = await SC.api.setPassword(pass);
    if (r.error) { $("auth-err").textContent = r.error; return; }
    e.target.reset(); mode = "signin"; header(); SC.toast("Password changed"); SC.goTo("activities");
  });

  // Called when someone opens the link from the reset email.
  SC.passwordRecovery = () => { mode = "reset"; SC.goTo("auth"); paint("Choose a new password for your account."); header(); };

  SC.header = header;
  SC.views.auth = () => paint();
  header();
})();
