const { app } = require("@azure/functions");
const crypto = require("crypto");
const { sql, run, principal, getPool } = require("../db");

const json = (status, body) => ({ status, jsonBody: body });
const SPORTS = ["Running", "Tennis", "Padel", "Climbing", "Cycling"], LEVELS = ["All levels", "Beginner", "Intermediate", "Advanced"];
// Activity ids are GUIDs; anything else would make SQL Server throw a conversion error (a 500).
const isId = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));

// Every route: identify the user, create their row on first visit, then run the handler.
const route = (name, methods, path, guestOk, fn) => app.http(name, {
  methods, route: path, authLevel: "anonymous",
  handler: async (req, ctx) => {
    try {
      const me = principal(req);
      if (!me && !guestOk) return json(401, { error: "Sign in first" });
      if (me) await run(`MERGE Users AS t USING (SELECT @id AS Id) s ON t.Id = s.Id
        WHEN NOT MATCHED THEN INSERT (Id, Name, Email) VALUES (@id, @name, @email);`, me);
      return await fn(req, me);
    } catch (e) { ctx.error(e); return json(500, { error: "Something went wrong" }); }
  }
});

const inTx = async work => {
  const tx = new sql.Transaction(await getPool());
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try { const r = await work(tx); await tx.commit(); return r; }
  catch (e) { await tx.rollback().catch(() => {}); throw e; }
};

// Confirmed while spots are left, otherwise waiting list. The lock stops two people taking the last spot.
// Joining again keeps the current status, so a confirmed participant is never moved to the waiting list.
const joinActivity = (id, me) => inTx(async tx => {
  if (!isId(id)) return { code: 404, error: "Activity not found" };
  const [a] = await run(`SELECT a.Title, a.OrganizerId, a.StartsAt, a.MaxParticipants AS max,
      (SELECT COUNT(*) FROM Participants WITH (UPDLOCK, HOLDLOCK) WHERE ActivityId = a.Id AND Status = 'confirmed') AS n,
      (SELECT Status FROM Participants WHERE ActivityId = a.Id AND UserId = @uid) AS current
    FROM Activities a WHERE a.Id = @id`, { id, uid: me.id }, tx);
  if (!a) return { code: 404, error: "Activity not found" };
  if (a.OrganizerId === me.id) return { code: 400, error: "You organize this activity" };
  if (a.current) return { status: a.current };
  if (a.StartsAt <= new Date()) return { code: 400, error: "This activity has already started" };
  const status = a.n < a.max ? "confirmed" : "waiting";
  await run(`INSERT INTO Participants (ActivityId, UserId, Status) VALUES (@id, @uid, @status)`, { id, uid: me.id, status }, tx);
  await run(`INSERT INTO Notifications (UserId, Text) VALUES (@uid, @mine);
    INSERT INTO Notifications (UserId, Text) VALUES (@org, @theirs);`, {
    uid: me.id, org: a.OrganizerId,
    mine: (status === "confirmed" ? "You joined " : "You are on the waiting list for ") + a.Title,
    theirs: me.name + (status === "confirmed" ? " joined " : " joined the waiting list for ") + a.Title }, tx);
  return { status };
});

