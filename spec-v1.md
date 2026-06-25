# Especificación de producto — v1 (MVP)

> **Working title:** _[pendiente — ver §11]_
> **Estado:** documento vivo. Pensado para iterar y para alimentar a un agente de código (Claude Code / Cursor).
> **Principio rector:** el valor es la *lógica del flujo* (invitación → aval → petición → match → intro) y la *sensación de acceso*, no la cantidad de funciones.

---

## 1. Qué es

App móvil (iOS + Android) para un **grupo cerrado y avalado**. Cada miembro importa su agenda con un toque. Cualquier miembro puede preguntar *"¿quién de nosotros conoce a [X]?"* y el sistema localiza al miembro que tiene a esa persona en su agenda y le traslada la petición de presentación.

El acceso es **solo por invitación con aval**. No hay registro abierto. No hay directorio navegable de miembros.

---

## 2. Alcance v1

### Dentro
- Alta exclusivamente por enlace de invitación de un miembro existente (con aval).
- Verificación de identidad por OTP de teléfono.
- Import de agenda del dispositivo (un toque, permiso del SO).
- Etiquetado manual de contactos valiosos + tier de cercanía (1/2/3).
- Petición de intro: por persona concreta (nombre/teléfono) **o** por descripción ("inversor Serie A, fintech, ES").
- Matching de **1 salto** (directo + 1 intermediario) con *warmth ranking*.
- Flujo de intro con aprobación del intermediario antes de revelar nada.
- Entrega de la intro fuera de la app (WhatsApp / email) — la app la propone y la registra.

### Fuera (explícito, no es recortar — es enfoque)
- Registro abierto / "Sign up" público.
- Directorio o navegación de perfiles de miembros (**la ausencia es una feature**, ver §6).
- Matching de 2+ saltos.
- Grafo cifrado / PSI (ver §9 y §10).
- Base de datos de grafos (Neo4j etc.).
- Enriquecimiento de perfiles de pago (Clearbit/Apollo).
- Web app.

---

## 3. Modelo de datos

Clave de unión en todo el sistema: **teléfono normalizado a E.164**, hasheado. Mismo número en dos agendas = mismo nodo.

**Member** — el que tiene cuenta
- `id`, `phone_e164` (verificado por OTP), `display_name`, `bio` (corta), `status` (activo / suspendido), `invites_remaining` (p.ej. arranca en 3), `created_at`

**Contact** — entrada de agenda importada por un miembro
- `id`, `owner_member_id` (FK Member), `phone_hash`, `display_name`, `tags` (texto libre / chips), `tier` (1 = círculo íntimo, 2 = conoce bien, 3 = conocido), `created_at`

**Vouch** — quién avaló a quién (= control de acceso **y** arista de confianza entre miembros)
- `id`, `inviter_id` (FK Member), `invitee_id` (FK Member), `created_at`

**Request** — una petición de intro
- `id`, `requester_id` (FK Member), `target_phone_hash` (nullable), `target_desc` (nullable), `status` (abierta / con_match / completada / cerrada), `created_at`

**Intro** — la presentación facilitada
- `id`, `request_id` (FK Request), `broker_id` (FK Member), `status` (propuesta / aprobada / rechazada / completada), `created_at`

---

## 4. Flujos

### 4.1 Invitación + alta (la "iniciación")
1. Un miembro genera un enlace de invitación (gasta uno de sus `invites_remaining`).
2. El invitado abre el enlace → la primera pantalla nombra al avalador: *"Marcos responde por ti."*
3. Verificación por OTP de teléfono. El teléfono ES el identificador del grafo, así que verificación e identidad son lo mismo.
4. Mini-perfil (nombre, bio corta) + import de agenda (§4.2).
5. Se crea el registro `Vouch(inviter=Marcos, invitee=nuevo)`. Dentro.

### 4.2 Importar agenda
1. Permiso del SO (`expo-contacts`).
2. Se normalizan los números a E.164 y se hashean en cliente (o servidor — decidir en §9).
3. Se crean `Contact` para el miembro.
4. Paso ligero opcional de etiquetado: "ordena tu top 20" arrastrando a tier 1/2/3. 30 segundos, señal de alta calidad puesta por el humano (no inferida).

### 4.3 Petición → match
1. El miembro crea una `Request` (persona concreta o descripción).
2. **Si es persona concreta:** se hashea el target y se busca qué miembros (≠ requester) lo tienen en `Contact`.
3. **Si es descripción:** se difunde como pregunta a los miembros — *"¿conocéis a alguien que sea X?"* — y responden desde lo que saben (esto esquiva tener que comprar datos).
4. Resultados ordenados por *warmth* (§5). El requester nunca ve la agenda de nadie; solo ve que existe un camino.

