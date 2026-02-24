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
  const { getToken, cliente, firebaseUser } = useAuth()
  const { pathname } = useLocation()
  const isLojaPage = pathname.startsWith('/loja/')
  const [aceitouAgora, setAceitouAgora] = useState(false)

  const termosKey = useMemo(() => {
    const identity = cliente?.id || firebaseUser?.uid
    if (!identity) return ''
    return `termos:${TERMOS_VERSAO}:${identity}`
  }, [cliente?.id, firebaseUser?.uid])

  const jaAceitou = termosKey ? getLocalItem(termosKey, false) === true : true
  const precisaAceitar = Boolean(termosKey) && !jaAceitou && !aceitouAgora

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
  }, [termosKey])

  function aceitarTermos() {
    if (!termosKey) return
    setLocalItem(termosKey, true)
    setAceitouAgora(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={`flex-1 pb-20 ${isLojaPage ? 'pt-20' : 'pt-24'}`}>
        <Outlet />
      </main>
      <Footer />
      <InstallPrompt />
      {precisaAceitar && (
        <ModalAceiteTermos key={termosKey} onAccept={aceitarTermos} />
      )}
    </div>
  )
}
