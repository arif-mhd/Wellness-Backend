import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("⚠️  RESEND_API_KEY not set — OTP emails will fail");
}

export const resend    = new Resend(process.env.RESEND_API_KEY ?? "");
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Wellness Central <onboarding@resend.dev>";

export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: "login" | "enable_2fa" | "registration" | "reset" = "login"
): Promise<void> {
  const subject =
    purpose === "enable_2fa"
      ? "Your Wellness – Enable Two-Factor Authentication Code"
      : purpose === "reset"
      ? "Reset your Wellness password"
      : purpose === "registration"
      ? "Your Wellness verification code"
      : "Your Wellness – Login Verification Code";

  const purposeLabel =
    purpose === "enable_2fa"
      ? "set up Two-Factor Authentication on your Wellness account"
      : purpose === "reset"
      ? "reset your password"
      : purpose === "registration"
      ? "complete your registration"
      : "complete your login";

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F6FA;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6FA;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(84,118,252,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#8AA0FF 0%,#5476FC 100%);padding:36px 40px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Wellness Central</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#383F45;font-size:15px;font-weight:600;">Verification Code</p>
              <p style="margin:0 0 32px;color:#676E76;font-size:13px;line-height:1.6;">
                Use the code below to ${purposeLabel}. This code is valid for <strong>10 minutes</strong> and can only be used once.
              </p>
              <div style="background:linear-gradient(135deg,#EEF2FF 0%,#E8EFFF 100%);border:2px dashed #8AA0FF;border-radius:14px;padding:28px;text-align:center;margin-bottom:32px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#5476FC;font-family:monospace;">${code}</span>
              </div>
              <p style="margin:0;color:#9EA5AD;font-size:12px;line-height:1.6;">
                If you did not request this code, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F5F6FA;padding:20px 40px;border-top:1px solid #EBEEF5;">
              <p style="margin:0;color:#9EA5AD;font-size:11px;text-align:center;">
                © ${new Date().getFullYear()} Wellness Central. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error("Failed to send OTP email.");
  }
}
