import { useMemo, useState } from 'react'
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
  onApplyDefaultSchedule = null,
  busyDefaultApply = false,
  busySlotKey = '',
  busyDayAction = false,
}) {
  const [internalSelectedDate, setInternalSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [mapModalOpen, setMapModalOpen] = useState(false)

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

  return (
    <section className="rounded-3xl border border-stone-200 bg-white shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)] overflow-hidden max-w-full">
      <div className="border-b border-stone-200 bg-linear-to-r from-stone-50 to-amber-50 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
              <FiCalendar size={15} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => updateSelectedDate(e.target.value)}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white max-w-full"
              />
            </label>

            <button
              type="button"
              onClick={() => updateSelectedDate(new Date().toISOString().slice(0, 10))}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
            >
              Hoje
            </button>
          </div>

          <div className="w-full sm:w-48 min-w-0">
            <p className="text-xs text-stone-500">Ocupacao em {formatDate(selectedDate)}</p>
            <div className="mt-1 h-2 rounded-full border border-stone-300 bg-stone-100 overflow-hidden">
              <div className="h-full bg-linear-to-r from-amber-500 to-orange-500" style={{ width: `${occupancyPct}%` }} />
            </div>
            <p className="text-xs text-stone-600 mt-1 font-numeric">{occupiedCount}/{slots.length} blocos ({occupancyPct}%)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Livres: <strong className="font-numeric">{freeCount}</strong>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            Ocupados: <strong className="font-numeric">{occupiedCount}</strong>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 col-span-2 sm:col-span-1">
            Verde = livre, Vermelho = ocupado
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        {onApplyDefaultSchedule && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 space-y-2.5">
            <p className="text-xs font-semibold text-amber-900">
              Horario padrao (Seg-Sab): aplica a faixa em todos os dias e bloqueia domingos.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-amber-900">
                Inicio
                <input
                  type="time"
                  step="1800"
                  value={defaultStartTime}
                  onChange={(e) => onDefaultStartTimeChange?.(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-2.5 py-2 text-xs text-stone-700"
                />
              </label>

              <label className="text-[11px] text-amber-900">
                Fim
                <input
                  type="time"
                  step="1800"
                  value={defaultEndTime}
                  onChange={(e) => onDefaultEndTimeChange?.(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-2.5 py-2 text-xs text-stone-700"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onApplyDefaultSchedule}
              disabled={busyDefaultApply}
              className="w-full rounded-xl border border-amber-400 bg-amber-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {busyDefaultApply ? 'Aplicando padrao...' : 'Aplicar padrao no periodo'}
            </button>
          </div>
        )}

        {onToggleDay && (
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleDay({ date: selectedDate, occupied: true })}
              disabled={busyDayAction || allFreeSlotsBlocked}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 text-center leading-tight whitespace-normal"
            >
              {busyDayAction ? 'Processando...' : 'Bloquear horarios livres do dia'}
            </button>

            <button
              type="button"
              onClick={() => onToggleDay({ date: selectedDate, occupied: false })}
              disabled={busyDayAction || manualBlockedList.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 text-center leading-tight whitespace-normal"
            >
              Liberar bloqueios manuais do dia
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-3 sm:gap-4">
          <div className="space-y-2 order-2 lg:order-1">
            <h4 className="text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
              <FiClock size={14} /> Atendimentos do dia
            </h4>

            {dayAppointments.length === 0 ? (
              <p className="text-sm text-stone-500 border border-stone-200 bg-stone-50 rounded-xl p-3">Nenhum agendamento neste dia.</p>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map((appointment) => (
                  <article key={appointment.id} className={`rounded-xl border p-3 text-sm ${statusColor(appointment.status)}`}>
                    <p className="font-semibold">
                      {appointment.effective_time || appointment.time} - {appointment.end_time}
                    </p>
                    <p>{appointment.client?.nome || 'Cliente'} - {appointment.service?.name || 'Servico'}</p>
                  </article>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-semibold text-stone-700">Bloqueios manuais</p>
              {manualBlockedList.length === 0 ? (
                <p className="text-xs text-stone-500 mt-1">Nenhum bloqueio manual para este dia.</p>
              ) : (
                <p className="text-xs text-stone-700 mt-1">{manualBlockedList.join(', ')}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 order-1 lg:order-2">
            <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-3">
              <h4 className="text-sm font-semibold text-amber-900">Editor de horarios</h4>
              <p className="text-xs text-amber-800 mt-1">
                Abra o mapa para tocar nos blocos de horario e liberar ou bloquear rapidamente.
              </p>

              <button
                type="button"
                onClick={() => setMapModalOpen(true)}
                className="mt-3 w-full rounded-xl border border-amber-500 bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Abrir mapa de horarios
              </button>
            </div>
          </div>
        </div>
      </div>

      {mapModalOpen && (
        <div className="fixed inset-0 z-130 bg-black/55 flex items-end lg:items-center justify-center lg:p-4">
          <div className="absolute inset-0" onClick={() => setMapModalOpen(false)} />

          <div className="relative z-10 bg-white border border-stone-200 w-full lg:max-w-3xl max-h-[88vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl p-2.5 space-y-2">
            <div className="mx-auto h-1 w-10 rounded-full bg-stone-300 lg:hidden" />

            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs sm:text-sm font-semibold text-stone-900">
                Mapa de horarios ({formatDate(selectedDate)})
              </h4>

              <button
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
        </div>
      )}
    </section>
  )
}
