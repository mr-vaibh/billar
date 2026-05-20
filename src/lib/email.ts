import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'Billar <noreply@billar.app>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export async function sendInviteEmail({
  to,
  orgName,
  inviterName,
  token,
}: {
  to: string;
  orgName: string;
  inviterName: string;
  token: string;
}) {
  const link = `${APP_URL}/invite/${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to ${orgName} on Billar`,
    html: `
      <p>Hi,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Billar — a professional GST bill-making platform.</p>
      <p>Click the link below to set up your account. This link expires in 72 hours.</p>
      <p><a href="${link}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Set up your account</a></p>
      <p>Or copy this URL: ${link}</p>
      <p>If you weren't expecting this invitation, you can ignore this email.</p>
    `,
  });
}

export async function sendInvoiceEmail({ to, orgName, billNumber, shareUrl }: { to: string; orgName: string; billNumber: string; shareUrl: string }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice ${billNumber} from ${orgName}`,
    html: `
      <p>Hi,</p>
      <p>Please find your invoice <strong>${billNumber}</strong> from <strong>${orgName}</strong>.</p>
      <p><a href="${shareUrl}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">View &amp; Download Invoice</a></p>
      <p>Or copy this URL: ${shareUrl}</p>
    `,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${APP_URL}/reset-password/${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Billar password',
    html: `
      <p>Hi ${name},</p>
      <p>We received a request to reset your Billar password. Click the link below to choose a new one. This link expires in 1 hour.</p>
      <p><a href="${link}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Reset password</a></p>
      <p>Or copy this URL: ${link}</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  });
}
