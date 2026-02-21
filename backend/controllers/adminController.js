const { prisma } = require('../config/database');

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

module.exports = { listarTodasLojas, buscarLoja, bloquearLoja, desbloquearLoja, excluirLoja, estatisticas };
