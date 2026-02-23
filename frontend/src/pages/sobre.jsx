import { Link } from 'react-router-dom'
import SEO from '../componentes/SEO'

const VALORES = [
  'Transparência em cada etapa da operação',
  'Simplicidade para clientes e lojistas',
  'Tecnologia moderna aplicada ao dia a dia',
  'Valorização real do comércio local',
  'Suporte humanizado e próximo',
  'Crescimento conjunto entre plataforma e cidade',
]

const DIFERENCIAIS = [
  'Taxas acessíveis para a realidade local',
  'Foco estratégico em cidades pequenas e médias',
  'Plataforma instalável como app (PWA)',
  'Arquitetura moderna com alta performance',
  'Operação multi-cidade com expansão sustentável',
  'Sistema escalável para crescer sem perder qualidade',
  'Suporte próximo para lojistas e operação local',
]

const TECNOLOGIA = [
  'Arquitetura moderna para estabilidade e evolução contínua',
  'Segurança de dados com boas práticas de mercado',
  'Performance otimizada para navegação rápida',
  'Escalabilidade preparada para novas cidades e maior volume',
  'Base tecnológica pronta para crescimento sustentável',
]

export default function SobrePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">
      <SEO
        title="Sobre o UaiFood"
        description="Conheça o UaiFood: plataforma de marketplace e delivery que fortalece o comércio local em cidades pequenas e médias."
      />

      <section className="bg-linear-to-br from-stone-950 to-stone-800 rounded-2xl p-6 md:p-8 text-white">
        <p className="inline-flex items-center rounded-full bg-red-500/20 text-red-200 text-xs font-semibold px-3 py-1 mb-4">
          Sobre o UaiFood
        </p>
        <h1 className="text-2xl md:text-4xl font-extrabold leading-tight">
          Tecnologia que aproxima pessoas e fortalece o comércio local.
        </h1>
        <p className="text-stone-200 mt-4 text-sm md:text-base leading-relaxed">
          O UaiFood conecta clientes e lojas da própria cidade com uma experiência moderna, simples e confiável.
          Nossa proposta é clara: gerar resultados para lojistas, praticidade para clientes e impacto positivo para
          a economia local.
        </p>
        <p className="text-stone-300 mt-3 text-sm md:text-base leading-relaxed">
          Mais do que delivery, somos uma plataforma de crescimento para cidades pequenas e médias.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="https://wa.me/5533998680141?text=Ol%C3%A1!%20Quero%20cadastrar%20minha%20loja%20no%20UaiFood."
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 transition-colors text-sm font-semibold"
          >
            Cadastre sua loja
          </Link>
          <Link
            to="/"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold"
          >
            Começar a pedir
          </Link>
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3">
        <h2 className="text-xl md:text-2xl font-bold text-stone-900">Quem Somos</h2>
        <p className="text-stone-600 leading-relaxed">
          O UaiFood é um marketplace e delivery multi-loja criado para acelerar a digitalização do comércio local com
          profissionalismo e acessibilidade. Atuamos com foco em cidades pequenas e médias, conectando consumidores a
          negócios locais por meio de uma plataforma tecnológica robusta e intuitiva.
        </p>
        <p className="text-stone-600 leading-relaxed">
          Com React, Node.js e recursos como PWA, notificações push e integração com impressão de pedidos, entregamos
          uma solução moderna para quem deseja vender mais, operar melhor e crescer com consistência.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="bg-white border border-stone-200 rounded-2xl p-6">
          <h3 className="text-lg md:text-xl font-bold text-stone-900 mb-3">Nossa Missão</h3>
          <p className="text-stone-600 leading-relaxed">
            Fortalecer o comércio local com tecnologia de alta qualidade, tornando o pedido online simples para o
            cliente e eficiente para o lojista. Nosso objetivo é gerar impacto positivo na cidade, ampliar
            oportunidades para os negócios e facilitar a rotina de quem compra e de quem vende.
          </p>
        </article>

        <article className="bg-white border border-stone-200 rounded-2xl p-6">
          <h3 className="text-lg md:text-xl font-bold text-stone-900 mb-3">Nossa Visão</h3>
          <p className="text-stone-600 leading-relaxed">
            Construir uma rede multi-cidade de referência em marketplace local, com crescimento sustentável e
            tecnologia acessível. Queremos expandir para novas cidades sem perder proximidade, qualidade operacional e
            foco em resultado real.
          </p>
        </article>
      </section>

      <section className="bg-white border border-stone-200 rounded-2xl p-6">
        <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-4">Nossos Valores</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {VALORES.map((valor) => (
            <li key={valor} className="text-stone-700 text-sm md:text-base">
              <span className="text-red-500 mr-2">•</span>
              {valor}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-stone-900">Como Funciona</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="bg-white border border-stone-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-3">Para Clientes</h3>
            <ol className="space-y-2 text-stone-600">
              <li>1. Escolha sua cidade e explore as lojas disponíveis.</li>
              <li>2. Faça o pedido online com poucos cliques.</li>
              <li>3. Acompanhe atualizações em tempo real.</li>
              <li>4. Receba em casa ou retire no local.</li>
            </ol>
          </article>

          <article className="bg-white border border-stone-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-3">Para Lojistas</h3>
            <ol className="space-y-2 text-stone-600">
              <li>1. Cadastro simples e rápido para começar a operar.</li>
              <li>2. Recebimento de pedidos em tempo real.</li>
              <li>3. Dashboard personalizado para gestão completa.</li>
              <li>4. Controle de produtos, estoque e operação diária.</li>
              <li>5. Notificações automáticas para mais agilidade.</li>
              <li>6. Opção de impressão automática de pedidos.</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-2xl p-6">
        <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-4">Diferenciais Competitivos</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {DIFERENCIAIS.map((item) => (
            <li key={item} className="text-stone-700 text-sm md:text-base">
              <span className="text-yellow-500 mr-2">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-3">Tecnologia e Segurança</h2>
          <ul className="space-y-2">
            {TECNOLOGIA.map((item) => (
              <li key={item} className="text-stone-600">
                <span className="text-red-500 mr-2">•</span>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-3">Impacto na Economia Local</h2>
          <p className="text-stone-600 leading-relaxed">
            Ao conectar clientes aos negócios da própria cidade, o UaiFood fortalece os comércios locais, mantém o
            dinheiro circulando na economia regional e estimula a digitalização de pequenas e médias empresas. O
            resultado é uma cidade mais competitiva, moderna e preparada para crescer.
          </p>
        </article>
      </section>

      <section className="bg-red-600 rounded-2xl p-6 md:p-8 text-white">
        <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
          O futuro do comércio local já começou. 🚀
        </h2>
        <p className="mt-3 text-red-100 leading-relaxed">
          Se você é lojista, este é o momento de levar seu negócio para um novo patamar. Se você é cliente, descubra
          uma forma prática de comprar e apoiar a economia da sua cidade.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="https://wa.me/5533998680141?text=Ol%C3%A1!%20Quero%20me%20cadastrar%20como%20lojista%20no%20UaiFood."
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white text-red-700 hover:bg-red-50 transition-colors text-sm font-semibold"
          >
            Quero cadastrar minha loja
          </Link>
          <Link
            to="/"
            className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 transition-colors text-sm font-semibold"
          >
            Quero começar a pedir
          </Link>
        </div>
      </section>
    </div>
  )
}
