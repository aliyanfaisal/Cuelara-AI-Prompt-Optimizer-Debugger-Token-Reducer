import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export const EMAIL_TYPES = ["activation", "password-reset", "plan-change", "contact"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

let transporter: nodemailer.Transporter | null = null;
let transporterError: string | null = null;

/**
 * Built lazily (not at module load) so a missing/bad SMTP config doesn't crash routes
 * that don't send email — the error only surfaces when something actually tries to send.
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  if (transporterError) throw new Error(transporterError);

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    transporterError = "SMTP is not configured (SMTP_HOST/PORT/USER/PASS missing).";
    throw new Error(transporterError);
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE !== "false", // true = implicit TLS (port 465); false = STARTTLS (port 587)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function fromAddress(): string {
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";
  const name = process.env.SMTP_FROM_NAME || "Cuelara";
  return `"${name}" <${email}>`;
}

export interface SendEmailParams {
  type: EmailType;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where a reply should go (e.g. the person who filled in the contact form). */
  replyTo?: string;
}

/** Best-effort — a logging failure must never break the send it's recording. */
async function logEmail(params: { type: EmailType; to: string; subject: string; success: boolean; errorMessage?: string }): Promise<void> {
  try {
    await prisma.emailLog.create({ data: params });
  } catch (err) {
    console.error("Failed to write email log:", err);
  }
}

/**
 * Sends one email over SMTP and records the attempt (success or failure) to EmailLog
 * for the admin dashboard. Callers should treat a failure as best-effort where the flow
 * it supports (e.g. activation) already gives the user another path — never let an email
 * failure alone block something the user is actively waiting on synchronously unless that
 * email IS the only way forward (e.g. delivering a reset link).
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    const transport = getTransporter();
    await transport.sendMail({ from: fromAddress(), to: params.to, subject: params.subject, html: params.html, text: params.text, replyTo: params.replyTo });
    await logEmail({ type: params.type, to: params.to, subject: params.subject, success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logEmail({ type: params.type, to: params.to, subject: params.subject, success: false, errorMessage: errorMessage.slice(0, 500) });
    throw error;
  }
}

const BRAND_COLOR = "#7c3aed";

function emailShell(title: string, bodyHtml: string): string {
  const site = process.env.NEXTAUTH_URL || "https://cuelara.com";
  const year = new Date().getFullYear();

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="background:${BRAND_COLOR};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">Cuelara</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#18181b;font-size:14px;line-height:1.6;">
                <h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
                <p style="color:#71717a;font-size:11px;margin:0 0 12px;">If you didn't request this, you can safely ignore this email.</p>
                <p style="margin:0 0 8px;font-size:12px;">
                  <a href="${site}" style="color:#71717a;text-decoration:none;margin-right:12px;">cuelara.com</a>
                  <a href="${site}/privacy" style="color:#71717a;text-decoration:none;margin-right:12px;">Privacy</a>
                  <a href="${site}/terms" style="color:#71717a;text-decoration:none;margin-right:12px;">Terms</a>
                  <a href="${site}/contact" style="color:#71717a;text-decoration:none;">Contact</a>
                </p>
                <p style="color:#a1a1aa;font-size:11px;margin:0;">&copy; ${year} Cuelara, Inc. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function textFooter(): string {
  const site = process.env.NEXTAUTH_URL || "https://cuelara.com";
  return `\n\n---\ncuelara.com · ${site}/privacy · ${site}/terms · ${site}/contact\n© ${new Date().getFullYear()} Cuelara, Inc. All rights reserved.`;
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr><td style="border-radius:10px;background:${BRAND_COLOR};">
      <a href="${url}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;
}

export async function sendActivationEmail(to: string, activationUrl: string): Promise<void> {
  const html = emailShell(
    "Confirm your email",
    `<p>Thanks for signing up for Cuelara. Click below to activate your account.</p>
     ${button(activationUrl, "Activate my account")}
     <p style="color:#71717a;font-size:12px;">This link expires in 24 hours. If the button doesn't work, paste this into your browser:<br/><span style="word-break:break-all;">${activationUrl}</span></p>`
  );
  const text = `Confirm your email\n\nActivate your Cuelara account: ${activationUrl}\n\nThis link expires in 24 hours.${textFooter()}`;
  await sendEmail({ type: "activation", to, subject: "Activate your Cuelara account", html, text });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = emailShell(
    "Reset your password",
    `<p>We received a request to reset your Cuelara password. Click below to choose a new one.</p>
     ${button(resetUrl, "Reset my password")}
     <p style="color:#71717a;font-size:12px;">This link expires in 1 hour. If the button doesn't work, paste this into your browser:<br/><span style="word-break:break-all;">${resetUrl}</span></p>`
  );
  const text = `Reset your password\n\nReset your Cuelara password: ${resetUrl}\n\nThis link expires in 1 hour.${textFooter()}`;
  await sendEmail({ type: "password-reset", to, subject: "Reset your Cuelara password", html, text });
}

export async function sendPlanChangeEmail(to: string, planName: string): Promise<void> {
  const html = emailShell(
    "Your plan was updated",
    `<p>Your Cuelara account is now on the <strong>${planName}</strong> plan. Your daily usage limits have been updated accordingly.</p>
     ${button(`${process.env.NEXTAUTH_URL || ""}/tools`, "Go to your tools")}`
  );
  const text = `Your Cuelara plan was updated to: ${planName}.\n\nGo to your tools: ${process.env.NEXTAUTH_URL || ""}/tools${textFooter()}`;
  await sendEmail({ type: "plan-change", to, subject: `Your Cuelara plan is now ${planName}`, html, text });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface ContactEmailData {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  plan: string | null;
}

/** Where contact form submissions are delivered: CONTACT_TO_EMAIL, else the mailbox we send from. */
export function contactRecipient(): string {
  return process.env.CONTACT_TO_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";
}