route("bootstrap", ["GET"], "bootstrap", true, async (req, me) => {
  const p = { id: me ? me.id : "", email: me ? me.email : "" };
  const activities = await run(`
    SELECT LOWER(CONVERT(VARCHAR(36), a.Id)) AS id, a.Title AS title, a.Sport AS sport, a.Level AS level, a.Area AS area,
      CASE WHEN a.OrganizerId = @id OR EXISTS (SELECT 1 FROM Participants p WHERE p.ActivityId = a.Id AND p.UserId = @id AND p.Status = 'confirmed')
        THEN a.Place END AS place,
      CONVERT(CHAR(10), a.StartsAt, 23) AS date, CONVERT(CHAR(5), a.StartsAt, 108) AS time, a.MaxParticipants AS max,
      (SELECT COUNT(*) FROM Participants p WHERE p.ActivityId = a.Id AND p.Status = 'confirmed' AND (a.OrganizerId = @id OR p.UserId <> @id)) AS joined,
      o.Name AS organizer,
      CAST(CASE WHEN a.OrganizerId = @id THEN 1 ELSE 0 END AS BIT) AS mine,
      CAST(CASE WHEN EXISTS (SELECT 1 FROM Invitations i WHERE i.ActivityId = a.Id AND i.InviteeEmail = @email) THEN 1 ELSE 0 END AS BIT) AS invited
    FROM Activities a JOIN Users o ON o.Id = a.OrganizerId
    WHERE a.StartsAt >= SYSUTCDATETIME()
      AND NOT EXISTS (SELECT 1 FROM Blocks b WHERE b.BlockerId = @id AND b.BlockedId = a.OrganizerId)
    ORDER BY a.StartsAt`, p);
  const out = { user: null, profile: null, activities, joined: {}, responded: {}, notes: [], blocked: [] };
  if (!me) return json(200, out);
  out.user = { name: me.name, email: me.email };
  for (const r of await run(`SELECT LOWER(CONVERT(VARCHAR(36), p.ActivityId)) AS id, p.Status FROM Participants p
    JOIN Activities a ON a.Id = p.ActivityId WHERE p.UserId = @id AND a.OrganizerId <> @id`, p)) out.joined[r.id] = r.Status;
  for (const r of await run(`SELECT LOWER(CONVERT(VARCHAR(36), ActivityId)) AS id, Status FROM Invitations
    WHERE InviteeEmail = @email AND Status <> 'pending'`, p)) out.responded[r.id] = r.Status;
  out.notes = await run(`SELECT TOP 6 Text AS text, CreatedAt AS at FROM Notifications WHERE UserId = @id ORDER BY CreatedAt DESC`, p);
  out.blocked = (await run(`SELECT u.Name AS name FROM Blocks b JOIN Users u ON u.Id = b.BlockedId WHERE b.BlockerId = @id`, p)).map(r => r.name);
  const [u] = await run(`SELECT Name, Sport, Level, Area, Availability FROM Users WHERE Id = @id`, p);
  out.profile = { name: u.Name, sport: u.Sport, level: u.Level, area: u.Area, availability: u.Availability ? JSON.parse(u.Availability) : [] };
  return json(200, out);
});

route("create", ["POST"], "activities", false, async (req, me) => {
  const d = await req.json(), max = parseInt(d.max, 10), starts = new Date(d.date + "T" + d.time + ":00Z");
  if (!d.area || !d.place || Number.isNaN(starts.getTime()) || !(max >= 2 && max <= 100))
    return json(400, { error: "Add an area, a place, a date, a time and 2 to 100 participants." });
  if (!SPORTS.includes(d.sport) || !LEVELS.includes(d.level || "All levels")) return json(400, { error: "Choose a sport and level from the list." });
  if (starts <= new Date()) return json(400, { error: "Pick a date and time in the future." });
  const id = crypto.randomUUID();
  const emails = [...new Set((d.invitees || []).map(x => String(x).trim().toLowerCase()).filter(x => x.includes("@")))].slice(0, 50);
  await inTx(async tx => {
    await run(`INSERT INTO Activities (Id, OrganizerId, Title, Sport, Level, Area, Place, StartsAt, MaxParticipants)
      VALUES (@id, @uid, @title, @sport, @level, @area, @place, @starts, @max);
      INSERT INTO Participants (ActivityId, UserId, Status) VALUES (@id, @uid, 'confirmed');`, {
      id, uid: me.id, title: String(d.title || d.sport + " session").slice(0, 120), sport: String(d.sport).slice(0, 50),
      level: String(d.level || "All levels").slice(0, 20), area: String(d.area).slice(0, 100), place: String(d.place).slice(0, 200), starts, max }, tx);
    for (const email of emails) await run(`INSERT INTO Invitations (ActivityId, InviteeEmail) VALUES (@id, @email)`, { id, email }, tx);
    await run(`INSERT INTO Notifications (UserId, Text) VALUES (@uid, @text)`, { uid: me.id,
      text: "Activity created" + (emails.length ? ", " + emails.length + " invitation" + (emails.length > 1 ? "s" : "") + " sent" : "") }, tx);
  });
  return json(200, { id });
});

