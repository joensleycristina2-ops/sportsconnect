// Supabase adapter: accounts through Supabase Auth, data through the database functions in supabase/schema.sql.
// After every change it reloads the cache the views read from, like the Azure adapter.
(function () {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  const SRI = "sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o";
  let ready;
  // The library is only downloaded in Supabase mode.
  const client = () => ready = ready || new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = LIB; s.integrity = SRI; s.crossOrigin = "anonymous";
    s.onload = () => {
      const c = window.supabase.createClient(SC.config.supabaseUrl, SC.config.supabaseAnonKey);
      // The link in the reset email signs the user in and fires this event; then they choose a new password.
      c.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") setTimeout(SC.passwordRecovery); });
      ok(c);
    };
    s.onerror = () => { ready = null; fail(new Error("Could not load Supabase")); };
    document.head.appendChild(s);
  });

  // The database functions raise readable messages, so they can be shown as they are.
  async function rpc(fn, args) {
    const { data, error } = await (await client()).rpc(fn, args);
    if (error) {
      if (error.message === "Sign in first") SC.needLogin();
      else SC.toast(error.message || "Something went wrong");
      throw new Error(error.message);
    }
    return data;
  }
  const load = async () => SC.applyBootstrap(await rpc("bootstrap"));
  const go = async (fn, args) => { const r = await rpc(fn, args); await load(); return r; };
  const authError = e => /invalid login/i.test(e.message) ? "Email or password is incorrect. Check your details or register."
    : /not confirmed/i.test(e.message) ? "Confirm your email first. Open the link we sent you."
    : /already registered/i.test(e.message) ? "That email already has an account. Sign in instead."
    : e.message;

  SC.apiSupabase = {
    load,
    async register(name, email, password) {
      const { data, error } = await (await client()).auth.signUp({ email, password,
        options: { data: { name }, emailRedirectTo: location.origin + location.pathname } });
      if (error) return { error: authError(error) };
      if (!data.session) return { message: "Check your email and open the link to confirm your account. Then sign in." };
      await load(); return { signedIn: true };   // email confirmation is turned off in the project
    },
    async signIn(email, password) {
      const { error } = await (await client()).auth.signInWithPassword({ email, password });
      if (error) return { error: authError(error) };
      await load(); return {};
    },
    async requestReset(email) {
      const { error } = await (await client()).auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      return error ? { error: authError(error) } : {};
    },
    async setPassword(password) {
      const { error } = await (await client()).auth.updateUser({ password });
      if (error) return { error: authError(error) };
      await load(); return {};
    },
    async signOut() { await (await client()).auth.signOut(); await load(); },
    join: id => go("join_activity", { p_id: id }),
    leave: id => go("leave_activity", { p_id: id }),
    createActivity: d => go("create_activity", { p: Object.assign({ startsAt: new Date(d.date + "T" + d.time).toISOString() }, d) }),
    respond: (id, accept, reason) => go("respond_invitation", { p_id: id, p_accept: accept, p_reason: reason }),
    report: (activityId, reason, details, block) => go("report_activity", { p_id: activityId, p_reason: reason, p_details: details, p_block: block }),
    unblock: id => go("unblock_user", { p_id: id }),
    saveProfile: p => go("save_profile", { p })
  };
})();
