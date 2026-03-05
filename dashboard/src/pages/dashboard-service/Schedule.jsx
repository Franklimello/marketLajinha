import { createElement, useEffect, useMemo, useState } from 'react'
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiColumns,
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

function dateKey(date) {
  const d = new Date(date)
  if (!Number.isFinite(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekBounds(dateValue) {
  const base = new Date(`${String(dateValue || '')}T00:00:00`)
  if (!Number.isFinite(base.getTime())) {
    const today = dateKey(new Date())
    return { from: today, to: today }
  }

  const start = new Date(base)
  const day = start.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diffToMonday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return { from: dateKey(start), to: dateKey(end) }
}

function shiftDate(dateValue, diffDays) {
  const base = new Date(`${String(dateValue || '')}T00:00:00`)
  if (!Number.isFinite(base.getTime())) return dateKey(new Date())
  base.setDate(base.getDate() + diffDays)
  return dateKey(base)
}

function formatDate(value) {
  if (!value) return '-'
  const dt = new Date(`${value}T00:00:00`)
  if (!Number.isFinite(dt.getTime())) return String(value)
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatRange(from, to) {
  if (!from || !to) return '-'
  return `${formatDate(from)} ate ${formatDate(to)}`
}

function StatCard({ icon, label, value, helper, tone }) {
  return (
    <article className={`min-w-0 rounded-2xl border p-3 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide">{label}</p>
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
  const [viewMode, setViewMode] = useState('month')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [dayRef, setDayRef] = useState(() => dateKey(new Date()))
  const [appointments, setAppointments] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busySlotKey, setBusySlotKey] = useState('')
  const [busyDayAction, setBusyDayAction] = useState(false)
  const [busyDefaultApply, setBusyDefaultApply] = useState(false)
  const [busyDefaultUndo, setBusyDefaultUndo] = useState(false)
  const [defaultStartTime, setDefaultStartTime] = useState('08:00')
  const [defaultEndTime, setDefaultEndTime] = useState('18:00')
  const [workdaysMode, setWorkdaysMode] = useState('SEG_SAB')
  const [defaultUndoContext, setDefaultUndoContext] = useState(null)

  const range = useMemo(() => {
    if (viewMode === 'day') return { from: dayRef, to: dayRef }
    if (viewMode === 'week') return weekBounds(dayRef)
    return monthBounds(month)
  }, [viewMode, month, dayRef])

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

  async function handleToggleDay({ date, occupied }) {
    setBusyDayAction(true)
    setError('')

    try {
      const res = await api.appointments.providerUpdateDay({ date, occupied })
      const updatedDay = String(res?.date || date || '')
      const blockedDayList = Array.isArray(res?.blocked_slots_current_day) ? res.blocked_slots_current_day : []

      setBlockedSlots((prev) => {
        const others = prev.filter((item) => String(item.date) !== updatedDay)
        return [...others, ...blockedDayList]
      })
    } catch (err) {
      setError(err.message || 'Nao foi possivel atualizar os horarios deste dia.')
    } finally {
      setBusyDayAction(false)
    }
  }

  async function handleApplyDefaultSchedule() {
    setBusyDefaultApply(true)
    setError('')
    try {
      const previousBlockedSlots = blockedSlots
        .filter((item) => {
          const date = String(item?.date || '')
          return date >= range.from && date <= range.to
        })
        .map((item) => ({
          date: String(item?.date || ''),
          time: String(item?.time || ''),
        }))

      await api.appointments.providerApplyDefaultSchedule({
        start_time: defaultStartTime,
        end_time: defaultEndTime,
        date_from: range.from,
        date_to: range.to,
        except_sunday: true,
        workdays_mode: workdaysMode,
      })

      const res = await api.appointments.providerSchedule(range.from, range.to)
      const appointmentsData = Array.isArray(res)
        ? res
        : (Array.isArray(res?.appointments) ? res.appointments : [])
      const blockedData = Array.isArray(res?.blocked_slots)
        ? res.blocked_slots
        : []

      setAppointments(appointmentsData)
      setBlockedSlots(blockedData)
      setDefaultUndoContext({
        date_from: range.from,
        date_to: range.to,
        blocked_slots: previousBlockedSlots,
      })
    } catch (err) {
      setError(err.message || 'Nao foi possivel aplicar o horario padrao.')
    } finally {
      setBusyDefaultApply(false)
    }
  }

  async function handleUndoDefaultSchedule() {
    if (!defaultUndoContext) return
    setBusyDefaultUndo(true)
    setError('')
    try {
      await api.appointments.providerRestoreDefaultSchedule(defaultUndoContext)
      const res = await api.appointments.providerSchedule(range.from, range.to)
      const appointmentsData = Array.isArray(res)
        ? res
        : (Array.isArray(res?.appointments) ? res.appointments : [])
      const blockedData = Array.isArray(res?.blocked_slots)
        ? res.blocked_slots
        : []
      setAppointments(appointmentsData)
      setBlockedSlots(blockedData)
      setDefaultUndoContext(null)
    } catch (err) {
      setError(err.message || 'Nao foi possivel desfazer a ultima aplicacao.')
    } finally {
      setBusyDefaultUndo(false)
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
        tone: 'border-stone-300 bg-white text-stone-800',
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
        helper: `${occupiedDays} dia(s) com bloqueio`,
        icon: FiSlash,
        tone: 'border-red-200 bg-red-50 text-red-800',
      },
    ]
  }, [appointments, blockedSlots])

  function movePeriod(diff) {
    if (viewMode === 'month') {
      const nextMonth = shiftMonth(month, diff)
      setMonth(nextMonth)
      setDayRef(`${nextMonth}-01`)
      return
    }

    if (viewMode === 'week') {
      setDayRef((prev) => shiftDate(prev, diff * 7))
      return
    }

    setDayRef((prev) => shiftDate(prev, diff))
  }

  function goToToday() {
    const today = new Date()
    setMonth(today.toISOString().slice(0, 7))
    setDayRef(dateKey(today))
  }

  function handleMonthChange(value) {
    setMonth(value)
    if (value) setDayRef(`${value}-01`)
  }

  return (
    <div className="space-y-3 pb-6">
      <section className="relative overflow-hidden rounded-2xl border border-stone-300 bg-linear-to-br from-stone-900 via-stone-800 to-amber-700 text-white p-3.5 sm:p-4 shadow-lg">
        <div className="relative grid xl:grid-cols-[1.2fr_0.9fr] gap-3 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Agenda premium</p>
            <h2 className="text-lg sm:text-xl font-semibold mt-1">Agenda do prestador</h2>
            <p className="text-xs text-stone-200 mt-1.5 max-w-2xl">
              Gerencie disponibilidade com rapidez e precisão.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="text-[11px] rounded-full border border-white/25 bg-white/10 px-2.5 py-1">1. Periodo</span>
              <span className="text-[11px] rounded-full border border-white/25 bg-white/10 px-2.5 py-1">2. Disponibilidade</span>
              <span className="text-[11px] rounded-full border border-white/25 bg-white/10 px-2.5 py-1">3. Confirmacao</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-2.5 space-y-2.5">
            <p className="text-xs uppercase tracking-wide text-amber-200">Visualizacao do periodo</p>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${viewMode === 'day' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-white/30 bg-white/10 text-white hover:bg-white/20'}`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${viewMode === 'week' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-white/30 bg-white/10 text-white hover:bg-white/20'}`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${viewMode === 'month' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-white/30 bg-white/10 text-white hover:bg-white/20'}`}
              >
                Mes
              </button>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
              <button
                type="button"
                onClick={() => movePeriod(-1)}
                className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 w-9 h-9 hover:bg-white/20"
                aria-label="Periodo anterior"
              >
                <FiChevronLeft size={16} />
              </button>

              {viewMode === 'month' ? (
                <input
                  type="month"
                  value={month}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white"
                />
              ) : (
                <input
                  type="date"
                  value={dayRef}
                  onChange={(e) => setDayRef(e.target.value)}
                  className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white"
                />
              )}

              <button
                type="button"
                onClick={() => movePeriod(1)}
                className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 w-9 h-9 hover:bg-white/20"
                aria-label="Proximo periodo"
              >
                <FiChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-stone-200 inline-flex items-center gap-1">
                <FiColumns size={12} />
                {viewMode === 'month' ? formatMonth(month) : formatRange(range.from, range.to)}
              </p>

              <button
                type="button"
                onClick={goToToday}
                className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                Ir para hoje
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
        {metrics.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando agenda...</div>
      ) : (
        <BookingCalendar
          appointments={appointments}
          blockedSlots={blockedSlots}
          selectedDate={dayRef}
          onSelectedDateChange={setDayRef}
          onToggleSlot={handleToggleSlot}
          onToggleDay={handleToggleDay}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          onDefaultStartTimeChange={setDefaultStartTime}
          onDefaultEndTimeChange={setDefaultEndTime}
          workdaysMode={workdaysMode}
          onWorkdaysModeChange={setWorkdaysMode}
          onApplyDefaultSchedule={handleApplyDefaultSchedule}
          busyDefaultApply={busyDefaultApply}
          onUndoDefaultSchedule={handleUndoDefaultSchedule}
          busyDefaultUndo={busyDefaultUndo}
          canUndoDefaultSchedule={!!defaultUndoContext}
          busySlotKey={busySlotKey}
          busyDayAction={busyDayAction}
        />
      )}
    </div>
  )
}
