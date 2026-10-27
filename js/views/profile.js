(function () {
  "use strict";
  // Weekly availability grid (days x time of day)
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], SLOTS = ["Morning", "Afternoon", "Evening"];
  const grid = document.getElementById("p-avail");
  grid.innerHTML = "<span></span>" + SLOTS.map(s => "<span>" + s + "</span>").join("") +
    DAYS.map(d => "<span>" + d + "</span>" + SLOTS.map(s => '<input type="checkbox" value="' + d + "-" + s + '" aria-label="' + d + " " + s + '">').join("")).join("");
  SC.readAvail = () => Array.from(grid.querySelectorAll("input:checked"), i => i.value);
  SC.writeAvail = list => grid.querySelectorAll("input").forEach(i => { i.checked = list.includes(i.value); });

  // ---- Profile ----
  function loadProfile() {
    const p = SC.state.profile || {};
    document.getElementById("p-name").value = p.name || "";
    document.getElementById("p-sport").value = p.sport || "Running";
    document.getElementById("p-level").value = p.level || "Beginner";
    document.getElementById("p-area").value = p.area || "";
    SC.writeAvail(p.availability || []);
  }

  document.getElementById("save-profile").addEventListener("click", async () => {
    if (SC.needLogin("Sign in to save your profile")) return;
    await SC.api.saveProfile({
      name: document.getElementById("p-name").value.trim(),
      sport: document.getElementById("p-sport").value,
      level: document.getElementById("p-level").value,
      area: document.getElementById("p-area").value.trim(),
      availability: SC.readAvail()
    });
    SC.toast("Profile saved");
  });

  
  SC.views.profile = loadProfile;
  loadProfile();
})();
