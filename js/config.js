// "local" keeps everything in this browser. "supabase" uses your Supabase project, "remote" the Azure API (see README).
SC.config = {
  mode: "supabase",
  supabaseUrl: "https://dnpofrwvdjtnccdnphzl.supabase.co",       // Supabase: Project Settings -> API -> Project URL
  supabaseAnonKey: "sb_publishable_Zon7WdKmb_WADscMnjBTVw_aPm0DSRt",   // Supabase: Project Settings -> API -> anon public key. Safe to publish; the database functions check every request.
  apiBase: "/api",
  loginUrl: "/.auth/login/aad?post_login_redirect_uri=/",
  logoutUrl: "/.auth/logout?post_logout_redirect_uri=/"
};
