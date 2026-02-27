const { prisma } = require('../config/database');
const { normalizarTexto } = require('../utils/normalizacao');

const INCLUDE_ENDERECOS = { enderecos: { orderBy: { padrao: 'desc' } } };

async function buscarPorFirebaseUid(firebaseUid) {
  return prisma.clientes.findUnique({
    where: { firebase_uid: firebaseUid },
    include: INCLUDE_ENDERECOS,
  });
}

async function buscarPorId(id) {
  return prisma.clientes.findUnique({
    where: { id },
    include: INCLUDE_ENDERECOS,
  });
}

async function criar(data) {
  return prisma.clientes.create({
    data,
    include: INCLUDE_ENDERECOS,
  });
}

async function atualizar(id, data) {
  return prisma.clientes.update({
    where: { id },
    data,
    include: INCLUDE_ENDERECOS,
  });
}

// ---- Endereços ----

async function listarEnderecos(clienteId) {
  return prisma.enderecoCliente.findMany({
    where: { cliente_id: clienteId },
    orderBy: { padrao: 'desc' },
  });
}

async function resolverCidade(cidadeInput) {
  const raw = String(cidadeInput || '').trim();
  if (!raw) return null;

  const porId = await prisma.cidades.findUnique({
    where: { id: raw },
    select: { id: true, nome: true, estado: true },
  });
  if (porId) return porId;

  return prisma.cidades.findFirst({
    where: { nome: { equals: raw, mode: 'insensitive' } },
    select: { id: true, nome: true, estado: true },
    orderBy: [{ estado: 'asc' }, { nome: 'asc' }],
  });
}

async function obterOuCriarBairro({ cidadeId, nomeBairro }) {
  const nome = String(nomeBairro || '').trim().replace(/\s+/g, ' ');
  const nomeNormalizado = normalizarTexto(nome);
  if (!nome || !nomeNormalizado) return null;

  const existente = await prisma.bairros.findUnique({
    where: { cidade_id_nome_normalizado: { cidade_id: cidadeId, nome_normalizado: nomeNormalizado } },
    select: { id: true, nome: true },
  });
  if (existente) return existente;

  return prisma.bairros.create({
    data: {
      cidade_id: cidadeId,
      nome,
      nome_normalizado: nomeNormalizado,
      criado_por: null,
      ativo: true,
    },
    select: { id: true, nome: true },
  });
}

async function normalizarDadosEndereco(data) {
  const cidade = await resolverCidade(data?.cidade);
  if (!cidade) {
    const err = new Error('Cidade inválida. Selecione uma cidade cadastrada.');
    err.statusCode = 400;
    throw err;
  }

  const bairro = await obterOuCriarBairro({ cidadeId: cidade.id, nomeBairro: data?.bairro });
  if (!bairro) {
    const err = new Error('Bairro inválido.');
    err.statusCode = 400;
    throw err;
  }

  return {
    apelido: String(data?.apelido || '').trim(),
    cidade: cidade.nome,
    bairro: bairro.nome,
    bairro_id: bairro.id,
    rua: String(data?.rua || '').trim(),
    numero: String(data?.numero || '').trim(),
    complemento: String(data?.complemento || '').trim(),
    referencia: String(data?.referencia || '').trim(),
    padrao: !!data?.padrao,
  };
}

async function criarEndereco(clienteId, data) {
  const dadosNormalizados = await normalizarDadosEndereco(data);
  if (data.padrao) {
    await prisma.enderecoCliente.updateMany({
      where: { cliente_id: clienteId },
      data: { padrao: false },
    });
  }
  const qtd = await prisma.enderecoCliente.count({ where: { cliente_id: clienteId } });
  return prisma.enderecoCliente.create({
    data: { ...dadosNormalizados, cliente_id: clienteId, padrao: dadosNormalizados.padrao || qtd === 0 },
  });
}

async function atualizarEndereco(clienteId, enderecoId, data) {
  const dadosNormalizados = await normalizarDadosEndereco(data);
  if (dadosNormalizados.padrao) {
    await prisma.enderecoCliente.updateMany({
      where: { cliente_id: clienteId },
      data: { padrao: false },
    });
  }
  return prisma.enderecoCliente.update({
    where: { id: enderecoId },
    data: dadosNormalizados,
  });
}

async function definirPadrao(clienteId, enderecoId) {
  await prisma.enderecoCliente.updateMany({
    where: { cliente_id: clienteId },
    data: { padrao: false },
  });
  return prisma.enderecoCliente.update({
    where: { id: enderecoId },
    data: { padrao: true },
  });
}

async function excluirEndereco(enderecoId) {
  return prisma.enderecoCliente.delete({ where: { id: enderecoId } });
}

module.exports = {
  buscarPorFirebaseUid,
  buscarPorId,
  criar,
  atualizar,
  listarEnderecos,
  criarEndereco,
  atualizarEndereco,
  definirPadrao,
  excluirEndereco,
};
