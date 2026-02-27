function removerAcentos(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarTexto(texto) {
  return removerAcentos(texto)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

module.exports = {
  removerAcentos,
  normalizarTexto,
};
