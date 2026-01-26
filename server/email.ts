
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(to: string, code: string, type: 'signup' | 'forgot_password'): Promise<boolean> {
  const subject = type === 'signup' 
    ? 'Verify your FocusFlow account' 
    : 'Reset your FocusFlow password';

  const html = type === 'signup' 
    ? `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 24px;">Welcome to FocusFlow!</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Thank you for signing up. Please use the verification code below to complete your registration:
        </p>
        <div style="background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          This code expires in 10 minutes. If you didn't request this, please ignore this email.
        </p>
      </div>
    `
    : `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 24px;">Reset Your Password</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          You requested to reset your password. Use the code below to set a new password:
        </p>
        <div style="background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          This code expires in 10 minutes. If you didn't request this, please ignore this email.
        </p>
      </div>
    `;

  try {
    const { error } = await resend.emails.send({
      from: 'FocusFlow <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Email send exception:', error);
    return false;
  }
}
