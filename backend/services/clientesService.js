const { prisma } = require('../config/database');

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

async function criarEndereco(clienteId, data) {
  if (data.padrao) {
    await prisma.enderecoCliente.updateMany({
      where: { cliente_id: clienteId },
      data: { padrao: false },
    });
  }
  const qtd = await prisma.enderecoCliente.count({ where: { cliente_id: clienteId } });
  return prisma.enderecoCliente.create({
    data: { ...data, cliente_id: clienteId, padrao: data.padrao || qtd === 0 },
  });
}

async function atualizarEndereco(clienteId, enderecoId, data) {
  if (data.padrao) {
    await prisma.enderecoCliente.updateMany({
      where: { cliente_id: clienteId },
      data: { padrao: false },
    });
  }
  return prisma.enderecoCliente.update({
    where: { id: enderecoId },
    data,
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
