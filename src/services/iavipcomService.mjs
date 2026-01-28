// src/services/iavipcomService.mjs

export async function handleIaVipCom(payload, user) {
  // user.email viene del tokken validado
  const message = payload?.message;

  if (!message) {
    return { ok: false, error: "No message provided" };
  }

  // Aquí va tu lógica real de IA (OpenAI, etc)
  return {
    ok: true,
    reply: `Respuesta IA para ${user.email}`
  };
}
