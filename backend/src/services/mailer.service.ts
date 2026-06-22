import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  throw new Error("EMAIL_USER and EMAIL_PASS must be defined in .env");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

function buildCodeEmail(subject: string, description: string, code: string) {
  return {
    from: EMAIL_USER,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <p>Hello,</p>
        <p>${description}</p>
        <div style="font-size: 28px; font-weight: 700; margin: 18px 0; letter-spacing: 0.2em;">${code}</div>
        <p>This code expires in 15 minutes. If you did not request this code, please ignore this message.</p>
        <p style="margin-top: 24px; color: #4b5563; font-size: 13px;">Thank you,<br />Kanban Board Security Team</p>
      </div>
    `,
  };
}

export async function sendVerificationCode(targetEmail: string, code: string) {
  const message = buildCodeEmail(
    "Your Kanban Board Signup Verification Code",
    "Your account verification code is:",
    code
  );

  await transporter.sendMail({
    to: targetEmail,
    ...message,
  });
}

export async function sendRecoveryCode(targetEmail: string, code: string) {
  const message = buildCodeEmail(
    "Your Kanban Board Password Reset Code",
    "Your password reset code is:",
    code
  );

  await transporter.sendMail({
    to: targetEmail,
    ...message,
  });
}
