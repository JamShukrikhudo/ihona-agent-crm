// "18 часов назад" style relative time, same idea as the Spike Admin
// reference's kanban cards — only step names an agent actually cares
// about at a glance (minutes/hours/days/months), nothing finer.
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const past = diffMs >= 0
  const abs = Math.abs(diffMs)

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day

  let value: number
  let unit: string
  if (abs < hour) {
    value = Math.max(1, Math.round(abs / minute))
    unit = pluralize(value, 'минуту', 'минуты', 'минут')
  } else if (abs < day) {
    value = Math.round(abs / hour)
    unit = pluralize(value, 'час', 'часа', 'часов')
  } else if (abs < month) {
    value = Math.round(abs / day)
    unit = pluralize(value, 'день', 'дня', 'дней')
  } else {
    value = Math.round(abs / month)
    unit = pluralize(value, 'месяц', 'месяца', 'месяцев')
  }

  return `${value} ${unit} ${past ? 'назад' : ''}`.trim()
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few
  }
  return many
}
