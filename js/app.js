(function () {
  "use strict";
  if (SC.config.mode === "local") return;
  SC.api.load().then(() => { SC.header(); SC.refresh(); }).catch(() => SC.toast("Could not reach the server"));
})();
