function primeiroNomeComInicial(nomeCompleto) {
  const partes = String(nomeCompleto || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!partes.length) return 'Usuario'
  if (partes.length === 1) return partes[0]
  return `${partes[0]} ${String(partes[1]).charAt(0).toUpperCase()}.`
}

export function getDisplayUser(user = {}) {
  const authProvider = String(user.authProvider || '').toLowerCase()
  const fotoGoogle = String(user.photoURL || '').trim()
  const fotoPerfil = String(user.fotoPerfil || user.foto_snapshot || '').trim()

  const fotoExibicao =
    authProvider === 'google' && fotoGoogle
      ? fotoGoogle
      : (fotoPerfil || '/avatar-default.png')

  const nomeBase =
    String(user.nomeCompleto || '').trim() ||
    String(user.nome_snapshot || '').trim() ||
    String(user.nome || '').trim()

  const nomeExibicao = primeiroNomeComInicial(nomeBase)
  return { nomeExibicao, fotoExibicao }
}

