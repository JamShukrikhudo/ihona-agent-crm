<script setup lang="ts">
import { ChevronLeft, ChevronRight, Eye, ListTodo } from '@lucide/vue'

definePageMeta({ middleware: 'agent' })

// Nuxt's auto-import only resolves <NuxtLink> in template tag position —
// binding it to :is for the "only link if this task has a client" case
// needs the component resolved explicitly.
const NuxtLink = resolveComponent('NuxtLink')

interface CalendarTask {
  id: number
  title: string
  assignee: string | null
  dueAt: string | null
  doneAt: string | null
  leadId: number | null
  contactName: string | null
  clientId: number | null
}

const cursor = ref(new Date())
const tasks = ref<CalendarTask[]>([])
const loading = ref(true)
const query = ref('')
const assigneeFilter = ref('')

const assignees = computed(() => [...new Set(tasks.value.map((t) => t.assignee).filter((a): a is string => Boolean(a)))].sort())

const filteredTasks = computed(() =>
  tasks.value.filter((t) => {
    if (assigneeFilter.value && t.assignee !== assigneeFilter.value) {
      return false
    }
    if (query.value.trim() !== '') {
      const q = query.value.trim().toLowerCase()
      return t.title.toLowerCase().includes(q) || (t.contactName?.toLowerCase().includes(q) ?? false)
    }
    return true
  }),
)

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
)

const monthStart = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1))
const monthEnd = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 0, 23, 59, 59))

async function load() {
  loading.value = true
  try {
    tasks.value = await apiFetch<{ data: CalendarTask[] }>('/tasks', {
      params: {
        from: monthStart.value.toISOString(),
        to: monthEnd.value.toISOString(),
      },
    }).then((res) => res.data)
  } finally {
    loading.value = false
  }
}

watch(cursor, load)
onMounted(load)

function shiftMonth(delta: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

// Monday-first grid — same weekday order every ru CRM screen in this app
// already uses (see DealsBoard's column order, chessboard's floor rows).
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const tasksByDay = computed(() => {
  const map = new Map<string, CalendarTask[]>()
  for (const task of filteredTasks.value) {
    if (!task.dueAt) {
      continue
    }
    const key = dateKey(new Date(task.dueAt))
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(task)
  }
  return map
})

interface DayCell {
  date: Date
  inMonth: boolean
  isToday: boolean
  tasks: CalendarTask[]
}

const days = computed<DayCell[]>(() => {
  const first = monthStart.value
  // getDay(): 0=Sun..6=Sat → shift so Monday is 0, to match WEEKDAYS above.
  const leadingBlanks = (first.getDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - leadingBlanks)

  const today = dateKey(new Date())
  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const key = dateKey(d)
    cells.push({
      date: d,
      inMonth: d.getMonth() === cursor.value.getMonth(),
      isToday: key === today,
      tasks: tasksByDay.value.get(key) ?? [],
    })
  }
  // Six full weeks always renders, but a 5-week month leaves a trailing
  // all-blank row — trim it so short months don't look padded.
  return cells.slice(0, cells.slice(35).every((c) => !c.inMonth) ? 35 : 42)
})

function isViewing(task: CalendarTask): boolean {
  return /показ/i.test(task.title)
}

function isOverdue(task: CalendarTask): boolean {
  return task.doneAt === null && task.dueAt !== null && new Date(task.dueAt) < new Date()
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Календарь</div>
          <h1 class="font-display text-xl font-bold capitalize text-ink">{{ monthLabel }}</h1>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="rounded-full border border-line p-1.5 text-ink-soft hover:bg-paper" @click="shiftMonth(-1)">
            <ChevronLeft :size="16" />
          </button>
          <button type="button" class="rounded-full bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-dark" @click="cursor = new Date()">
            Сегодня
          </button>
          <button type="button" class="rounded-full border border-line p-1.5 text-ink-soft hover:bg-paper" @click="shiftMonth(1)">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <select v-model="assigneeFilter" class="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink">
          <option value="">Все исполнители</option>
          <option v-for="a in assignees" :key="a" :value="a">{{ a }}</option>
        </select>
        <input
          v-model="query"
          type="text"
          placeholder="Поиск по задаче или клиенту…"
          class="min-w-0 flex-1 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink sm:max-w-xs"
        />
      </div>
    </div>

    <div class="px-6 py-6">
      <div v-if="loading" class="text-sm text-ink-soft">Загрузка…</div>

      <div v-else class="overflow-hidden rounded-2xl border border-line bg-card">
        <div class="grid grid-cols-7 border-b border-line bg-paper">
          <div v-for="wd in WEEKDAYS" :key="wd" class="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            {{ wd }}
          </div>
        </div>

        <div class="grid grid-cols-7">
          <div
            v-for="cell in days"
            :key="dateKey(cell.date)"
            class="min-h-[92px] border-b border-r border-line p-1.5 last:border-r-0"
            :class="[!cell.inMonth && 'bg-paper/60', cell.isToday && 'bg-brand-50']"
          >
            <div
              class="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
              :class="[
                cell.isToday ? 'bg-brand-600 text-white' : cell.inMonth ? 'text-ink' : 'text-ink-soft/50',
              ]"
            >
              {{ cell.date.getDate() }}
            </div>

            <div class="space-y-1">
              <component
                :is="task.clientId ? NuxtLink : 'div'"
                v-for="task in cell.tasks.slice(0, 3)"
                :key="task.id"
                :to="task.clientId ? `/clients/${task.clientId}` : undefined"
                class="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-semibold"
                :class="[
                  task.doneAt
                    ? 'bg-paper text-ink-soft line-through'
                    : isOverdue(task)
                      ? 'bg-status-deposit-soft text-status-deposit'
                      : isViewing(task)
                        ? 'bg-status-free-soft text-brand-dark'
                        : 'bg-brand-50 text-brand-600',
                  task.clientId && 'hover:opacity-75',
                ]"
                :title="`${task.title}${task.contactName ? ' — ' + task.contactName : ''}`"
              >
                <component :is="isViewing(task) ? Eye : ListTodo" :size="10" class="shrink-0" />
                <span class="truncate">{{ task.contactName ?? task.title }}</span>
              </component>
              <div v-if="cell.tasks.length > 3" class="text-[10px] text-ink-soft">
                + {{ cell.tasks.length - 3 }} ещё
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
