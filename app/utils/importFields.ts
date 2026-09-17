import type { UnitStatus } from '~/stores/useUnitsStore'

export interface SystemField {
  key: 'building' | 'unitId' | 'floor' | 'rooms' | 'area' | 'price' | 'status'
  label: string
  required: boolean
  synonyms: string[]
}

// Order shown in the mapping table — matches the approved prototype.
export const SYSTEM_FIELDS: SystemField[] = [
  { key: 'building', label: 'Корпус', required: false, synonyms: ['корпус', 'дом', 'building', 'block'] },
  { key: 'unitId', label: 'Номер квартиры', required: false, synonyms: ['номер', 'id', 'квартир', 'unit', '№'] },
  { key: 'floor', label: 'Этаж', required: true, synonyms: ['этаж', 'floor', 'эт.'] },
  { key: 'rooms', label: 'Комнат', required: false, synonyms: ['комнат', 'room', 'комн'] },
  { key: 'area', label: 'Площадь, м²', required: true, synonyms: ['площад', 'area', 'м2', 'м²', 'кв.м'] },
  { key: 'price', label: 'Цена, TJS', required: true, synonyms: ['цена', 'price', 'стоимост', 'сумма'] },
  { key: 'status', label: 'Статус', required: false, synonyms: ['статус', 'status', 'состояни'] },
]

export type ColumnMapping = Record<SystemField['key'], string>

export function normalize(s: unknown): string {
  return String(s ?? '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '')
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping = {} as ColumnMapping
  for (const field of SYSTEM_FIELDS) {
    const hit = headers.find((h) => {
      const n = normalize(h)
      // A synonym like "№" or "м²" normalizes down to "" or a single
      // character once its non-alphanumeric symbols are stripped — and an
      // empty/1-char needle matches almost any header via includes(),
      // which is how "Комн." ended up "detected" as the area column.
      return field.synonyms.some((syn) => {
        const normSyn = normalize(syn)
        return normSyn.length >= 2 && n.includes(normSyn)
      })
    })
    mapping[field.key] = hit ?? ''
  }
  return mapping
}

export function parseStatus(raw: unknown): UnitStatus {
  const n = normalize(raw)
  if (!n) {
    return 'free'
  }
  if (n.includes('продан') || n.includes('sold')) {
    return 'sold'
  }
  if (n.includes('задат') || n.includes('deposit')) {
    return 'deposit'
  }
  if (n.includes('брон') || n.includes('reserv')) {
    return 'reserved'
  }
  return 'free'
}

export interface ParsedSheet {
  fileName: string
  headers: string[]
  rows: unknown[][]
}

export interface ImportRow {
  row: number
  building: string
  floor: number
  label: string | null
  rooms: number | null
  area: number
  price: number
  status: UnitStatus
}

export interface SkippedRow {
  row: number
  reasons: string[]
}

/** Client-side validation only — floor/area/price present and numeric.
 * The backend still re-checks (duplicate label within a building) since
 * that isn't knowable from the file alone. */
export function buildResult(sheet: ParsedSheet, mapping: ColumnMapping): { created: ImportRow[]; skipped: SkippedRow[] } {
  const created: ImportRow[] = []
  const skipped: SkippedRow[] = []

  sheet.rows.forEach((row, idx) => {
    const get = (key: SystemField['key']): unknown => {
      const col = mapping[key]
      if (!col) {
        return null
      }
      const colIdx = sheet.headers.indexOf(col)
      return colIdx > -1 ? row[colIdx] : null
    }

    const floor = Number.parseInt(String(get('floor') ?? ''), 10)
    const area = Number.parseFloat(String(get('area') ?? ''))
    const price = Number.parseFloat(String(get('price') ?? '').replace(/[^\d.]/g, ''))

    const reasons: string[] = []
    if (!Number.isFinite(floor)) {
      reasons.push('не указан этаж')
    }
    if (!Number.isFinite(area) || area <= 0) {
      reasons.push('некорректная площадь')
    }
    if (!Number.isFinite(price) || price <= 0) {
      reasons.push('некорректная цена')
    }

    if (reasons.length > 0) {
      skipped.push({ row: idx + 2, reasons }) // +2: header row + 1-indexed
      return
    }

    const rooms = Number.parseInt(String(get('rooms') ?? ''), 10)
    created.push({
      row: idx + 2,
      building: String(get('building') ?? ''),
      floor,
      label: get('unitId') ? String(get('unitId')) : null,
      rooms: Number.isFinite(rooms) ? rooms : null,
      area,
      price,
      status: parseStatus(get('status')),
    })
  })

  return { created, skipped }
}
