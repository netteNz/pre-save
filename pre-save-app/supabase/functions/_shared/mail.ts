// Outgoing email. Uses Resend when RESEND_API_KEY is set; otherwise logs the
// message (local development). The provider is a placeholder until one is
// chosen; swap the fetch below for any transactional email API.

export type Mail = { to: string; subject: string; text: string; html: string };

/** True when an email provider is configured and sendMail() will deliver. */
export const mailConfigured = () => Boolean(Deno.env.get("RESEND_API_KEY") && Deno.env.get("MAIL_FROM"));

export async function sendMail(mail: Mail): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM");
  if (!key || !from) {
    console.log(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) {
    console.error("mail send failed", res.status, await res.text());
    throw new Error("mail send failed");
  }
  return true;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
