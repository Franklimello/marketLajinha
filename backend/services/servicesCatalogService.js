const { prisma } = require('../config/database');

function cleanText(value) {
  return String(value || '').trim();
}

function toMoneyNumber(value) {
  return Number(value || 0);
}

function serviceToJson(service) {
  if (!service) return null;
  return {
    id: service.id,
    provider_id: service.provider_id,
    name: service.name,
    description: service.description,
    price: toMoneyNumber(service.price),
    duration_minutes: Number(service.duration_minutes || 0),
    city: service.city,
    created_at: service.created_at,
    provider: service.provider
      ? {
        id: service.provider.id,
        name: service.provider.name,
        city: service.provider.city,
      }
      : undefined,
  };
}

async function listProvidersByCity(city) {
  const cityClean = cleanText(city);
  if (!cityClean) return [];

  const providers = await prisma.userAccount.findMany({
    where: {
      account_type: 'service',
      city: { equals: cityClean, mode: 'insensitive' },
      services: { some: {} },
    },
    select: {
      id: true,
      name: true,
      city: true,
      created_at: true,
      _count: { select: { services: true } },
    },
    orderBy: { name: 'asc' },
  });

  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    city: provider.city,
    services_count: Number(provider._count?.services || 0),
    created_at: provider.created_at,
  }));
}

async function getProviderProfile(providerId, city) {
  const cityClean = cleanText(city);
  if (!providerId || !cityClean) return null;

  const provider = await prisma.userAccount.findFirst({
    where: {
      id: providerId,
      account_type: 'service',
      city: { equals: cityClean, mode: 'insensitive' },
    },
    select: {
      id: true,
      name: true,
      city: true,
      created_at: true,
      services: {
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          provider_id: true,
          name: true,
          description: true,
          price: true,
          duration_minutes: true,
          city: true,
          created_at: true,
        },
      },
    },
  });

  if (!provider) return null;

  return {
    id: provider.id,
    name: provider.name,
    city: provider.city,
    created_at: provider.created_at,
    services: provider.services.map((service) => serviceToJson(service)),
  };
}

async function listMyServices(providerId) {
  const services = await prisma.service.findMany({
    where: { provider_id: providerId },
    orderBy: { created_at: 'desc' },
    include: {
      provider: {
        select: { id: true, name: true, city: true },
      },
    },
  });

  return services.map(serviceToJson);
}

async function createService(providerAccount, payload) {
  const city = cleanText(providerAccount?.city);
  if (!city) {
    const err = new Error('Defina a cidade no perfil para cadastrar serviços.');
    err.status = 400;
    throw err;
  }

  const service = await prisma.service.create({
    data: {
      provider_id: providerAccount.id,
      name: cleanText(payload.name),
      description: cleanText(payload.description),
      price: Number(payload.price || 0),
      duration_minutes: Number(payload.duration_minutes || 0),
      city,
    },
    include: {
      provider: {
        select: { id: true, name: true, city: true },
      },
    },
  });

  return serviceToJson(service);
}

async function updateService(providerId, serviceId, payload) {
  const found = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { provider: true },
  });

  if (!found) {
    const err = new Error('Serviço não encontrado.');
    err.status = 404;
    throw err;
  }
  if (found.provider_id !== providerId) {
    const err = new Error('Você não pode editar este serviço.');
    err.status = 403;
    throw err;
  }

  const data = {};
  if (payload.name !== undefined) data.name = cleanText(payload.name);
  if (payload.description !== undefined) data.description = cleanText(payload.description);
  if (payload.price !== undefined) data.price = Number(payload.price || 0);
  if (payload.duration_minutes !== undefined) data.duration_minutes = Number(payload.duration_minutes || 0);

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data,
    include: {
      provider: {
        select: { id: true, name: true, city: true },
      },
    },
  });

  return serviceToJson(updated);
}

module.exports = {
  listProvidersByCity,
  getProviderProfile,
  listMyServices,
  createService,
  updateService,
};
