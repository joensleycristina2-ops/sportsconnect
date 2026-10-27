(function () {
  "use strict";
  if (SC.config.mode !== "remote") return;
  SC.api.load().then(() => { SC.header(); SC.refresh(); }).catch(() => SC.toast("Could not reach the server"));
})();
