(function () {
  "use strict";
  const st = SC.state, $ = id => document.getElementById(id);

  function card(a) {
    const mine = st.joined[a.id], n = a.joined + (mine === "confirmed" ? 1 : 0);
    return `<div class="card activity"><div class="activity-main">
      <div class="partner-name">${SC.esc(a.title)}</div>
      <div class="partner-meta">${a.sport} &middot; ${a.level} &middot; ${SC.esc(a.area)}</div>
      <div class="partner-meta">${SC.fmt(a)}</div>
      <div><span class="tag">${n} of ${a.max} joined</span>${mine ? ` <span class="status-pill ${mine === "waiting" ? "status-pending" : "status-confirmed"}">${mine === "waiting" ? "Waiting list" : "Joined"}</span>` : ""}</div>
    </div><button class="secondary" data-open="${a.id}">View</button></div>`;
  }

  function render() {
    const sport = $("a-sport").value, level = $("a-level").value, area = $("a-area").value.trim().toLowerCase();
    const list = SC.all().filter(a => !st.blocked.includes(a.organizer) && (!sport || a.sport === sport) &&
      (!level || a.level === level || a.level === "All levels") && (!area || a.area.toLowerCase().includes(area)));
    $("activity-list").innerHTML = list.length ? list.map(card).join("") : '<div class="empty">No activities match. Try other filters or create one.</div>';
  }

  function detail(id) {
    const a = SC.all().find(x => x.id === id), mine = st.joined[id], spots = SC.spots(a);
    const place = a.mine || mine === "confirmed" ? SC.esc(a.place) : "Shown after you join";
    const action = a.mine ? '<span class="partner-meta">You organize this activity.</span>'
      : mine ? '<button class="secondary" id="d-leave">Leave activity</button>'
      : `<button class="primary" id="d-join">${spots > 0 ? "Join activity" : "Join waiting list"}</button>`;
    const d = SC.dialog(`<h2>${SC.esc(a.title)}</h2><p class="partner-meta">${a.sport} &middot; ${a.level}</p>
      <dl class="facts"><dt>When</dt><dd>${SC.fmt(a)}</dd><dt>Area</dt><dd>${SC.esc(a.area)}</dd><dt>Exact place</dt><dd>${place}</dd>
      <dt>Spots left</dt><dd>${Math.max(spots, 0)} of ${a.max}</dd><dt>Organizer</dt><dd>${SC.esc(a.organizer)}</dd></dl>
      <div class="dlg-actions">${action}</div>${a.mine ? "" : '<button class="link" id="d-report">Report or block</button>'}`);
    const join = d.querySelector("#d-join"), leave = d.querySelector("#d-leave"), rep = d.querySelector("#d-report");
    if (join) join.onclick = async () => {
      if (!st.user) { d.close(); SC.needLogin("Sign in to join an activity"); return; }
      const s = await SC.api.join(id);
      d.close(); render(); SC.toast(s === "confirmed" ? "You joined the activity" : "Added to the waiting list");
    };
    if (leave) leave.onclick = async () => { await SC.api.leave(id); d.close(); render(); SC.toast("You left the activity"); };
    if (rep) rep.onclick = () => report(a);
  }

  function report(a) {
    const d = SC.dialog(`<h2>Report or block</h2><p class="partner-meta">${SC.esc(a.title)} &middot; ${SC.esc(a.organizer)}</p>
      <label class="field-label" for="r-reason">Reason</label>
      <select id="r-reason"><option value="">Choose a reason</option><option>Inappropriate behavior</option><option>Fake profile</option><option>Safety concern</option><option>Other</option></select>
      <label class="field-label" for="r-text">Details (optional)</label><input type="text" id="r-text">
      <label class="check"><input type="checkbox" id="r-block"> Also block ${SC.esc(a.organizer)}</label>
      <p class="partner-meta">A moderator reviews every report.</p>
      <div class="dlg-actions"><button class="primary" id="r-send">Submit report</button></div>`);
    d.querySelector("#r-send").onclick = async () => {
      const reason = d.querySelector("#r-reason").value;
      if (!reason) { SC.toast("Choose a reason first"); return; }
      if (!st.user) { d.close(); SC.needLogin("Sign in to send a report"); return; }
      await SC.api.report(a.id, reason, d.querySelector("#r-text").value.trim(), d.querySelector("#r-block").checked);
      d.close(); render(); SC.toast("Report sent");
    };
  }

  $("activity-list").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) detail(b.dataset.open); });
  ["a-sport", "a-level"].forEach(id => $(id).addEventListener("change", render));
  $("a-area").addEventListener("input", render);
  SC.views.activities = render;
  render();
})();
