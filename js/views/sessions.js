(function () {
  "use strict";
  // ---- Sessions ----
  function renderSessions() {
    const list = document.getElementById("session-list");
    list.innerHTML = "";

    if (SC.state.sessions.length === 0) {
      list.innerHTML = '<div class="empty">No sessions yet — connect with a partner on the Partners tab.</div>';
      return;
    }

    SC.state.sessions.slice().reverse().forEach(s => {
      const card = document.createElement("div");
      card.className = "card session-card";
      const pillClass = s.status === "confirmed" ? "status-confirmed" : "status-pending";
      const pillLabel = s.status === "confirmed" ? "Confirmed" : "Awaiting confirmation";
      card.innerHTML = `
        <div class="top-row">
          <div>
            <div class="partner-name">${SC.esc(s.partnerName)}</div>
            <div class="partner-meta">${SC.esc(s.sport)}</div>
          </div>
          <span class="status-pill ${pillClass}">${pillLabel}</span>
        </div>
        ${s.status === "confirmed" ? `
          <div class="partner-meta" style="margin-top:10px;">
            ${SC.esc(s.date || "No date set")} ${s.time ? "at " + SC.esc(s.time) : ""}${s.location ? " &middot; " + SC.esc(s.location) : ""}
          </div>
        ` : `
          <div class="schedule-row">
            <input type="date" data-field="date" data-id="${s.id}" value="${SC.esc(s.date)}">
            <input type="time" data-field="time" data-id="${s.id}" value="${SC.esc(s.time)}">
            <input type="text" data-field="location" data-id="${s.id}" placeholder="Meeting point" value="${SC.esc(s.location)}">
          </div>
          <div class="save-bar">
            <button class="secondary" data-confirm="${s.id}">Confirm session</button>
          </div>
        `}
      `;
      list.appendChild(card);
    });

    list.querySelectorAll("input[data-field]").forEach(input => {
      input.addEventListener("input", () => {
        const session = SC.state.sessions.find(s => s.id === input.dataset.id);
        if (session) { session[input.dataset.field] = input.value; SC.save(); }
      });
    });
    list.querySelectorAll("[data-confirm]").forEach(btn => {
      btn.addEventListener("click", () => {
        const session = SC.state.sessions.find(s => s.id === btn.dataset.confirm);
        if (session) {
          session.status = "confirmed";
          SC.save();
          renderSessions();
          SC.toast("Session confirmed");
        }
      });
    });
  }

  
  SC.views.sessions = renderSessions;
})();
