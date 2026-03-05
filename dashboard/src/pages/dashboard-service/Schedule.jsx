import { createElement, useEffect, useMemo, useState } from 'react'
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiSlash,
} from 'react-icons/fi'
import { api } from '../../api/client'
import BookingCalendar from '../../components/booking-calendar/BookingCalendar'

function monthBounds(monthValue) {
  const raw = String(monthValue || '')
  const [year, month] = raw.split('-').map(Number)
  if (!year || !month) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    return {
      from: `${y}-${String(m).padStart(2, '0')}-01`,
      to: `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`,
    }
  }

  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

function shiftMonth(monthValue, diff) {
  const raw = String(monthValue || '')
  const [year, month] = raw.split('-').map(Number)
  if (!year || !month) return new Date().toISOString().slice(0, 7)

  const dt = new Date(year, month - 1 + diff, 1)
  const y = dt.getFullYear()
  const m = dt.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function formatMonth(monthValue) {
  const raw = String(monthValue || '')
  const [year, month] = raw.split('-').map(Number)
  if (!year || !month) return 'Mes atual'
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

function StatCard({ icon, label, value, helper, tone }) {
  return (
    <article className={`border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide">{label}</p>
        {icon ? createElement(icon, { size: 14 }) : null}
      </div>
      <p className="text-2xl font-semibold mt-1 font-numeric">{value}</p>
      <p className="text-xs mt-1 opacity-80">{helper}</p>
    </article>
  )
}

function slotKey(date, time) {
  return `${String(date || '')}__${String(time || '')}`
}

export default function ServiceSchedulePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [appointments, setAppointments] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busySlotKey, setBusySlotKey] = useState('')

  const range = useMemo(() => monthBounds(month), [month])

  useEffect(() => {
    let cancelled = false

    async function loadSchedule() {
      setLoading(true)
      setError('')
      try {
        const res = await api.appointments.providerSchedule(range.from, range.to)
        if (cancelled) return

        const appointmentsData = Array.isArray(res)
          ? res
          : (Array.isArray(res?.appointments) ? res.appointments : [])

        const blockedData = Array.isArray(res?.blocked_slots)
          ? res.blocked_slots
          : []

        setAppointments(appointmentsData)
        setBlockedSlots(blockedData)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Nao foi possivel carregar a agenda.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSchedule()
    return () => { cancelled = true }
  }, [range.from, range.to])

  async function handleToggleSlot({ date, time, occupied }) {
    const key = slotKey(date, time)
    setBusySlotKey(key)
    setError('')

    try {
      const res = await api.appointments.providerUpdateSlot({ date, time, occupied })
      const nextDate = String(res?.date || date || '')
      const nextTime = String(res?.time || time || '')

      if (String(res?.source || '') === 'appointment') return

      setBlockedSlots((prev) => {
        const filtered = prev.filter((item) => slotKey(item.date, item.time) !== slotKey(nextDate, nextTime))
        if (!res?.occupied) return filtered

        return [
          ...filtered,
          {
            id: String(res?.id || `manual-${slotKey(nextDate, nextTime)}`),
            date: nextDate,
            time: nextTime,
          },
        ]
      })
    } catch (err) {
      setError(err.message || 'Nao foi possivel atualizar este horario.')
    } finally {
      setBusySlotKey('')
    }
  }

  const metrics = useMemo(() => {
    const confirmed = appointments.filter((item) => item.status === 'confirmed' || item.status === 'accepted').length
    const pending = appointments.filter((item) => item.status === 'pending').length
    const occupiedDays = new Set([
      ...appointments.map((item) => item.date).filter(Boolean),
      ...blockedSlots.map((item) => item.date).filter(Boolean),
    ]).size

    return [
      {
        label: 'Atendimentos',
        value: appointments.length,
        helper: 'Total no periodo',
        icon: FiCalendar,
        tone: 'border-stone-300 bg-stone-100 text-stone-800',
      },
      {
        label: 'Confirmados',
        value: confirmed,
        helper: 'Aceitos ou confirmados',
        icon: FiCheckCircle,
        tone: 'border-green-200 bg-green-50 text-green-800',
      },
      {
        label: 'Pendentes',
        value: pending,
        helper: 'Aguardando resposta',
        icon: FiClock,
        tone: 'border-blue-200 bg-blue-50 text-blue-800',
      },
      {
        label: 'Bloqueios',
        value: blockedSlots.length,
        helper: `${occupiedDays} dias com ocupacao`,
        icon: FiSlash,
        tone: 'border-red-200 bg-red-50 text-red-800',
      },
    ]
  }, [appointments, blockedSlots])

  return (
    <div className="space-y-4">
      <section className="border border-stone-300 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-700 text-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Planejamento operacional</p>
            <h2 className="text-2xl font-semibold mt-1">Agenda</h2>
            <p className="text-sm text-stone-200 mt-2 max-w-2xl">
              Clique no mapa para marcar horarios livres (verde) e ocupados (vermelho).
            </p>
          </div>

          <div className="border border-white/25 bg-white/10 p-2.5">
            <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Periodo selecionado</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
                className="inline-flex items-center justify-center border border-white/30 bg-white/10 w-8 h-8 hover:bg-white/20"
                aria-label="Mes anterior"
              >
                <FiChevronLeft size={16} />
              </button>

              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border border-white/30 bg-white/10 px-3 py-1.5 text-sm text-white"
              />

              <button
                type="button"
                onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
                className="inline-flex items-center justify-center border border-white/30 bg-white/10 w-8 h-8 hover:bg-white/20"
                aria-label="Proximo mes"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
            <p className="text-xs text-stone-200 mt-2">{formatMonth(month)}</p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando agenda...</div>
      ) : (
        <BookingCalendar
          appointments={appointments}
          blockedSlots={blockedSlots}
          onToggleSlot={handleToggleSlot}
          busySlotKey={busySlotKey}
        />
      )}
    </div>
  )
}

