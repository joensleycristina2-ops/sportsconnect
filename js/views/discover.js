(function () {
  "use strict";
  // ---- Discover / matching ----
  function renderPartners() {
    const sport = document.getElementById("f-sport").value;
    const level = document.getElementById("f-level").value;
    const area = document.getElementById("f-area").value.trim().toLowerCase();

    const filtered = SC.partners.filter(p =>
      (!sport || p.sport === sport) &&
      (!level || p.level === level) &&
      (!area || p.area.toLowerCase().includes(area))
    );

    const list = document.getElementById("partner-list");
    list.innerHTML = "";

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty">No partners match those filters yet. Try widening your search.</div>';
      return;
    }

    filtered.forEach(p => {
      const alreadySent = SC.state.sessions.some(s => s.partnerId === p.id);
      const card = document.createElement("div");
      card.className = "card partner-row";
      card.innerHTML = `
        <div class="avatar">${SC.initials(p.name)}</div>
        <div class="partner-info">
          <div class="partner-name">${p.name}</div>
          <div class="partner-meta">${p.sport} &middot; ${p.level} &middot; ${p.area}</div>
          <div class="tag">&#9733; ${p.rating.toFixed(1)}</div>
        </div>
        <button class="primary" data-id="${p.id}" ${alreadySent ? "disabled" : ""}>
          ${alreadySent ? "Requested" : "Connect"}
        </button>
      `;
      card.querySelector("button").addEventListener("click", (e) => {
        if (e.target.disabled) return;
        requestConnection(p);
        e.target.textContent = "Requested";
        e.target.disabled = true;
      });
      list.appendChild(card);
    });
  }

  function requestConnection(partner) {
    SC.state.sessions.push({
      id: "s" + Date.now(),
      partnerId: partner.id,
      partnerName: partner.name,
      sport: partner.sport,
      status: "pending",
      date: "",
      time: "",
      location: ""
    });
    SC.save();
    SC.toast(`Request sent to ${partner.name}`);
  }

  ["f-sport", "f-level"].forEach(id =>
    document.getElementById(id).addEventListener("change", renderPartners)
  );
  document.getElementById("f-area").addEventListener("input", renderPartners);

  
  SC.views.discover = renderPartners;
  renderPartners();
})();
