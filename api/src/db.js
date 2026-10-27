const sql = require("mssql");
let pool;
const getPool = () => (pool = pool || sql.connect(process.env.SQL_CONNECTION_STRING));

// Parameterized queries only. Pass a transaction to run inside it.
async function run(text, params = {}, tx) {
  const req = tx ? new sql.Request(tx) : (await getPool()).request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  return (await req.query(text)).recordset || [];
}

// Static Web Apps sends the signed-in user in this header. Never trust ids sent in the request body.
function principal(request) {
  const h = request.headers.get("x-ms-client-principal");
  if (!h) return null;
  const p = JSON.parse(Buffer.from(h, "base64").toString("utf8"));
  const claim = t => (p.claims || []).find(c => c.typ === t || c.typ.endsWith("/" + t))?.val;
  return { id: p.userId, email: (claim("emailaddress") || claim("email") || p.userDetails || "").toLowerCase(), name: claim("name") || p.userDetails || "Member" };
}

module.exports = { sql, run, principal, getPool };