/** Tells the team about a new contact form message. Reply-To is the sender, so replying goes straight to them. */
export async function sendContactNotificationEmail(data: ContactEmailData): Promise<void> {
  const to = contactRecipient();
  if (!to) throw new Error("No contact recipient configured (CONTACT_TO_EMAIL / SMTP_FROM_EMAIL / SMTP_USER).");

  const subject = `New contact message${data.subject ? `: ${data.subject}` : ` from ${data.name}`}`;
  const rows = [
    ["Name", data.name],
    ["Email", data.email],
    ...(data.plan ? [["Plan of interest", data.plan]] : []),
    ...(data.subject ? [["Subject", data.subject]] : []),
  ];
  const html = emailShell(
    "New contact message",
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
       ${rows.map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">${k}</td><td>${escapeHtml(v)}</td></tr>`).join("")}
     </table>
     <p style="white-space:pre-wrap;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:14px;margin:0;">${escapeHtml(data.message)}</p>`
  );
  const text = `New contact message\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${data.message}${textFooter()}`;
  await sendEmail({ type: "contact", to, subject, html, text, replyTo: data.email });
}

/** Acknowledges the sender so they know the message arrived. */
export async function sendContactReceiptEmail(data: ContactEmailData): Promise<void> {
  const html = emailShell(
    "We got your message",
    `<p>Hi ${escapeHtml(data.name)}, thanks for reaching out. We read every message and will get back to you by email as soon as we can.</p>
     <p style="color:#71717a;font-size:12px;margin-bottom:6px;">Your message:</p>
     <p style="white-space:pre-wrap;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:14px;margin:0;">${escapeHtml(data.message)}</p>`
  );
  const text = `We got your message\n\nHi ${data.name}, thanks for reaching out. We will reply by email as soon as we can.\n\nYour message:\n${data.message}${textFooter()}`;
  await sendEmail({ type: "contact", to: data.email, subject: "We received your message", html, text });
}
