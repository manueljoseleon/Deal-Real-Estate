import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.mensaje !== "string" || !body.mensaje.trim()) {
    return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
  }

  const tipo: string = body.tipo ?? "Sugerencia";
  const mensaje: string = body.mensaje.trim();
  const email: string = typeof body.email === "string" ? body.email.trim() : "";

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
  }

  const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #0f172a; margin-bottom: 4px;">[Deal Feedback] ${tipo}</h2>
      <p style="color: #64748b; font-size: 13px; margin-top: 0;">${fecha}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 15px; color: #1e293b; white-space: pre-wrap;">${mensaje.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      ${email ? `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 13px; color: #64748b;">Email para responder: <a href="mailto:${email}">${email}</a></p>` : ""}
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"Deal Inmobiliario" <${gmailUser}>`,
      to: gmailUser,
      subject: `[Deal Feedback] ${tipo} — ${fecha}`,
      html: htmlBody,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback email error:", err);
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
