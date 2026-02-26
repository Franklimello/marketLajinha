/* eslint-disable no-console */
require('dotenv').config();

const cidadesService = require('../services/cidadesService');

const ESTADOS = ['MG', 'ES'];
const IBGE_URL_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

function normalizarCidade(item, estado) {
  const idIbge = Number(item?.id);
  const nome = String(item?.nome || '').trim();
  const uf = String(estado || '').trim().toUpperCase();
  if (!idIbge || !nome || !uf) return null;
  return {
    id_ibge: idIbge,
    nome,
    estado: uf,
  };
}

async function buscarCidadesEstado(estado) {
  const url = `${IBGE_URL_BASE}/${estado}/municipios`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao consultar IBGE ${estado}: HTTP ${res.status}`);
  }
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .map((item) => normalizarCidade(item, estado))
    .filter(Boolean);
}

async function run() {
  console.log('[IBGE] Iniciando sincronização de cidades (MG, ES)...');
  let total = 0;

  for (const estado of ESTADOS) {
    const cidades = await buscarCidadesEstado(estado);
    await cidadesService.upsertLote(cidades);
    total += cidades.length;
    console.log(`[IBGE] ${estado}: ${cidades.length} cidades processadas.`);
  }

  console.log(`[IBGE] Sincronização finalizada. Total processado: ${total}.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[IBGE] Erro na sincronização:', err.message);
    process.exit(1);
  });
