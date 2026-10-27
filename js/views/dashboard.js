(function () {
  "use strict";
  const st = SC.state, $ = id => document.getElementById(id);
  const pill = (cls, t) => `<span class="status-pill ${cls}">${t}</span>`;
  const row = (a, right) => {
    const loc = a.mine || st.joined[a.id] === "confirmed" ? a.place : a.area;
    return `<div class="card activity"><div class="activity-main"><div class="partner-name">${SC.esc(a.title)}</div>
      <div class="partner-meta">${SC.fmt(a)} &middot; ${SC.esc(loc)}</div></div><div class="row-actions">${right}</div></div>`;
  };

  function render() {
    const box = $("dash-activities"), nb = $("notif-list");
    nb.innerHTML = st.notes.length ? st.notes.slice(0, 6).map(n => `<div class="note"><span class="dot"></span><div>${SC.esc(n.text)}
      <div class="partner-meta">${new Date(n.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div></div></div>`).join("")
      : '<div class="empty">No notifications yet.</div>';
    if (!st.user) { box.innerHTML = '<div class="empty">Sign in to see your invitations and activities.<br><br><button class="primary" data-go="auth">Sign in</button></div>'; return; }
    const invites = SC.activities.filter(a => a.invited && SC.upcoming(a) && !st.responded[a.id] && !SC.isBlocked(a));
    const mine = SC.all().filter(a => a.mine || st.joined[a.id]);
    const html = invites.map(a => row(a, pill("status-pending", "Invited") + `<button class="secondary" data-decline="${a.id}">Decline</button><button class="primary" data-accept="${a.id}">Accept</button>`)).join("") +
      mine.map(a => row(a, a.mine ? `<span class="tag">${a.joined} of ${a.max} joined${a.invitees && a.invitees.length ? ", " + a.invitees.length + " invited" : ""}</span>`
        : st.joined[a.id] === "waiting" ? pill("status-pending", "Waiting list") : pill("status-confirmed", "Confirmed"))).join("");
    box.innerHTML = html || '<div class="empty">No activities yet. Browse activities to join one.</div>';
  }

  $("dash-activities").addEventListener("click", async e => {
    const acc = e.target.closest("[data-accept]"), dec = e.target.closest("[data-decline]");
    if (acc) {
      const s = await SC.api.respond(acc.dataset.accept, true, "");
      render(); SC.toast(s === "confirmed" ? "Invitation accepted" : "Added to the waiting list");
    }
    if (dec) {
      const a = SC.activities.find(x => x.id === dec.dataset.decline);
      const d = SC.dialog(`<h2>Decline invitation</h2><p class="partner-meta">${SC.esc(a.title)}</p>
        <label class="field-label" for="x-why">Reason (optional)</label><input type="text" id="x-why">
        <div class="dlg-actions"><button class="primary" id="x-ok">Decline invitation</button></div>`);
      d.querySelector("#x-ok").onclick = async () => {
        await SC.api.respond(a.id, false, d.querySelector("#x-why").value.trim());
        d.close(); render(); SC.toast("Invitation declined");
      };
    }
  });

  const prev = SC.views.sessions;
  SC.views.sessions = () => { render(); if (prev) prev(); };
})();
