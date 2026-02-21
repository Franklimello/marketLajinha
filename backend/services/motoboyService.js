const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.DATABASE_URL;
const JWT_EXPIRES = '24h';

const SALT_ROUNDS = 10;

async function listarPorLoja(lojaId) {
  return prisma.motoboy.findMany({
    where: { loja_id: lojaId },
    select: { id: true, nome: true, email: true, ativo: true, created_at: true, loja_id: true },
    orderBy: { nome: 'asc' },
  });
}

async function buscarPorId(id) {
  return prisma.motoboy.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, ativo: true, created_at: true, loja_id: true },
  });
}

async function criar(lojaId, data) {
  const senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);
  return prisma.motoboy.create({
    data: {
      loja_id: lojaId,
      nome: data.nome,
      email: data.email.toLowerCase().trim(),
      senha_hash: senhaHash,
      ativo: true,
    },
    select: { id: true, nome: true, email: true, ativo: true, created_at: true, loja_id: true },
  });
}

async function atualizar(id, data) {
  const updateData = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.ativo !== undefined) updateData.ativo = data.ativo;
  if (data.senha) updateData.senha_hash = await bcrypt.hash(data.senha, SALT_ROUNDS);

  return prisma.motoboy.update({
    where: { id },
    data: updateData,
    select: { id: true, nome: true, email: true, ativo: true, created_at: true, loja_id: true },
  });
}

async function excluir(id) {
  return prisma.motoboy.delete({ where: { id } });
}

async function login(email, senha) {
  const motoboy = await prisma.motoboy.findFirst({
    where: { email: email.toLowerCase().trim() },
    include: { loja: { select: { id: true, nome: true, slug: true, ativa: true } } },
  });

  if (!motoboy) {
    const err = new Error('Email ou senha incorretos.');
    err.status = 401;
    throw err;
  }

  if (!motoboy.ativo) {
    const err = new Error('Conta desativada. Fale com o responsável da loja.');
    err.status = 403;
    throw err;
  }

  if (!motoboy.loja.ativa) {
    const err = new Error('Esta loja está desativada.');
    err.status = 403;
    throw err;
  }

  const senhaValida = await bcrypt.compare(senha, motoboy.senha_hash);
  if (!senhaValida) {
    const err = new Error('Email ou senha incorretos.');
    err.status = 401;
    throw err;
  }

  const token = jwt.sign(
    { motoboyId: motoboy.id, lojaId: motoboy.loja_id, role: 'MOTOBOY' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return {
    token,
    motoboy: {
      id: motoboy.id,
      nome: motoboy.nome,
      email: motoboy.email,
      loja: motoboy.loja,
    },
  };
}

function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function listarPedidos(lojaId) {
  return prisma.pedidos.findMany({
    where: {
      loja_id: lojaId,
      tipo_entrega: 'ENTREGA',
      status: { in: ['APPROVED', 'IN_ROUTE'] },
    },
    orderBy: { created_at: 'desc' },
    include: {
      itens: { include: { produto: { select: { id: true, nome: true } } } },
    },
  });
}

async function atualizarStatusPedido(pedidoId, lojaId, novoStatus) {
  const permitidos = ['IN_ROUTE', 'DELIVERED'];
  if (!permitidos.includes(novoStatus)) {
    const err = new Error('Motoboy só pode marcar como "Saiu para entrega" ou "Entregue".');
    err.status = 403;
    throw err;
  }

  const pedido = await prisma.pedidos.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    const err = new Error('Pedido não encontrado.');
    err.status = 404;
    throw err;
  }
  if (pedido.loja_id !== lojaId) {
    const err = new Error('Pedido de outra loja.');
    err.status = 403;
    throw err;
  }

  return prisma.pedidos.update({
    where: { id: pedidoId },
    data: { status: novoStatus },
    include: { itens: { include: { produto: { select: { id: true, nome: true } } } } },
  });
}

module.exports = {
  listarPorLoja, buscarPorId, criar, atualizar, excluir,
  login, verificarToken, listarPedidos, atualizarStatusPedido,
};
