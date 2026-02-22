const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');
const { getAuth } = require('../config/firebase');

const SALT_ROUNDS = 10;

async function listarTodasLojas(req, res, next) {
  try {
    const lojas = await prisma.lojas.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { produtos: true, pedidos: true, usuarios: true } },
        usuarios: { select: { id: true, nome: true, email: true, role: true } },
      },
    });
    res.json(lojas);
  } catch (e) { next(e); }
}

async function buscarLoja(req, res, next) {
  try {
    const loja = await prisma.lojas.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { produtos: true, pedidos: true, usuarios: true } },
        usuarios: { select: { id: true, nome: true, email: true, role: true } },
        produtos: { select: { id: true, nome: true, preco: true, ativo: true, categoria: true } },
      },
    });
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    res.json(loja);
  } catch (e) { next(e); }
}

async function bloquearLoja(req, res, next) {
  try {
    const loja = await prisma.lojas.update({
      where: { id: req.params.id },
      data: { ativa: false, aberta: false },
    });
    res.json({ mensagem: `Loja "${loja.nome}" bloqueada.`, loja });
  } catch (e) { next(e); }
}

async function desbloquearLoja(req, res, next) {
  try {
    const loja = await prisma.lojas.update({
      where: { id: req.params.id },
      data: { ativa: true },
    });
    res.json({ mensagem: `Loja "${loja.nome}" desbloqueada.`, loja });
  } catch (e) { next(e); }
}

async function excluirLoja(req, res, next) {
  try {
    const loja = await prisma.lojas.findUnique({ where: { id: req.params.id } });
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    await prisma.lojas.delete({ where: { id: req.params.id } });
    res.json({ mensagem: `Loja "${loja.nome}" excluída permanentemente.` });
  } catch (e) { next(e); }
}

async function estatisticas(req, res, next) {
  try {
    const [lojas, usuarios, produtos, pedidos, clientes] = await Promise.all([
      prisma.lojas.count(),
      prisma.usuarios.count(),
      prisma.produtos.count(),
      prisma.pedidos.count(),
      prisma.clientes.count(),
    ]);
    const lojasAtivas = await prisma.lojas.count({ where: { ativa: true } });
    res.json({ lojas, lojasAtivas, usuarios, produtos, pedidos, clientes });
  } catch (e) { next(e); }
}

async function listarMotoboys(req, res, next) {
  try {
    const motoboys = await prisma.motoboy.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, ativo: true, loja_id: true, loja: { select: { nome: true } } },
    });
    res.json(motoboys);
  } catch (e) { next(e); }
}

async function resetSenhaMotoboy(req, res, next) {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 4) {
      return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 4 caracteres.' });
    }

    const motoboy = await prisma.motoboy.findUnique({ where: { id }, select: { id: true, nome: true } });
    if (!motoboy) return res.status(404).json({ erro: 'Motoboy não encontrado.' });

    const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
    await prisma.motoboy.update({ where: { id }, data: { senha_hash: senhaHash } });

    await prisma.passwordReset.updateMany({
      where: { motoboy_id: id, used: false },
      data: { used: true },
    });

    res.json({ mensagem: `Senha do motoboy "${motoboy.nome}" redefinida com sucesso.` });
  } catch (e) { next(e); }
}

async function listarLojistas(req, res, next) {
  try {
    const usuarios = await prisma.usuarios.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, role: true, firebase_uid: true, loja_id: true, loja: { select: { nome: true } } },
    });
    res.json(usuarios);
  } catch (e) { next(e); }
}

async function resetSenhaLojista(req, res, next) {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 6 caracteres.' });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { id: true, nome: true, firebase_uid: true } });
    if (!usuario) return res.status(404).json({ erro: 'Lojista não encontrado.' });

    await getAuth().updateUser(usuario.firebase_uid, { password: novaSenha });

    res.json({ mensagem: `Senha do lojista "${usuario.nome}" redefinida com sucesso.` });
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      return res.status(404).json({ erro: 'Usuário não encontrado no Firebase.' });
    }
    next(e);
  }
}

module.exports = {
  listarTodasLojas, buscarLoja, bloquearLoja, desbloquearLoja, excluirLoja, estatisticas,
  listarMotoboys, resetSenhaMotoboy, listarLojistas, resetSenhaLojista,
};
