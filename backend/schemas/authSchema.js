const { z } = require('zod');

const schemaForgotPassword = z.object({
  email: z.string().email('Email inválido.').transform((v) => v.toLowerCase().trim()),
});

const schemaResetPassword = z.object({
  token: z.string().min(1, 'Token é obrigatório.'),
  newPassword: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres.')
    .max(128, 'Senha muito longa.'),
});

module.exports = { schemaForgotPassword, schemaResetPassword };
