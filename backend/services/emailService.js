const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || 'UaiFood <onboarding@resend.dev>';
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

function buildWeeklyReportHtml(loja, resumo) {
  const totalVendido = currencyFormatter.format(Number(resumo.totalVendido || 0));
  const ticketMedio = currencyFormatter.format(Number(resumo.ticketMedio || 0));

  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 20px 24px; color: #ffffff;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.9;">Uaifood</p>
          <h1 style="margin: 8px 0 0; font-size: 22px; line-height: 1.2;">Resumo semanal da sua loja</h1>
        </div>

        <div style="padding: 22px 24px;">
          <p style="margin: 0 0 8px; color: #0f172a; font-size: 15px;">
            Olá, <strong>${loja.nome}</strong>!
          </p>
          <p style="margin: 0 0 16px; color: #475569; font-size: 13px; line-height: 1.6;">
            Aqui está o desempenho da sua loja no período de <strong>${resumo.periodoLabel}</strong>.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">Total vendido</p>
                <p style="margin: 6px 0 0; font-size: 22px; color: #0f172a; font-weight: 700;">${totalVendido}</p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 10px; margin-top: 10px; margin-left: -10px; width: calc(100% + 10px);">
            <tr>
              <td style="width: 50%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; vertical-align: top;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">Pedidos</p>
                <p style="margin: 6px 0 0; font-size: 18px; color: #0f172a; font-weight: 700;">${resumo.totalPedidos}</p>
              </td>
              <td style="width: 50%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; vertical-align: top;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">Ticket médio</p>
                <p style="margin: 6px 0 0; font-size: 18px; color: #0f172a; font-weight: 700;">${ticketMedio}</p>
              </td>
            </tr>
          </table>

          <p style="margin: 16px 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">
            Continue acompanhando seus números para tomar decisões mais rápidas e aumentar o faturamento.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendWeeklyReportEmail(loja, resumo) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurada.');
    }
    if (!loja?.email) {
      throw new Error('Email da loja não encontrado.');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildWeeklyReportHtml(loja, resumo);

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: loja.email,
      subject: '📊 Resumo da sua semana no Uaifood',
      html,
    });

    if (error) throw new Error(error.message || 'Falha ao enviar email via Resend.');
  } catch (err) {
    const error = new Error(`Erro ao enviar relatório semanal: ${err.message}`);
    error.cause = err;
    throw error;
  }
}

module.exports = { sendResetEmail, sendWeeklyReportEmail };
