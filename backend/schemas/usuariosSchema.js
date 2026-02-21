const { z } = require('zod');

const schemaUsuarios = z.object({
  loja_id: z.string().cuid(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  firebase_uid: z.string().min(1, 'firebase_uid é obrigatório'),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
});

const schemaUsuariosPut = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
});

module.exports = { schemaUsuarios, schemaUsuariosPut };
