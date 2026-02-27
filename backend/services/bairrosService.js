const { prisma } = require('../config/database');
const { normalizarTexto } = require('../utils/normalizacao');

async function listarPorLoja(loja_id, { incluirInativos = false } = {}) {
  return prisma.bairroTaxa.findMany({
    where: {
      loja_id,
      ...(incluirInativos ? {} : { ativo: true }),
    },
    orderBy: { nome: 'asc' },
  });
}

async function obterCidadeDaLoja(loja_id) {
  const loja = await prisma.lojas.findUnique({
    where: { id: loja_id },
    select: { cidade: true },
  });
  if (!loja || !String(loja.cidade || '').trim()) return null;

  return prisma.cidades.findFirst({
    where: {
      nome: {
        equals: String(loja.cidade).trim(),
        mode: 'insensitive',
      },
    },
    select: { id: true, nome: true },
  });
}

async function obterOuCriarBairroEstruturado({ cidade_id, nome, criado_por }) {
  const nomeNormalizado = normalizarTexto(nome);
  const nomeLimpo = String(nome || '').trim().replace(/\s+/g, ' ');
  if (!nomeNormalizado || !nomeLimpo) {
    const err = new Error('Nome de bairro inválido.');
    err.statusCode = 400;
    throw err;
  }

  const existente = await prisma.bairros.findUnique({
    where: {
      cidade_id_nome_normalizado: {
        cidade_id,
        nome_normalizado: nomeNormalizado,
      },
    },
  });
  if (existente) return existente;

  return prisma.bairros.create({
    data: {
      cidade_id,
      nome: nomeLimpo,
      nome_normalizado: nomeNormalizado,
      criado_por: criado_por || null,
      ativo: true,
    },
  });
}

async function criar(loja_id, nome, taxa, criado_por) {
  const cidadeLoja = await obterCidadeDaLoja(loja_id);
  if (!cidadeLoja) {
    const err = new Error('Defina uma cidade válida da loja antes de cadastrar bairros.');
    err.statusCode = 400;
    throw err;
  }
  const bairro = await obterOuCriarBairroEstruturado({
    cidade_id: cidadeLoja.id,
    nome,
    criado_por,
  });

  return prisma.bairroTaxa.create({
    data: { loja_id, nome: bairro.nome, taxa, bairro_id: bairro.id, ativo: true },
  });
}

async function criarVarios(loja_id, bairros, criado_por) {
  const cidadeLoja = await obterCidadeDaLoja(loja_id);
  if (!cidadeLoja) {
    const err = new Error('Defina uma cidade válida da loja antes de cadastrar bairros.');
    err.statusCode = 400;
    throw err;
  }

  const itens = Array.isArray(bairros) ? bairros : [];
  const operacoes = [];
  for (const b of itens) {
    const bairro = await obterOuCriarBairroEstruturado({
      cidade_id: cidadeLoja.id,
      nome: b.nome,
      criado_por,
    });
    operacoes.push(
      prisma.bairroTaxa.upsert({
        where: { loja_id_nome: { loja_id, nome: bairro.nome } },
        update: {
          taxa: b.taxa,
          bairro_id: bairro.id,
          ativo: true,
        },
        create: {
          loja_id,
          nome: bairro.nome,
          taxa: b.taxa,
          bairro_id: bairro.id,
          ativo: true,
        },
      })
    );
  }

  return prisma.$transaction(operacoes);
}

async function atualizar(id, data) {
  const atual = await prisma.bairroTaxa.findUnique({
    where: { id },
    select: { id: true, loja_id: true },
  });
  if (!atual) return null;

  const payload = { ...data };
  if (payload.nome !== undefined) {
    const cidadeLoja = await obterCidadeDaLoja(atual.loja_id);
    if (!cidadeLoja) {
      const err = new Error('Defina uma cidade válida da loja antes de renomear bairros.');
      err.statusCode = 400;
      throw err;
    }
    const bairro = await obterOuCriarBairroEstruturado({
      cidade_id: cidadeLoja.id,
      nome: payload.nome,
      criado_por: null,
    });
    payload.nome = bairro.nome;
    payload.bairro_id = bairro.id;
  }

  return prisma.bairroTaxa.update({
    where: { id },
    data: payload,
  });
}

async function excluir(id) {
  return prisma.bairroTaxa.delete({ where: { id } });
}

async function buscarPorId(id) {
  return prisma.bairroTaxa.findUnique({ where: { id } });
}

async function definirAtivo(id, ativo) {
  return prisma.bairroTaxa.update({
    where: { id },
    data: { ativo: !!ativo },
  });
}

module.exports = {
  listarPorLoja,
  criar,
  criarVarios,
  atualizar,
  excluir,
  buscarPorId,
  definirAtivo,
};
