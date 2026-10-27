// Views only talk to SC.api. Pick the adapter in js/config.js.
SC.api = { remote: SC.apiRemote, supabase: SC.apiSupabase }[SC.config.mode] || SC.apiLocal;
