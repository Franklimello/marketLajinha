import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiCalendar, FiClock } from 'react-icons/fi'

function buildSlots(startHour = 6, endHour = 22, stepMinutes = 30) {
  const slots = []
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

function toMinutes(timeValue) {
  const [h, m] = String(timeValue || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function fromMinutes(total) {
  const safe = Math.max(0, Number(total || 0))
  const h = String(Math.floor(safe / 60)).padStart(2, '0')
  const m = String(safe % 60).padStart(2, '0')
  return `${h}:${m}`
}

function formatDate(dateValue) {
  if (!dateValue) return '-'
  const dt = new Date(`${dateValue}T00:00:00`)
  if (!Number.isFinite(dt.getTime())) return dateValue
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusColor(status) {
  if (status === 'confirmed' || status === 'accepted') return 'border-green-200 bg-green-50 text-green-700'
  if (status === 'counter_offer') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'pending') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-stone-200 bg-stone-50 text-stone-700'
}

function keyOf(date, time) {
  return `${String(date || '')}__${String(time || '')}`
}

function DateSelector({ selectedDate, onChangeDate, onGoToday }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="inline-flex items-center gap-2 text-sm text-stone-700 min-w-0">
        <FiCalendar size={15} />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onChangeDate(e.target.value)}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 min-w-0"
        />
      </label>

      <button
        type="button"
        onClick={onGoToday}
        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
      >
        Hoje
      </button>
    </div>
  )
}

function HeaderAgenda({ selectedDate, onChangeDate }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-stone-900">Agenda</h2>
        <p className="text-xs text-stone-500 mt-0.5">Visualize e ajuste sua disponibilidade sem atrito.</p>
      </div>

      <DateSelector
        selectedDate={selectedDate}
        onChangeDate={onChangeDate}
        onGoToday={() => onChangeDate(new Date().toISOString().slice(0, 10))}
      />
    </header>
  )
}

function OccupancyBar({ occupiedCount, freeCount, occupancyPct }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-900">Ocupacao do dia</h3>
        <span className="text-xs font-medium text-stone-500">{occupiedCount} ocupados • {freeCount} livres</span>
      </div>
      <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
        <div className="h-full bg-orange-500 transition-all" style={{ width: `${occupancyPct}%` }} />
      </div>
    </section>
  )
}

function PrimaryActions({
  onOpenMap,
  onToggleDay,
  selectedDate,
  busyDayAction,
  allFreeSlotsBlocked,
  manualBlockedListLength,
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-900">Acoes principais</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenMap}
          className="min-h-[46px] rounded-xl border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Abrir agenda
        </button>

        <button
          type="button"
          onClick={() => onToggleDay?.({ date: selectedDate, occupied: true })}
          disabled={!onToggleDay || busyDayAction || allFreeSlotsBlocked}
          className="min-h-[46px] rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {busyDayAction ? 'Processando...' : 'Bloquear horarios'}
        </button>

        <button
          type="button"
          onClick={() => onToggleDay?.({ date: selectedDate, occupied: false })}
          disabled={!onToggleDay || busyDayAction || manualBlockedListLength === 0}
          className="min-h-[46px] rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Liberar bloqueios
        </button>
      </div>
    </section>
  )
}

function PresetButtons({ presets, onApplyPreset }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onApplyPreset(preset)}
          className="rounded-full border border-stone-300 bg-white px-3 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-50"
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

