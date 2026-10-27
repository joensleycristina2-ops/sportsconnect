// Views only talk to SC.api. Pick the adapter in js/config.js.
SC.api = SC.config.mode === "remote" ? SC.apiRemote : SC.apiLocal;
