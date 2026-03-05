const { prisma } = require('../config/database');

const ACCOUNT_TYPES = new Set(['store', 'service']);

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeAccountType(value) {
  const normalized = cleanText(value).toLowerCase();
  if (!ACCOUNT_TYPES.has(normalized)) return 'store';
  return normalized;
}

async function findByFirebaseUid(firebaseUid) {
  if (!firebaseUid) return null;
  return prisma.userAccount.findUnique({ where: { firebase_uid: firebaseUid } });
}

async function findById(id) {
  if (!id) return null;
  return prisma.userAccount.findUnique({ where: { id } });
}

async function getOrCreateFromFirebase(firebaseDecoded) {
  const firebaseUid = cleanText(firebaseDecoded?.uid);
  if (!firebaseUid) {
    const err = new Error('Token Firebase obrigatório.');
    err.status = 401;
    throw err;
  }

  const existing = await findByFirebaseUid(firebaseUid);
  if (existing) return existing;

  const usuarioLoja = await prisma.usuarios.findUnique({
    where: { firebase_uid: firebaseUid },
    select: { nome: true, email: true },
  });

  return prisma.userAccount.create({
    data: {
      firebase_uid: firebaseUid,
      email: cleanText(firebaseDecoded?.email || usuarioLoja?.email),
      name: cleanText(firebaseDecoded?.name || usuarioLoja?.nome || firebaseDecoded?.email || 'Usuário'),
      account_type: 'store',
      city: '',
    },
  });
}

async function registerAccountType(firebaseDecoded, payload = {}) {
  const account = await getOrCreateFromFirebase(firebaseDecoded);
  const accountType = normalizeAccountType(payload.accountType || account.account_type);
  const nextData = {
    account_type: accountType,
    email: cleanText(firebaseDecoded?.email || account.email),
    name: cleanText(payload.name || firebaseDecoded?.name || account.name || firebaseDecoded?.email || 'Usuário'),
  };

  if (payload.city !== undefined) {
    nextData.city = cleanText(payload.city);
  }

  return prisma.userAccount.update({
    where: { id: account.id },
    data: nextData,
  });
}

async function updateMyProfile(firebaseDecoded, payload = {}) {
  const account = await getOrCreateFromFirebase(firebaseDecoded);
  const data = {};

  if (payload.name !== undefined) data.name = cleanText(payload.name);
  if (payload.city !== undefined) data.city = cleanText(payload.city);
  if (payload.profile_image_url !== undefined) data.profile_image_url = cleanText(payload.profile_image_url);
  if (payload.about !== undefined) data.about = cleanText(payload.about);
  if (payload.phone !== undefined) data.phone = cleanText(payload.phone);
  if (payload.whatsapp !== undefined) data.whatsapp = cleanText(payload.whatsapp);
  if (payload.instagram !== undefined) data.instagram = cleanText(payload.instagram);
  if (payload.address !== undefined) data.address = cleanText(payload.address);
  if (payload.business_hours !== undefined) data.business_hours = cleanText(payload.business_hours);

  if (payload.accountType !== undefined) {
    data.account_type = normalizeAccountType(payload.accountType);
  }

  if (Object.keys(data).length === 0) return account;

  return prisma.userAccount.update({
    where: { id: account.id },
    data,
  });
}

async function requireServiceProvider(firebaseDecoded) {
  const account = await getOrCreateFromFirebase(firebaseDecoded);
  if (account.account_type !== 'service') {
    const err = new Error('Acesso permitido apenas para contas de serviço.');
    err.status = 403;
    throw err;
  }
  if (account.is_active === false) {
    const err = new Error('Conta de prestador desativada pelo administrador.');
    err.status = 403;
    throw err;
  }
  return account;
}

function toPublicAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    firebase_uid: account.firebase_uid,
    name: account.name,
    email: account.email,
    accountType: account.account_type,
    is_active: account.is_active !== false,
    city: account.city,
    profile_image_url: account.profile_image_url || '',
    about: account.about || '',
    phone: account.phone || '',
    whatsapp: account.whatsapp || '',
    instagram: account.instagram || '',
    address: account.address || '',
    business_hours: account.business_hours || '',
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

module.exports = {
  ACCOUNT_TYPES,
  normalizeAccountType,
  findByFirebaseUid,
  findById,
  getOrCreateFromFirebase,
  registerAccountType,
  updateMyProfile,
  requireServiceProvider,
  toPublicAccount,
};