### 4.4 Intro
1. El requester elige un camino → se crea una `Intro` en estado `propuesta` y se notifica al `broker`.
2. **El broker aprueba o rechaza antes de que se revele nada.** Protege al intermediario y mantiene la calidad.
3. Si aprueba: la app propone el texto de la intro y abre el canal (WhatsApp/email). Copy: *"Te presento a alguien que vale tu tiempo"*, **nunca** "X te pide un favor".
4. Estado → `completada`. (En v1 el "completada" puede ser un toque manual del broker.)

---

## 5. Lógica de matching v1 (sin grafo DB)

A escala de beta (decenas–cientos de miembros) **una query basta**. No metas Neo4j.

- **Directo:** el target está en los `Contact` del propio requester.
- **1 broker:** `Member`s (≠ requester) que tienen el `phone_hash` del target, ordenados por *warmth* respecto al requester.

**Warmth ranking (v1, calculado en código):** combinación simple de
- `tier` que el broker le ha puesto al target (íntimo > conocido),
- si requester y broker se tienen mutuamente en la agenda,
- si comparten avalador / cadena de `Vouch` cercana.

> Nota de diseño: el objetivo correcto es **maximizar la calidez del camino**, no minimizar saltos. En v1 con 1 salto es trivial; la estructura queda lista para generalizar a *warmth-optimal pathfinding* (maximizar el producto de los pesos de las aristas) cuando se abran los 2 saltos en v2.

---

## 6. Pantallas mínimas

1. **Invitación / aval** (entrada por enlace, nombra al avalador).
2. **OTP** (verificación de teléfono).
3. **Perfil + import de agenda** (con el paso de tiers).
4. **Home / nueva petición** (persona o descripción).
5. **Resultados de camino** (sin exponer agendas; solo "hay camino vía …").
6. **Intro** (propuesta → aprobación del broker → apertura del canal).

**Lo que NO existe:** un directorio de miembros. No se navega la red, **se atraviesa**. Solo descubres a alguien cuando una intro te lo revela. Esto crea el aura, protege a la gente de valor y esquiva el problema de privacidad.

---

## 7. Voz y copy (el aura vive aquí)

Regla: **no expliques, no hypees, no convenzas.** El texto asume que ya perteneces. Terso, seguro, seco.

| ❌ Mata el aura | ✅ Lo construye |
|---|---|
| "¡Únete a la red de networking más exclusiva!" | "Por invitación." |
| "Completa tu perfil para desbloquear funciones" | "Marcos responde por ti." |
| "Fulano quiere conectar contigo 🙌" | "Hay alguien que crees que deberías conocer." |
| "¡Solo quedan 3 plazas, date prisa!" | _(silencio — la escasez real no se anuncia)_ |

Lenguaje visual: tinta/carbón sobre crema, **un** acento sobrio, serif editorial en titulares + sans limpia en UI (huir de Inter/SF por defecto), mucho blanco, animaciones lentas, **cero vanity metrics**.

---

## 8. Stack recomendado

| Capa | Recomendación | Por qué |
|---|---|---|
| App | **Expo / React Native** | Un toque para leer agenda solo existe en nativo. Codebase único iOS+Android. |
| Backend | **NestJS (TS)** _o_ **FastAPI (Py)** | Decisión del CTO (§11). |
| DB + Auth | **Supabase** (Postgres + OTP de teléfono listo) _o_ Postgres a mano | Supabase ahorra muchísimo siendo dos. |
| Identidad | OTP de teléfono | El teléfono ya es el ID del grafo. |

---

## 9. Privacidad v1 (honesto)

- En v1 se guardan **hashes de teléfono** en Postgres. **Sé consciente:** un hash de teléfono es brute-forceable (el espacio de números es pequeño).
- Para un **grupo cerrado que ya confía en vosotros**, es un riesgo aceptable y honesto para validar.
- **No vale para producción abierta.** Cuando se abra a desconocidos → revisar hacia PSI / grafo local-first (§10).
- Nunca meter datos personales en URLs. Permisos del SO bien pedidos.

---

## 10. Diferido (v2 / v3)

- **PSI / grafo cifrado / local-first** — cuando se abra a desconocidos.
- **Matching de 2+ saltos** + *warmth-optimal pathfinding* completo.
- **Base de datos de grafos** — solo si la escala lo justifica.
- **Matching doble-ciego** (revelar solo con interés mutuo).
- **Pruebas ZK del camino** (demostrar que hay camino sin revelar intermediarios).

(La **ausencia de directorio** NO es diferido: es permanente y es feature.)

---

## 11. Decisiones abiertas (para el CTO)

1. **Backend:** ¿NestJS (TS) o FastAPI (Python)?
2. **Infra:** ¿Supabase o Postgres + auth a mano?
3. **Hash en cliente o servidor.**
4. **Naming:** una palabra, sobria, que no suene a app. Ni "ConnectHub" ni "NetworkAI".
