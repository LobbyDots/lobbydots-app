/**
 * Validación end-to-end de la lógica de backend contra la DB real (Supabase).
 * Crea usuarios de auth reales (admin API), arranca el contexto Nest y ejercita
 * los servicios reales (sin HTTP/JWT, que requeriría OTP/Twilio). Comprueba
 * matching + intro + privacidad y limpia todo al final.
 * Ejecutar desde apps/api:  node scripts/validate.cjs
 */
process.loadEnvFile(); // apps/api/.env
const { NestFactory } = require("@nestjs/core");
const { createClient } = require("@supabase/supabase-js");
const { AppModule } = require("../dist/app.module");
const { PrismaService } = require("../dist/prisma/prisma.service");
const { HashingService } = require("../dist/hashing/hashing.service");
const { InvitesService } = require("../dist/invites/invites.service");
const { ContactsService } = require("../dist/contacts/contacts.service");
const { RequestsService } = require("../dist/requests/requests.service");
const { IntrosService } = require("../dist/intros/intros.service");

const A_PHONE = "+14155552671";
const B_PHONE = "+14155552672";
const T_PHONE = "+14155552673";
const A_DIGITS = "14155552671";
const B_DIGITS = "14155552672";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed++;
    console.log("  ✓ " + name);
  } else {
    failed++;
    console.log("  ✗ " + name);
  }
}

async function purgeAuthUsers(admin) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.phone === A_DIGITS || u.phone === B_DIGITS) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
}

async function createAuthUser(admin, digits) {
  const { data, error } = await admin.auth.admin.createUser({
    phone: digits,
    phone_confirm: true,
  });
  if (error) throw new Error("createUser: " + error.message);
  return data.user.id;
}

async function main() {
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });
  const prisma = app.get(PrismaService);
  const hashing = app.get(HashingService);
  const invites = app.get(InvitesService);
  const contacts = app.get(ContactsService);
  const requests = app.get(RequestsService);
  const intros = app.get(IntrosService);

  // Limpieza previa.
  await prisma.member.deleteMany({
    where: { phoneE164: { in: [A_PHONE, B_PHONE] } },
  });
  await purgeAuthUsers(admin);

  let authA;
  let authB;
  try {
    authA = await createAuthUser(admin, A_DIGITS);
    authB = await createAuthUser(admin, B_DIGITS);
    check("admin API crea usuarios auth (A, B)", !!authA && !!authB);

    console.log("\n· Alta del fundador A + invitación → B consume (Vouch)");
    const a = await prisma.member.create({
      data: {
        authUserId: authA,
        phoneE164: A_PHONE,
        phoneHash: hashing.hash(A_PHONE),
        displayName: "Ada",
      },
    });
    const invite = await invites.create(a.id);
    const token = invite.inviteUrl.split("/i/")[1];
    check("create() devuelve URL de invitación", !!token);

    const consumeRes = await invites.consume(token, authB, B_PHONE, {
      displayName: "Bruno",
    });
    const b = await prisma.member.findUnique({
      where: { id: consumeRes.member.id },
    });
    check("B creado al consumir", !!b && b.phoneE164 === B_PHONE);
    check(
      "Vouch(A→B) creado",
      !!(await prisma.vouch.findFirst({
        where: { inviterId: a.id, inviteeId: b.id },
      })),
    );
    const aAfter = await prisma.member.findUnique({ where: { id: a.id } });
    check("invites_remaining de A 3→2", aAfter.invitesRemaining === 2);

    console.log("\n· Import de agendas (B tiene a T y a A; A tiene a B)");
    const impB = await contacts.import(b.id, [
      { e164: T_PHONE, displayName: "Tomás" },
      { e164: A_PHONE, displayName: "Ada" },
    ]);
    check("B importa 2 contactos", impB.imported === 2);
    await contacts.import(a.id, [{ e164: B_PHONE, displayName: "Bruno" }]);
    check(
      "mismo número → mismo phone_hash (clave de unión)",
      !!(await prisma.contact.findFirst({
        where: { ownerMemberId: b.id, phoneHash: hashing.hash(T_PHONE) },
      })),
    );

    console.log("\n· A pide intro a T → matching de 1 salto");
    const req = await requests.create(a.id, { targetE164: T_PHONE });
    const paths = await requests.getPaths(a.id, req.id);
    check("no es contacto directo de A", paths.direct === false);
    const broker = paths.paths.find((p) => p.brokerId === b.id);
    check("B aparece como camino (broker)", !!broker);
    check(
      "warmth > 0 y razones presentes",
      !!broker && broker.warmth > 0 && broker.reasons.length > 0,
    );
    const leak = JSON.stringify(paths);
    check(
      "PRIVACIDAD: caminos no filtran phone_hash ni el hash del target",
      !leak.includes("phoneHash") && !leak.includes(hashing.hash(T_PHONE)),
    );
    if (broker) console.log("    → vía " + broker.brokerDisplayName + " · " + broker.reasons.join(" · "));

    console.log("\n· Intro: propuesta → sin revelado → aprobación → revelado");
    const aMember = await prisma.member.findUnique({ where: { id: a.id } });
    const bMember = await prisma.member.findUnique({ where: { id: b.id } });
    const proposed = await intros.propose(aMember, {
      requestId: req.id,
      brokerId: b.id,
    });
    check("intro 'proposed'", proposed.status === "proposed");

    const bBefore = await intros.detail(bMember, proposed.id);
    check("broker ve el 'ask'", bBefore.ask?.requesterName === "Ada");
    check("PRIVACIDAD: sin revelado antes de aprobar (broker)", bBefore.reveal === null);
    const aBefore = await intros.detail(aMember, proposed.id);
    check("PRIVACIDAD: sin revelado antes de aprobar (requester)", aBefore.reveal === null);

    const approved = await intros.approve(bMember, proposed.id);
    check("tras aprobar: revelado presente", approved.reveal !== null);
    check(
      "canal del broker apunta al requester (A)",
      !!approved.reveal && approved.reveal.channel.url.includes(A_DIGITS),
    );
    const aAfterApprove = await intros.detail(aMember, proposed.id);
    check(
      "requester ve revelado (contraparte = Bruno)",
      aAfterApprove.reveal?.counterpartName === "Bruno",
    );
  } finally {
    await prisma.member.deleteMany({
      where: { phoneE164: { in: [A_PHONE, B_PHONE] } },
    });
    await purgeAuthUsers(admin);
    await app.close();
  }

  console.log(`\nRESULTADO: ${passed} OK, ${failed} fallo(s)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
