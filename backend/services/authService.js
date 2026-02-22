const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { sendResetEmail } = require('./emailService');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_MINUTES = 15;

async function solicitarRecuperacao(email) {
  const motoboy = await prisma.motoboy.findFirst({
    where: { email },
  });

  if (!motoboy) return;

  await prisma.passwordReset.updateMany({
    where: { motoboy_id: motoboy.id, used: false },
    data: { used: true },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordReset.create({
    data: {
      motoboy_id: motoboy.id,
      token,
      expires_at: expiresAt,
    },
  });

  await sendResetEmail(email, token).catch((err) => {
    console.error('[AUTH] Falha ao enviar email de recuperação:', err.message);
  });
}

async function redefinirSenha(token, newPassword) {
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!resetRecord || resetRecord.used || resetRecord.expires_at < new Date()) {
    const err = new Error('Token inválido ou expirado.');
    err.status = 400;
    throw err;
  }

  const motoboy = await prisma.motoboy.findUnique({
    where: { id: resetRecord.motoboy_id },
  });

  if (!motoboy) {
    const err = new Error('Token inválido ou expirado.');
    err.status = 400;
    throw err;
  }

  const senhaHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.motoboy.update({
      where: { id: motoboy.id },
      data: { senha_hash: senhaHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    }),
    prisma.passwordReset.updateMany({
      where: { motoboy_id: motoboy.id, id: { not: resetRecord.id } },
      data: { used: true },
    }),
  ]);
}

module.exports = { solicitarRecuperacao, redefinirSenha };
