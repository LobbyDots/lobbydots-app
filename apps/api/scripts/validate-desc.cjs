/**
 * Valida el flujo POR DESCRIPCIÓN (pull) contra la DB real, vía servicios Nest.
 * A pregunta por descripción → B la ve en su lista de ayuda → B se ofrece →
 * decide A (gatekeeper) → revelado. Limpia al final. No toca los datos del seed.
 *   node scripts/validate-desc.cjs
 */
process.loadEnvFile();
const { NestFactory } = require("@nestjs/core");
const { createClient } = require("@supabase/supabase-js");
const { AppModule } = require("../dist/app.module");
const { PrismaService } = require("../dist/prisma/prisma.service");
const { HashingService } = require("../dist/hashing/hashing.service");
const { InvitesService } = require("../dist/invites/invites.service");
const { RequestsService } = require("../dist/requests/requests.service");
const { IntrosService } = require("../dist/intros/intros.service");

const A = { email: "valdesc-a@example.com", phone: "+14155552681", name: "Ada" };
const B = { email: "valdesc-b@example.com", phone: "+14155552682", name: "Bruno" };

let ok = 0, bad = 0;
const check = (n, c) => { if (c) { ok++; console.log("  ✓ " + n); } else { bad++; console.log("  ✗ " + n); } };

async function freshUser(admin, email) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email === email) await admin.auth.admin.deleteUser(u.id);
  const res = await admin.auth.admin.createUser({ email, password: "x", email_confirm: true });
  if (res.error) throw new Error(res.error.message);
  return res.data.user.id;
}

async function main() {
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  const prisma = app.get(PrismaService);
  const hashing = app.get(HashingService);
  const invites = app.get(InvitesService);
  const requests = app.get(RequestsService);
  const intros = app.get(IntrosService);

  await prisma.member.deleteMany({ where: { phoneE164: { in: [A.phone, B.phone] } } });

  let idA, idB;
  try {
    idA = await freshUser(admin, A.email);
    idB = await freshUser(admin, B.email);

    const ada = await prisma.member.create({
      data: { authUserId: idA, phoneE164: A.phone, phoneHash: hashing.hash(A.phone), displayName: A.name },
    });
    const inv = await invites.create(ada.id);
    const consumed = await invites.consume(inv.inviteUrl.split("/i/")[1], idB, B.phone, { displayName: B.name });
    const bruno = await prisma.member.findUnique({ where: { id: consumed.member.id } });
    const aMember = await prisma.member.findUnique({ where: { id: ada.id } });

    console.log("\n· A pregunta por descripción");
    const req = await requests.create(ada.id, { targetDesc: "inversor Serie A, fintech, ES" });
    check("petición creada por descripción", req.byDescription === true);

    console.log("\n· B la ve en su lista de ayuda (pull) y se ofrece");
    const openForB = await requests.listOpenForHelp(bruno.id);
    check("la petición aparece en la lista de B", openForB.some((r) => r.id === req.id && r.requesterName === "Ada"));
    check("PRIVACIDAD: la lista no expone al requester por teléfono", !JSON.stringify(openForB).includes(A.phone));

    const intro = await intros.volunteer(bruno, req.id);
    check("B se ofrece → intro 'proposed'", intro.status === "proposed");
    const openForBAfter = await requests.listOpenForHelp(bruno.id);
    check("ya no le aparece a B (ya se ofreció)", !openForBAfter.some((r) => r.id === req.id));

    console.log("\n· Decide el REQUESTER (no el broker)");
    const aView = await intros.detail(aMember, intro.id);
    check("A puede decidir (gatekeeper en descripción)", aView.canDecide === true && aView.byDescription === true);
    check("A ve a Bruno como quien se ofrece", aView.context?.counterpartName === "Bruno");
    check("PRIVACIDAD: sin revelado antes de aceptar", aView.reveal === null);

    const bView = await intros.detail(bruno, intro.id);
    check("B NO decide (espera)", bView.canDecide === false);

    let forbidden = false;
    try { await intros.approve(bruno, intro.id); } catch { forbidden = true; }
    check("B no puede aprobar (no es el gatekeeper) → 403", forbidden);

    console.log("\n· A acepta → revelado a ambos");
    const approved = await intros.approve(aMember, intro.id);
    check("tras aceptar A: revelado con canal a Bruno", !!approved.reveal && approved.reveal.channel.url.includes("14155552682"));
    const bAfter = await intros.detail(bruno, intro.id);
    check("Bruno ve el revelado (contraparte = Ada)", bAfter.reveal?.counterpartName === "Ada");
  } finally {
    await prisma.member.deleteMany({ where: { phoneE164: { in: [A.phone, B.phone] } } });
    if (idA) await admin.auth.admin.deleteUser(idA).catch(() => {});
    if (idB) await admin.auth.admin.deleteUser(idB).catch(() => {});
    await app.close();
  }
  console.log(`\nRESULTADO (descripción): ${ok} OK, ${bad} fallo(s)`);
  process.exit(bad === 0 ? 0 : 1);
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
