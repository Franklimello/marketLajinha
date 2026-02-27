import { FiInstagram } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

export default function HomeBottomSupport({ suporteWhatsapp, suporteInstagram }) {
  return (
    <>
      <div className="mt-8 mb-4 bg-stone-950 rounded-2xl p-5 text-white animate-fade-in-up">
        <h3 className="text-lg font-bold">Tem um negócio?</h3>
        <p className="text-sm text-stone-400 mt-1 leading-relaxed">
          Cadastre sua loja no UaiFood e comece a vender online para toda a cidade!
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={`https://wa.me/${suporteWhatsapp}?text=${encodeURIComponent('Olá! Quero cadastrar minha loja no UaiFood.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 transition-colors"
          >
            <FaWhatsapp className="text-lg" />
            WhatsApp
          </a>
          <a
            href={suporteInstagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-colors"
          >
            <FiInstagram className="text-lg" />
            Instagram
          </a>
        </div>
      </div>

      <div className="text-center pb-4 space-y-1">
        <p className="text-[10px] text-stone-300">Precisa de ajuda?</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={`https://wa.me/${suporteWhatsapp}?text=${encodeURIComponent('Olá! Preciso de ajuda com o UaiFood.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-green-600 transition-colors"
          >
            <FaWhatsapp size={11} /> WhatsApp
          </a>
          <span className="text-stone-200">·</span>
          <a
            href={suporteInstagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-pink-600 transition-colors"
          >
            <FiInstagram size={11} /> Instagram
          </a>
        </div>
      </div>
    </>
  )
}