route("join", ["POST"], "activities/{id}/join", false, async (req, me) => {
  const r = await joinActivity(req.params.id, me);
  return r.error ? json(r.code, { error: r.error }) : json(200, r);
});

route("leave", ["DELETE"], "activities/{id}/join", false, async (req, me) => {
  const id = req.params.id;
  if (!isId(id)) return json(404, { error: "Activity not found" });
  // Same transaction as joinActivity's lock, so a join and a leave cannot both take the freed spot.
  await inTx(async tx => {
    const [gone] = await run(`DELETE FROM Participants OUTPUT deleted.Status AS Status WHERE ActivityId = @id AND UserId = @uid
      AND NOT EXISTS (SELECT 1 FROM Activities WHERE Id = @id AND OrganizerId = @uid)`, { id, uid: me.id }, tx);
    if (gone && gone.Status === "confirmed")   // first person on the waiting list moves up and is told
      await run(`DECLARE @next NVARCHAR(128) = (SELECT TOP 1 UserId FROM Participants WITH (UPDLOCK, HOLDLOCK)
          WHERE ActivityId = @id AND Status = 'waiting' ORDER BY JoinedAt);
        IF @next IS NOT NULL BEGIN
          UPDATE Participants SET Status = 'confirmed' WHERE ActivityId = @id AND UserId = @next;
          INSERT INTO Notifications (UserId, Text) SELECT @next, N'A spot opened up. You joined ' + Title FROM Activities WHERE Id = @id;
        END`, { id }, tx);
  });
  return json(200, { ok: true });
});

route("respond", ["POST"], "activities/{id}/respond", false, async (req, me) => {
  const id = req.params.id, d = await req.json();
  if (!isId(id)) return json(404, { error: "Invitation not found" });
  const [inv] = await run(`SELECT Id FROM Invitations WHERE ActivityId = @id AND InviteeEmail = @email AND Status = 'pending'`, { id, email: me.email });
  if (!inv) return json(404, { error: "Invitation not found" });
  if (!d.accept) {
    await run(`UPDATE Invitations SET Status = 'declined', Reason = @why WHERE Id = @iid;
      INSERT INTO Notifications (UserId, Text) SELECT OrganizerId, @text FROM Activities WHERE Id = @id;`,
      { id, iid: inv.Id, why: String(d.reason || "").slice(0, 300), text: me.name + " declined your invitation" });
    return json(200, { status: "declined" });
  }
  const r = await joinActivity(id, me);
  if (r.error) return json(r.code, { error: r.error });
  await run(`UPDATE Invitations SET Status = 'accepted' WHERE Id = @iid`, { iid: inv.Id });
  return json(200, r);
});

route("report", ["POST"], "reports", false, async (req, me) => {
  const d = await req.json();
  if (!d.reason) return json(400, { error: "Choose a reason first" });
  if (!isId(d.activityId)) return json(404, { error: "Activity not found" });
  const p = { uid: me.id, aid: d.activityId, reason: String(d.reason).slice(0, 50), details: String(d.details || "").slice(0, 500) };
  await run(`INSERT INTO Reports (ReporterId, ActivityId, Reason, Details) SELECT @uid, Id, @reason, @details FROM Activities WHERE Id = @aid`, p);
  if (d.block) await run(`INSERT INTO Blocks (BlockerId, BlockedId) SELECT @uid, a.OrganizerId FROM Activities a
    WHERE a.Id = @aid AND a.OrganizerId <> @uid AND NOT EXISTS (SELECT 1 FROM Blocks b WHERE b.BlockerId = @uid AND b.BlockedId = a.OrganizerId)`, p);
  return json(200, { ok: true });
});

route("profile", ["PUT"], "profile", false, async (req, me) => {
  const p = await req.json();
  await run(`UPDATE Users SET Name = @name, Sport = @sport, Level = @level, Area = @area, Availability = @avail WHERE Id = @uid`, {
    uid: me.id, name: String(p.name || me.name).slice(0, 100), sport: String(p.sport || "").slice(0, 50), level: String(p.level || "").slice(0, 20),
    area: String(p.area || "").slice(0, 100), avail: JSON.stringify(Array.isArray(p.availability) ? p.availability.slice(0, 21) : []) });
  return json(200, { ok: true });
});
