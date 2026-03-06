import { useEffect, useMemo, useState } from 'react'
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

function dateKey(date) {
  const d = new Date(date)
  if (!Number.isFinite(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function slotKey(date, time) {
  return `${String(date || '')}__${String(time || '')}`
}

export default function ServiceSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [monthRef, setMonthRef] = useState(() => new Date().toISOString().slice(0, 7))
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

  const range = useMemo(() => monthBounds(monthRef), [monthRef])

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

  function handleSelectedDateChange(value) {
    const next = String(value || '')
    setSelectedDate(next)
    if (next.length >= 7) setMonthRef(next.slice(0, 7))
  }

  return (
    <div className="bg-stone-100/70 min-h-full -mx-2 sm:mx-0 px-2 sm:px-0 pb-6">
      <div className="max-w-5xl mx-auto space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">
            Carregando agenda...
          </div>
        ) : (
          <BookingCalendar
            appointments={appointments}
            blockedSlots={blockedSlots}
            selectedDate={selectedDate}
            onSelectedDateChange={handleSelectedDateChange}
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
    </div>
  )
}
