import { createClient } from '@supabase/supabase-js'

export type Coordinates = [number, number]
export type ReportStatus = 'Assigned' | 'In progress' | 'Resolved'

export type Report = {
  id: string
  category: string
  title: string
  address: string
  created: string
  status: ReportStatus
  severity: 'High' | 'Medium' | 'Low'
  position: Coordinates
  image?: string
  authority: string
}

type ReportRecord = {
  id: string
  city_code: string
  category: string
  title: string
  address: string
  latitude: number
  longitude: number
  severity: Report['severity']
  status: ReportStatus
  authority: string
  photo_path: string | null
  created_at: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

export function toCityCode(city: string) {
  return city.toLowerCase().replaceAll(' ', '-')
}

function relativeTime(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours} hr ago`
  return `${Math.floor(elapsedHours / 24)} d ago`
}

export function fromReportRecord(record: ReportRecord): Report {
  return {
    id: record.id,
    category: record.category,
    title: record.title,
    address: record.address,
    created: relativeTime(record.created_at),
    status: record.status,
    severity: record.severity,
    position: [record.latitude, record.longitude],
    image: record.photo_path ? supabase?.storage.from('report-photos').getPublicUrl(record.photo_path).data.publicUrl : undefined,
    authority: record.authority,
  }
}

export async function loadCityReports(city: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('city_code', toCityCode(city))
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as unknown as ReportRecord[]).map(fromReportRecord)
}

export async function createCityReport(input: {
  city: string
  category: string
  title: string
  address: string
  position: Coordinates
  severity: Report['severity']
  authority: string
  photo?: File
}) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const cityCode = toCityCode(input.city)
  let photoPath: string | undefined

  if (input.photo) {
    const extension = input.photo.type === 'image/png' ? 'png' : input.photo.type === 'image/webp' ? 'webp' : 'jpg'
    photoPath = `${cityCode}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(photoPath, input.photo, { contentType: input.photo.type, upsert: false })

    if (uploadError) throw uploadError
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      city_code: cityCode,
      category: input.category,
      title: input.title,
      address: input.address,
      latitude: input.position[0],
      longitude: input.position[1],
      severity: input.severity,
      authority: input.authority,
      photo_path: photoPath || null,
    })
    .select('*')
    .single()

  if (error) {
    if (photoPath) await supabase.storage.from('report-photos').remove([photoPath])
    throw error
  }

  return fromReportRecord(data as unknown as ReportRecord)
}

export function subscribeToCityReports(
  city: string,
  onChange: (event: 'INSERT' | 'UPDATE' | 'DELETE', report?: Report, id?: string) => void,
  onStatus: (status: string) => void,
) {
  if (!supabase) return () => undefined

  const channel = supabase
    .channel(`reports-${toCityCode(city)}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reports',
      filter: `city_code=eq.${toCityCode(city)}`,
    }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const oldRecord = payload.old as { id?: string }
        if (oldRecord.id) onChange('DELETE', undefined, oldRecord.id)
        return
      }

      const report = fromReportRecord(payload.new as ReportRecord)
      onChange(payload.eventType, report, report.id)
    })
    .subscribe(onStatus)

  return () => { void supabase?.removeChannel(channel) }
}