/**
 * Validación HTTP end-to-end contra la API + Supabase reales, SIN Twilio.
 * Trampa para conseguir un JWT real sin SMS: creo usuarios con email+password
 * (admin API) y hago signInWithPassword → token firmado por Supabase. El guard
 * lo verifica por JWKS igual que un token de OTP. Resuelvo el Member por
 * auth_user_id, así que no necesito el claim de teléfono.
 *
 * Requiere la API corriendo en localhost:3000.  node scripts/validate-http.cjs
 */
process.loadEnvFile();
const crypto = require("node:crypto");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY;
const PEPPER = process.env.HASH_PEPPER;
const API = "http://localhost:3000";

const A_PHONE = "+14155552671";
const B_PHONE = "+14155552672";
const T_PHONE = "+14155552673";
const A_EMAIL = "lobbydots-test-a@example.com";
const B_EMAIL = "lobbydots-test-b@example.com";
const PASS = "Lobbydots-Test-123!";

const hmac = (p) => crypto.createHmac("sha256", PEPPER).update(p).digest("hex");

let ok = 0;
let bad = 0;
const check = (n, c) => {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { bad++; console.log("  ✗ " + n); }
};

async function api(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : undefined };
}

async function main() {
  const admin = createClient(URL, SECRET, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(URL, PUBLISHABLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  // Limpieza previa.
  await db.query("delete from member where phone_e164 = any($1)", [[A_PHONE, B_PHONE]]);
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of existing?.users ?? []) {
    if (u.email === A_EMAIL || u.email === B_EMAIL) await admin.auth.admin.deleteUser(u.id);
  }

  let idA;
  let idB;
  try {
    // 1) Usuarios auth (email+password, confirmados) → para sacar JWT sin SMS.
    idA = (await admin.auth.admin.createUser({ email: A_EMAIL, password: PASS, email_confirm: true })).data.user.id;
    idB = (await admin.auth.admin.createUser({ email: B_EMAIL, password: PASS, email_confirm: true })).data.user.id;

    // 2) Siembro los Members (lo único no creable por HTTP sin OTP de teléfono).
    await db.query(
      "insert into member (auth_user_id, phone_e164, phone_hash, display_name) values ($1,$2,$3,$4)",
      [idA, A_PHONE, hmac(A_PHONE), "Ada"],
    );
    await db.query(
      "insert into member (auth_user_id, phone_e164, phone_hash, display_name) values ($1,$2,$3,$4)",
      [idB, B_PHONE, hmac(B_PHONE), "Bruno"],
    );

    // 3) JWT reales de Supabase (firma asimétrica) vía email+password.
    const sA = (await anon.auth.signInWithPassword({ email: A_EMAIL, password: PASS })).data.session;
    const sB = (await anon.auth.signInWithPassword({ email: B_EMAIL, password: PASS })).data.session;
    check("signInWithPassword devuelve JWT (A y B)", !!sA?.access_token && !!sB?.access_token);
    const tA = sA.access_token;
    const tB = sB.access_token;

    console.log("\n· Guard JWKS sobre HTTP real");
    check("GET /me sin token → 401", (await api("GET", "/me")).status === 401);
    check("GET /me con token basura → 401", (await api("GET", "/me", "x.y.z")).status === 401);
    const me = await api("GET", "/me", tA);
    check("GET /me con JWT real → 200 y es Ada", me.status === 200 && me.json.displayName === "Ada");

    console.log("\n· Datos vía HTTP (import de agendas)");
    const impB = await api("POST", "/contacts/import", tB, {
      contacts: [{ e164: T_PHONE, displayName: "Tomás" }, { e164: A_PHONE, displayName: "Ada" }],
    });
    check("B importa 2 contactos (HTTP)", impB.status === 201 && impB.json.imported === 2);
    await api("POST", "/contacts/import", tA, { contacts: [{ e164: B_PHONE, displayName: "Bruno" }] });

    console.log("\n· Petición + matching vía HTTP");
    const req = await api("POST", "/requests", tA, { targetE164: T_PHONE });
    check("POST /requests → 201", req.status === 201);
    const paths = await api("GET", `/requests/${req.json.id}/paths`, tA);
    const broker = paths.json.paths.find((p) => p.brokerId);
    check("GET /paths devuelve a Bruno como broker", paths.status === 200 && broker?.brokerDisplayName === "Bruno");
    check("PRIVACIDAD: /paths no filtra phone_hash", !JSON.stringify(paths.json).includes("phoneHash"));
    if (broker) console.log("    → vía " + broker.brokerDisplayName + " · " + broker.reasons.join(" · "));

    console.log("\n· Intro vía HTTP (privacidad del revelado)");
    const intro = await api("POST", "/intros", tA, { requestId: req.json.id, brokerId: broker.brokerId });
    check("POST /intros → 201 proposed", intro.status === 201 && intro.json.status === "proposed");
    const bBefore = await api("GET", `/intros/${intro.json.id}`, tB);
    check("broker ve 'ask', sin revelado", bBefore.json.ask?.requesterName === "Ada" && bBefore.json.reveal === null);
    const approved = await api("POST", `/intros/${intro.json.id}/approve`, tB);
    check("broker aprueba → revelado con canal a A", approved.json.reveal?.channel.url.includes("14155552671"));
    const aAfter = await api("GET", `/intros/${intro.json.id}`, tA);
    check("requester ve revelado (contraparte = Bruno)", aAfter.json.reveal?.counterpartName === "Bruno");

    console.log("\n· Permisos cruzados");
    const intruder = await api("POST", `/intros/${intro.json.id}/approve`, tA);
    check("el requester NO puede aprobar su propia intro (403)", intruder.status === 403);
  } finally {
    await db.query("delete from member where phone_e164 = any($1)", [[A_PHONE, B_PHONE]]);
    if (idA) await admin.auth.admin.deleteUser(idA).catch(() => {});
    if (idB) await admin.auth.admin.deleteUser(idB).catch(() => {});
    await db.end();
  }

  console.log(`\nRESULTADO HTTP: ${ok} OK, ${bad} fallo(s)`);
  process.exit(bad === 0 ? 0 : 1);
}

main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
