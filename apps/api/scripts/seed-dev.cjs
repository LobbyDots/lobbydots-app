/**
 * Siembra datos de desarrollo en tu Supabase para probar la app SIN SMS:
 * dos miembros (Ada fundadora, Bruno avalado por ella) con email+password, y
 * agendas para que el matching tenga material. Los datos PERSISTEN (re-ejecutar
 * regenera). Login en la app vía la pantalla "dev login" (solo __DEV__).
 *
 *   pnpm --filter @lobbydots/api seed:dev
 */
process.loadEnvFile();
const { NestFactory } = require("@nestjs/core");
const { createClient } = require("@supabase/supabase-js");
const { AppModule } = require("../dist/app.module");
const { PrismaService } = require("../dist/prisma/prisma.service");
const { HashingService } = require("../dist/hashing/hashing.service");
const { InvitesService } = require("../dist/invites/invites.service");
const { ContactsService } = require("../dist/contacts/contacts.service");
const { RequestsService } = require("../dist/requests/requests.service");

const PW = "Lobbydots-Dev-123!";
const ADA = { email: "ada.dev@example.com", phone: "+14155552671", name: "Ada" };
const BRUNO = { email: "bruno.dev@example.com", phone: "+14155552672", name: "Bruno" };
const CARLA_PHONE = "+14155552673"; // target a buscar (no es miembro)

async function freshUser(admin, email) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email === email) await admin.auth.admin.deleteUser(u.id);
  }
  const res = await admin.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  });
  if (res.error) throw new Error(res.error.message);
  return res.data.user.id;
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

  try {
    await prisma.member.deleteMany({
      where: { phoneE164: { in: [ADA.phone, BRUNO.phone] } },
    });
    const idA = await freshUser(admin, ADA.email);
    const idB = await freshUser(admin, BRUNO.email);

    const ada = await prisma.member.create({
      data: {
        authUserId: idA,
        phoneE164: ADA.phone,
        phoneHash: hashing.hash(ADA.phone),
        displayName: ADA.name,
      },
    });

    // Ada invita a Bruno → crea Vouch(Ada→Bruno) y gasta una invitación.
    const inv = await invites.create(ada.id);
    const token = inv.inviteUrl.split("/i/")[1];
    const consumed = await invites.consume(token, idB, BRUNO.phone, {
      displayName: BRUNO.name,
    });
    const bruno = consumed.member;

    // Agendas: Bruno tiene a Carla (target) y a Ada; Ada tiene a Bruno.
    await contacts.import(bruno.id, [
      { e164: CARLA_PHONE, displayName: "Carla" },
      { e164: ADA.phone, displayName: "Ada" },
    ]);
    await contacts.import(ada.id, [{ e164: BRUNO.phone, displayName: "Bruno" }]);

    // Ada deja una pregunta por descripción → Bruno la verá en "PUEDES AYUDAR".
    await requests.create(ada.id, { targetDesc: "inversor Serie A, fintech, ES" });

    console.log("\n✓ Datos de dev sembrados en tu Supabase:");
    console.log("    Ada   → " + ADA.email + "  /  " + PW);
    console.log("    Bruno → " + BRUNO.email + "  /  " + PW);
    console.log("\n  Por teléfono: entra como Ada y busca a " + CARLA_PHONE + " (Carla) → 'vía Bruno' → Pedir presentación.");
    console.log("  Por descripción: entra como Bruno → 'PUEDES AYUDAR' (Ada busca inversor…) → 'Conozco a alguien'.");
    console.log("    Luego entra como Ada → 'Tienes algo que decidir' → Aceptar → se abre el canal.\n");
  } finally {
    await app.close();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
