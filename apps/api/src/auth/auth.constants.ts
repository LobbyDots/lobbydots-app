/** Ruta pública: no requiere JWT ni Member. */
export const IS_PUBLIC_KEY = "lobbydots:isPublic";
/** Requiere JWT válido pero NO un Member (p.ej. consumir invitación). */
export const ALLOW_NO_MEMBER_KEY = "lobbydots:allowNoMember";
