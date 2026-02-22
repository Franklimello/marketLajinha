const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendResetEmail(email, token) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[EMAIL] SMTP não configurado. Link de reset:', `${FRONTEND_URL}/motoboy/reset-password?token=${token}`);
    return;
  }

  const resetLink = `${FRONTEND_URL}/motoboy/reset-password?token=${token}`;

  const mailOptions = {
    from: `"MarketLajinha" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Recuperação de senha — MarketLajinha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Recuperação de senha</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          Recebemos uma solicitação para redefinir sua senha no MarketLajinha.
        </p>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>15 minutos</strong>.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}"
             style="display: inline-block; background: #f59e0b; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
            Redefinir minha senha
          </a>
        </div>
        <p style="color: #999; font-size: 12px; line-height: 1.5;">
          Se você não solicitou essa alteração, ignore este email. Sua senha continuará a mesma.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 11px; text-align: center;">MarketLajinha</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendResetEmail };
