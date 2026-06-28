/**
 * Siembra datos de desarrollo en tu Supabase para probar la app SIN SMS:
 * tres miembros avalados (Ada fundadora, que avala a Bruno y a Diego) con
 * email+password, agendas y varias peticiones por descripción abiertas para que
 * el tablón "PUEDES AYUDAR" tenga material real. Los datos PERSISTEN (re-ejecutar
 * regenera). Login en la app vía la pantalla "dev login" (solo dev).
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
const ADA = {
  email: "ada.dev@example.com",
  phone: "+14155552671",
  name: "Ada",
  bio: "Fundadora. Antes, operaciones en un neobanco.",
};
const BRUNO = {
  email: "bruno.dev@example.com",
  phone: "+14155552672",
  name: "Bruno",
  bio: "Inversor ángel. Fintech, pagos y banca.",
};
const DIEGO = {
  email: "diego.dev@example.com",
  phone: "+14155552674",
  name: "Diego",
  bio: "Operador. Marketplaces y growth.",
};
const CARLA_PHONE = "+14155552673"; // target a buscar (no es miembro)

// Peticiones por descripción que quedan ABIERTAS en el tablón.
const ADA_REQ = "Inversor Serie A para fintech B2B de pagos en España. Intro de calidad, no spray.";
const DIEGO_REQ = "Head of Growth con experiencia en marketplaces, para liderar growth en una seed (Barcelona).";

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
      where: { phoneE164: { in: [ADA.phone, BRUNO.phone, DIEGO.phone] } },
    });
    const idA = await freshUser(admin, ADA.email);
    const idB = await freshUser(admin, BRUNO.email);
    const idD = await freshUser(admin, DIEGO.email);

    // Ada es la fundadora (avalador raíz).
    const ada = await prisma.member.create({
      data: {
        authUserId: idA,
        phoneE164: ADA.phone,
        phoneHash: hashing.hash(ADA.phone),
        displayName: ADA.name,
        bio: ADA.bio,
      },
    });

    // Ada avala (invita) a Bruno y a Diego → Vouch + gasta invitaciones.
    const invB = await invites.create(ada.id);
    const bruno = (
      await invites.consume(invB.inviteUrl.split("/i/")[1], idB, BRUNO.phone, {
        displayName: BRUNO.name,
        bio: BRUNO.bio,
      })
    ).member;

    const invD = await invites.create(ada.id);
    const diego = (
      await invites.consume(invD.inviteUrl.split("/i/")[1], idD, DIEGO.phone, {
        displayName: DIEGO.name,
        bio: DIEGO.bio,
      })
    ).member;

    // Agendas: Bruno tiene a Carla (target) y a Ada; Ada tiene a Bruno.
    await contacts.import(bruno.id, [
      { e164: CARLA_PHONE, displayName: "Carla" },
      { e164: ADA.phone, displayName: "Ada" },
    ]);
    await contacts.import(ada.id, [{ e164: BRUNO.phone, displayName: "Bruno" }]);

    // Dos preguntas por descripción quedan abiertas en el tablón "PUEDES AYUDAR".
    await requests.create(ada.id, { targetDesc: ADA_REQ });
    await requests.create(diego.id, { targetDesc: DIEGO_REQ });

    console.log("\n✓ Datos de dev sembrados en tu Supabase:");
    console.log("    Ada   → " + ADA.email + "  /  " + PW);
    console.log("    Bruno → " + BRUNO.email + "  /  " + PW);
    console.log("    Diego → " + DIEGO.email + "  /  " + PW);
    console.log("\n  Demo del flujo por descripción (web):");
    console.log("    1) Entra como Bruno → 'PUEDES AYUDAR' (Ada y Diego buscan) → 'Conozco a alguien'.");
    console.log("       Verás el hilo en 'EN MARCHA': te ofreciste, esperando decisión.");
    console.log("    2) Entra como Ada → 'TIENES ALGO QUE DECIDIR' → Aceptar.");
    console.log("    3) Ambos → la intro pasa a 'EN MARCHA: conexión lista' → abrir WhatsApp.\n");
  } finally {
    await app.close();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
