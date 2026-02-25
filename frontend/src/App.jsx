import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './componentes/header'
import Footer from './componentes/footer'
import InstallPrompt from './componentes/InstallPrompt'
import { useAuth } from './context/AuthContext'
import { setTokenGetter } from './api/client'
import { getItem as getLocalItem, setItem as setLocalItem } from './storage/localStorageService'

const TERMOS_VERSAO = 'v1'

function ModalAceiteTermos({ onAccept }) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-120 bg-black/55 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-900">Termo de Uso e Isenção</h2>
          <p className="text-xs text-stone-500 mt-1">Aceite obrigatório para continuar usando o app.</p>
        </div>
        <div className="px-5 py-4 max-h-[52vh] overflow-y-auto space-y-3 text-sm text-stone-700">
          <p>A plataforma UaiFood atua apenas como meio de conexão entre clientes e lojas parceiras.</p>
          <p>
            A UaiFood não é responsável pela produção, qualidade, entrega, atrasos, cancelamentos, trocas, reembolsos,
            disponibilidade de itens ou qualquer problema relacionado ao pedido.
          </p>
          <p>
            A UaiFood também não processa pagamentos diretamente entre cliente e loja, incluindo PIX, dinheiro, cartão
            ou outros meios acordados entre as partes.
          </p>
          <p>
            Toda responsabilidade sobre produto, atendimento, entrega, pagamento e solução de conflitos é da loja
            parceira que recebeu o pedido.
          </p>
          <p>
            Ao continuar, você declara que leu, entendeu e concorda com estes termos e com a política da plataforma.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-stone-200 bg-stone-50">
          <label className="flex items-start gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
            />
            <span>Li e aceito os Termos de Uso e Isenção de Responsabilidade.</span>
          </label>
          <button
            type="button"
            onClick={onAccept}
            disabled={!checked}
            className="mt-3 w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aceitar e continuar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { getToken, cliente, firebaseUser, carregando } = useAuth()
  const { pathname } = useLocation()
  const isLojaPage = pathname.startsWith('/loja/')
  const [aceitouAgora, setAceitouAgora] = useState(false)
  const [standaloneMode, setStandaloneMode] = useState(false)

  const termosInfo = useMemo(() => {
    if (carregando) return null

    const uid = firebaseUser?.uid ? String(firebaseUser.uid) : ''
    const clienteId = cliente?.id ? String(cliente.id) : ''
    if (!uid && !clienteId) return null

    const keyAtual = clienteId
      ? `termos:${TERMOS_VERSAO}:cliente:${clienteId}`
      : `termos:${TERMOS_VERSAO}:uid:${uid}`

    // Compatibilidade com versões anteriores (sem prefixo de tipo).
    const legadas = []
    if (clienteId) legadas.push(`termos:${TERMOS_VERSAO}:${clienteId}`)
    if (uid) legadas.push(`termos:${TERMOS_VERSAO}:${uid}`)

    return { keyAtual, uid, clienteId, legadas }
  }, [carregando, firebaseUser?.uid, cliente?.id])

  const jaAceitou = useMemo(() => {
    if (!termosInfo) return true
    if (getLocalItem(termosInfo.keyAtual, false) === true) return true
    return termosInfo.legadas.some((k) => getLocalItem(k, false) === true)
  }, [termosInfo])

  const precisaAceitar = Boolean(termosInfo) && !jaAceitou && !aceitouAgora

  useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])

  useEffect(() => {
    const savedTheme = getLocalItem('theme', null)
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
    setLocalItem('theme', initialTheme)
  }, [])

  useEffect(() => {
    setAceitouAgora(false)
  }, [termosInfo?.keyAtual])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const computeStandalone = () => {
      const isStandalone = media.matches || window.navigator.standalone === true
      setStandaloneMode(!!isStandalone)
      document.documentElement.classList.toggle('app-standalone', !!isStandalone)
    }

    computeStandalone()
    media.addEventListener('change', computeStandalone)
    window.addEventListener('appinstalled', computeStandalone)

    return () => {
      media.removeEventListener('change', computeStandalone)
      window.removeEventListener('appinstalled', computeStandalone)
    }
  }, [])

  function aceitarTermos() {
    if (!termosInfo) return

    // Persiste em chave atual e chaves de compatibilidade para evitar "flash".
    setLocalItem(termosInfo.keyAtual, true)
    for (const legacyKey of termosInfo.legadas) setLocalItem(legacyKey, true)

    setAceitouAgora(true)
  }

  return (
    <div className={`app-shell min-h-screen flex flex-col ${standaloneMode ? 'app-shell--standalone' : ''}`}>
      <Header />
      <main
        className={`app-main flex-1 ${isLojaPage ? 'pt-20' : 'pt-24'} ${
          standaloneMode
            ? (isLojaPage ? 'pt-[calc(5rem+env(safe-area-inset-top))]' : 'pt-[calc(6rem+env(safe-area-inset-top))]')
            : ''
        } pb-[calc(5rem+env(safe-area-inset-bottom))]`}
      >
        <Outlet />
      </main>
      <Footer />
      <InstallPrompt />
      {precisaAceitar && (
        <ModalAceiteTermos key={termosInfo?.keyAtual} onAccept={aceitarTermos} />
      )}
    </div>
  )
}
