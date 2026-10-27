// "local" keeps everything in this browser. Switch to "remote" once the Azure API is deployed (see README).
SC.config = {
  mode: "local",
  apiBase: "/api",
  loginUrl: "/.auth/login/aad?post_login_redirect_uri=/",
  logoutUrl: "/.auth/logout?post_logout_redirect_uri=/"
};
