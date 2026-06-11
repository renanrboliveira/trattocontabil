export type SendResult = {
  ok: boolean;
  wamid?: string | null;
  error?: string;
};

function reguaMode(): "dry_run" | "live" {
  const mode = process.env.REGUA_MODE ?? "dry_run";
  return mode === "live" ? "live" : "dry_run";
}

async function postWhatsAppMessage(body: Record<string, unknown>): Promise<SendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    return { ok: false, error: "WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN ausente" };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json()) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    console.error("[whatsapp] send failed", { status: res.status, code: data.error?.message });
    return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
  }

  const wamid = data.messages?.[0]?.id ?? null;
  console.info("[whatsapp] send ok", { wamid });
  return { ok: true, wamid };
}

export async function sendTemplate(params: {
  to: string;
  templateName: string;
  languageCode: string;
  variables: string[];
}): Promise<SendResult> {
  if (reguaMode() === "dry_run") {
    console.info("[whatsapp] dry_run template", {
      to: params.to,
      template: params.templateName,
      vars: params.variables.length,
    });
    return { ok: true, wamid: null };
  }

  return postWhatsAppMessage({
    messaging_product: "whatsapp",
    to: params.to,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode },
      components: [
        {
          type: "body",
          parameters: params.variables.map((text) => ({ type: "text", text })),
        },
      ],
    },
  });
}

export async function sendSessionText(params: {
  to: string;
  text: string;
}): Promise<SendResult> {
  if (reguaMode() === "dry_run") {
    console.info("[whatsapp] dry_run session text", { to: params.to });
    return { ok: true, wamid: null };
  }

  return postWhatsAppMessage({
    messaging_product: "whatsapp",
    to: params.to,
    type: "text",
    text: { body: params.text },
  });
}
