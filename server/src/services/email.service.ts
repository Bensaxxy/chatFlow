import nodemailer from "nodemailer";

import { env } from "../config/env";

const emailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,

  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

type EmailDeliveryProvider = "brevo-api" | "smtp";

export const verifyEmailDeliveryProvider = async (): Promise<EmailDeliveryProvider> => {
  if (env.BREVO_API_KEY) {
    return "brevo-api";
  }

  await emailTransporter.verify();

  return "smtp";
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

interface SendVerificationEmailInput {
  recipientName: string;
  recipientEmail: string;
  verificationCode: string;
}

const getBrevoSender = (): { email: string; name: string } => {
  const configuredSender = env.EMAIL_FROM.trim();
  const matchedSender = configuredSender.match(/^(.*?)\s*<([^<>]+)>$/);

  if (matchedSender) {
    const [, rawName = "", rawEmail = ""] = matchedSender;

    return {
      name: rawName.trim().replace(/^"|"$/g, "") || "ChatFlow",
      email: rawEmail.trim(),
    };
  }

  return {
    email: configuredSender,
    name: "ChatFlow",
  };
};

const sendWithBrevoApi = async ({
  recipientName,
  recipientEmail,
  verificationCode,
}: SendVerificationEmailInput): Promise<void> => {
  if (!env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const safeName = escapeHtml(recipientName);
  const safeCode = escapeHtml(verificationCode);
  const sender = getBrevoSender();
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender,
      to: [
        {
          email: recipientEmail,
          name: recipientName,
        },
      ],
      subject: "Verify your ChatFlow email address",
      textContent: [
        `Hello ${recipientName},`,
        "",
        `Your ChatFlow verification code is: ${verificationCode}`,
        "",
        "This code expires in 10 minutes.",
        "If you did not create this account, you can ignore this email.",
      ].join("\n"),
      htmlContent: `
        <div style="background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e2e8f0">
            <h1 style="margin:0 0 16px;font-size:24px">Verify your ChatFlow account</h1>
            <p style="margin:0 0 16px;line-height:1.6">Hello ${safeName},</p>
            <p style="margin:0 0 20px;line-height:1.6">Enter the following code to verify your email address:</p>
            <div style="margin:20px 0;padding:18px;text-align:center;background:#ecfeff;border-radius:12px;color:#0e7490;font-size:32px;font-weight:700;letter-spacing:8px">${safeCode}</div>
            <p style="margin:20px 0 0;color:#64748b;font-size:14px;line-height:1.6">This code expires in 10 minutes. If you did not create this account, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo email API rejected the request (${response.status})`);
  }
};

export const sendVerificationEmail = async ({
  recipientName,
  recipientEmail,
  verificationCode,
}: SendVerificationEmailInput): Promise<void> => {
  if (env.BREVO_API_KEY) {
    await sendWithBrevoApi({
      recipientName,
      recipientEmail,
      verificationCode,
    });
    return;
  }

  const safeName = escapeHtml(recipientName);
  const safeCode = escapeHtml(verificationCode);

  const delivery = await emailTransporter.sendMail({
    from: env.EMAIL_FROM,
    to: recipientEmail,
    subject: "Verify your ChatFlow email address",

    text: [
      `Hello ${recipientName},`,
      "",
      `Your ChatFlow verification code is: ${verificationCode}`,
      "",
      "This code expires in 10 minutes.",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),

    html: `
      <div style="background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#0f172a">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e2e8f0">
          <h1 style="margin:0 0 16px;font-size:24px">
            Verify your ChatFlow account
          </h1>

          <p style="margin:0 0 16px;line-height:1.6">
            Hello ${safeName},
          </p>

          <p style="margin:0 0 20px;line-height:1.6">
            Enter the following code to verify your email address:
          </p>

          <div style="margin:20px 0;padding:18px;text-align:center;background:#ecfeff;border-radius:12px;color:#0e7490;font-size:32px;font-weight:700;letter-spacing:8px">
            ${safeCode}
          </div>

          <p style="margin:20px 0 0;color:#64748b;font-size:14px;line-height:1.6">
            This code expires in 10 minutes. If you did not create this
            account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  const wasAccepted = delivery.accepted.some(
    (acceptedRecipient) =>
      acceptedRecipient.trim().toLowerCase() === normalizedRecipient,
  );

  if (!wasAccepted) {
    throw new Error("The SMTP server did not accept the verification email");
  }
};