function WeekdaySelector({ workdaysMode, onChangeMode }) {
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
  const activeMap =
    workdaysMode === 'TODOS'
      ? [true, true, true, true, true, true, true]
      : (workdaysMode === 'SEG_SAB'
        ? [true, true, true, true, true, true, false]
        : [true, true, true, true, true, false, false])

  function handleToggle(idx) {
    if (!onChangeMode) return
    if (idx === 6) {
      onChangeMode(workdaysMode === 'TODOS' ? 'SEG_SAB' : 'TODOS')
      return
    }
    if (idx === 5) {
      onChangeMode(workdaysMode === 'SEG_SEX' ? 'SEG_SAB' : 'SEG_SEX')
      return
    }
    if (workdaysMode === 'TODOS') onChangeMode('SEG_SAB')
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label, idx) => (
        <button
          key={label}
          type="button"
          onClick={() => handleToggle(idx)}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
            activeMap[idx]
              ? 'border-orange-500 bg-orange-500 text-white'
              : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function WorkingHoursEditor({
  defaultStartTime,
  defaultEndTime,
  onDefaultStartTimeChange,
  onDefaultEndTimeChange,
  periodPresets,
  workdaysMode,
  onWorkdaysModeChange,
  onApplyDefaultSchedule,
  busyDefaultApply,
  onUndoDefaultSchedule,
  canUndoDefaultSchedule,
  busyDefaultUndo,
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-900">Horario de funcionamento</h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-stone-600">
          Inicio
          <input
            type="time"
            step="1800"
            value={defaultStartTime}
            onChange={(e) => onDefaultStartTimeChange?.(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
          />
        </label>
        <label className="text-xs text-stone-600">
          Fim
          <input
            type="time"
            step="1800"
            value={defaultEndTime}
            onChange={(e) => onDefaultEndTimeChange?.(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-stone-500">Presets rapidos</p>
        <PresetButtons
          presets={periodPresets}
          onApplyPreset={(preset) => {
            onDefaultStartTimeChange?.(preset.start)
            onDefaultEndTimeChange?.(preset.end)
          }}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-stone-500">Dias da semana</p>
        <WeekdaySelector workdaysMode={workdaysMode} onChangeMode={onWorkdaysModeChange} />
      </div>

      <button
        type="button"
        onClick={onApplyDefaultSchedule}
        disabled={!onApplyDefaultSchedule || busyDefaultApply}
        className="w-full min-h-[46px] rounded-xl border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {busyDefaultApply ? 'Aplicando horario...' : 'Aplicar horario padrao'}
      </button>

      {onUndoDefaultSchedule && (
        <button
          type="button"
          onClick={onUndoDefaultSchedule}
          disabled={!canUndoDefaultSchedule || busyDefaultUndo}
          className="w-full min-h-[42px] rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {busyDefaultUndo ? 'Desfazendo...' : 'Desfazer ultima aplicacao'}
        </button>
      )}
    </section>
  )
}

function ScheduleEditorCard({ onOpenMap }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-900">Editor de horarios</h3>
      <p className="text-xs text-stone-500">Abra o mapa para liberar ou bloquear horarios rapidamente.</p>
      <button
        type="button"
        onClick={onOpenMap}
        className="w-full min-h-[46px] rounded-xl border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Abrir mapa de horarios
      </button>
    </section>
  )
}

function AppointmentsList({ dayAppointments }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
        <FiClock size={14} /> Atendimentos do dia
      </h3>

      {dayAppointments.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum agendamento neste dia.</p>
      ) : (
        <div className="space-y-2">
          {dayAppointments.map((appointment) => (
            <article key={appointment.id} className={`rounded-xl border px-3 py-2.5 text-sm ${statusColor(appointment.status)}`}>
              <p className="font-semibold">
                {appointment.effective_time || appointment.time} - {appointment.end_time}
              </p>
              <p>{appointment.client?.nome || 'Cliente'} - {appointment.service?.name || 'Servico'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function BlockedTimesList({ blockedTimes }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-900">Bloqueios do dia</h3>
      {blockedTimes.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum bloqueio manual neste dia.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {blockedTimes.map((time) => (
            <span
              key={time}
              className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700"
            >
              {time}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export default function BookingCalendar({
  appointments = [],
  blockedSlots = [],
  selectedDate: controlledSelectedDate = '',
  onSelectedDateChange,
  onToggleSlot = null,
  onToggleDay = null,
  defaultStartTime = '08:00',
  defaultEndTime = '18:00',
  onDefaultStartTimeChange = null,
  onDefaultEndTimeChange = null,
  workdaysMode = 'SEG_SAB',
  onWorkdaysModeChange = null,
  onApplyDefaultSchedule = null,
  onUndoDefaultSchedule = null,
  busyDefaultApply = false,
  busyDefaultUndo = false,
  canUndoDefaultSchedule = false,
  busySlotKey = '',
  busyDayAction = false,
}) {
  const [internalSelectedDate, setInternalSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!mapModalOpen) return

    const prevBodyOverflow = document.body.style.overflow
    const prevBodyOverscroll = document.body.style.overscrollBehavior
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'

    const focusables = () => {
      if (!modalRef.current) return []
      return Array.from(
        modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'))
    }

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMapModalOpen(false)
        return
      }

      if (event.key !== 'Tab') return
      const nodes = focusables()
      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    requestAnimationFrame(() => closeButtonRef.current?.focus())

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = prevBodyOverflow
      document.body.style.overscrollBehavior = prevBodyOverscroll
      document.documentElement.style.overflow = prevHtmlOverflow
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
    }
  }, [mapModalOpen])

  const hasControlledDate = String(controlledSelectedDate || '').trim().length > 0
  const selectedDate = hasControlledDate ? controlledSelectedDate : internalSelectedDate

  function updateSelectedDate(value) {
    if (!value) return

    if (hasControlledDate) {
      onSelectedDateChange?.(value)
      return
    }

    setInternalSelectedDate(value)
    onSelectedDateChange?.(value)
  }

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.date === selectedDate)
      .sort((a, b) => String(a.effective_time || a.time || '').localeCompare(String(b.effective_time || b.time || '')))
  }, [appointments, selectedDate])

  const manualBlockedSet = useMemo(() => {
    return new Set(
      blockedSlots
        .filter((item) => item.date === selectedDate)
        .map((item) => keyOf(item.date, item.time))
    )
  }, [blockedSlots, selectedDate])

  const slots = useMemo(() => buildSlots(), [])

  const slotMeta = useMemo(() => {
    const map = new Map()

    for (const appointment of dayAppointments) {
      const startTime = appointment.effective_time || appointment.time || '00:00'
      const start = toMinutes(startTime)
      const duration = Number(appointment?.service?.duration_minutes || 0)
      const end = start + duration

      for (let cursor = start; cursor < end; cursor += 30) {
        const slot = fromMinutes(cursor)
        const isStart = cursor === start

        if (!map.has(slot)) {
          map.set(slot, {
            appointment,
            isStart,
          })
          continue
        }

        if (isStart) {
          map.set(slot, {
            appointment,
            isStart,
          })
        }
      }
    }

    return map
  }, [dayAppointments])

  const occupiedCount = useMemo(() => {
    return slots.filter((slot) => slotMeta.has(slot) || manualBlockedSet.has(keyOf(selectedDate, slot))).length
  }, [slots, slotMeta, manualBlockedSet, selectedDate])

  const occupancyPct = slots.length === 0
    ? 0
    : Math.round((occupiedCount / slots.length) * 100)

  const freeCount = Math.max(0, slots.length - occupiedCount)

  const manualBlockedList = useMemo(() => {
    return slots.filter((slot) => manualBlockedSet.has(keyOf(selectedDate, slot)))
  }, [slots, manualBlockedSet, selectedDate])

  const allFreeSlotsBlocked = useMemo(() => {
    const appointmentBlockedTimes = new Set(Array.from(slotMeta.keys()))
    const freeSlots = slots.filter((slot) => !appointmentBlockedTimes.has(slot))
    if (freeSlots.length === 0) return false
    return freeSlots.every((slot) => manualBlockedSet.has(keyOf(selectedDate, slot)))
  }, [slots, slotMeta, manualBlockedSet, selectedDate])

  async function handleSlotClick(slotTime, isAppointmentBusy, isManualBlocked) {
    if (!onToggleSlot || isAppointmentBusy) return
    await onToggleSlot({
      date: selectedDate,
      time: slotTime,
      occupied: !isManualBlocked,
    })
  }

  function renderSlotsMap() {
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((slot) => {
          const meta = slotMeta.get(slot)
          const appointment = meta?.appointment
          const isAppointmentBusy = !!meta
          const isManualBlocked = manualBlockedSet.has(keyOf(selectedDate, slot))
          const isBusy = isAppointmentBusy || isManualBlocked
          const slotBusyKey = keyOf(selectedDate, slot)
          const isUpdating = busySlotKey === slotBusyKey

          const tone = isBusy
            ? 'border-red-300 bg-red-50 text-red-800'
            : 'border-emerald-300 bg-emerald-50 text-emerald-800'

          const description = isUpdating
            ? 'Atualizando...'
            : (isAppointmentBusy
              ? `${appointment?.client?.nome || 'Cliente'} - ${appointment?.service?.name || 'Servico'}`
              : (isManualBlocked ? 'Bloqueado manualmente' : 'Horario livre'))

          return (
            <button
              key={slot}
              type="button"
              onClick={() => handleSlotClick(slot, isAppointmentBusy, isManualBlocked)}
              disabled={!onToggleSlot || isAppointmentBusy || isUpdating}
              className={`rounded-lg border px-1.5 py-1 min-h-[46px] text-left transition-opacity ${tone} ${!isAppointmentBusy ? 'hover:opacity-85 cursor-pointer' : 'cursor-not-allowed'} disabled:opacity-60`}
              title={isAppointmentBusy ? 'Horario ocupado por agendamento' : 'Clique para alternar bloqueio manual'}
            >
              <p className="text-[10px] font-semibold font-numeric leading-tight">{slot}</p>
              <p className="text-[9px] mt-0.5 leading-tight">{description}</p>
            </button>
          )
        })}
      </div>
    )
  }

  const periodPresets = [
    { label: 'Comercial', start: '08:00', end: '18:00' },
    { label: 'Estendido', start: '09:00', end: '19:00' },
    { label: 'Noite', start: '12:00', end: '22:00' },
  ]

  return (
    <section className="max-w-5xl mx-auto w-full rounded-2xl border border-stone-200/80 bg-stone-50/40 p-3 sm:p-4 space-y-4">
      <HeaderAgenda selectedDate={selectedDate} onChangeDate={updateSelectedDate} />

      <OccupancyBar occupiedCount={occupiedCount} freeCount={freeCount} occupancyPct={occupancyPct} />

      <PrimaryActions
        onOpenMap={() => setMapModalOpen(true)}
        onToggleDay={onToggleDay}
        selectedDate={selectedDate}
        busyDayAction={busyDayAction}
        allFreeSlotsBlocked={allFreeSlotsBlocked}
        manualBlockedListLength={manualBlockedList.length}
      />

      {onApplyDefaultSchedule && (
        <WorkingHoursEditor
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          onDefaultStartTimeChange={onDefaultStartTimeChange}
          onDefaultEndTimeChange={onDefaultEndTimeChange}
          periodPresets={periodPresets}
          workdaysMode={workdaysMode}
          onWorkdaysModeChange={onWorkdaysModeChange}
          onApplyDefaultSchedule={onApplyDefaultSchedule}
          busyDefaultApply={busyDefaultApply}
          onUndoDefaultSchedule={onUndoDefaultSchedule}
          canUndoDefaultSchedule={canUndoDefaultSchedule}
          busyDefaultUndo={busyDefaultUndo}
        />
      )}

      <ScheduleEditorCard onOpenMap={() => setMapModalOpen(true)} />

      <AppointmentsList dayAppointments={dayAppointments} />
      <BlockedTimesList blockedTimes={manualBlockedList} />

      {mapModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-130 bg-black/55 flex items-center justify-center p-3 sm:p-4 overscroll-contain">
          <div className="absolute inset-0" onClick={() => setMapModalOpen(false)} />

          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-map-title"
            className="relative z-10 bg-white border border-stone-200 w-full max-w-3xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain rounded-2xl p-2.5 space-y-2"
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-stone-300 sm:hidden" />

            <div className="flex items-center justify-between gap-3">
              <h4 id="schedule-map-title" className="text-xs sm:text-sm font-semibold text-stone-900">
                Selecionar horarios disponiveis ({formatDate(selectedDate)})
              </h4>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMapModalOpen(false)}
                className="rounded-lg border border-stone-300 px-2 py-1 text-[10px] font-medium text-stone-700 hover:bg-stone-50"
              >
                Fechar
              </button>
            </div>

            <p className="text-[10px] text-stone-500">
              Toque em blocos sem cliente para alternar entre livre e bloqueado.
            </p>

            {renderSlotsMap()}
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
