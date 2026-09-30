import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  ArrowUpRight, Bell, Camera, Check, ChevronDown, Clock3, Crosshair,
  Filter, LocateFixed, MapPin, Menu, Plus, Recycle, Search, Send, ShieldCheck,
  Sparkles, Trash2, X,
} from 'lucide-react'
import { createCityReport, loadCityReports, subscribeToCityReports, supabase, supabaseConfigWarning } from './lib/reports'
import type { Coordinates, Report } from './lib/reports'
import 'leaflet/dist/leaflet.css'
import './Dashboard.css'

type ReportFilter = 'All reports' | 'Open' | 'Resolved'

const categories = ['Illegal dumping', 'Overflowing bin', 'Street litter', 'Hazardous waste', 'Other']
type CityConfig = { center: Coordinates; authorities: { name: string; position: Coordinates }[]; reports: Report[] }

const cities: Record<string, CityConfig> = {
  'New Delhi': {
    center: [28.6139, 77.209],
    authorities: [
      { name: 'MCD Central Zone Team', position: [28.6328, 77.2197] },
      { name: 'NDMC Sanitation Team', position: [28.6147, 77.1995] },
      { name: 'MCD South Zone Team', position: [28.5682, 77.2118] },
    ],
    reports: [
      { id: 'CW-2841', category: 'Illegal dumping', title: 'Construction debris on footpath', address: 'Ajmal Khan Road, Karol Bagh', created: '8 min ago', status: 'Assigned', severity: 'High', position: [28.6512, 77.1907], authority: 'MCD Central Zone Team' },
      { id: 'CW-2838', category: 'Overflowing bin', title: 'Community bin overflow', address: 'Janpath Market, Connaught Place', created: '21 min ago', status: 'In progress', severity: 'Medium', position: [28.6263, 77.2194], authority: 'NDMC Sanitation Team' },
      { id: 'CW-2832', category: 'Street litter', title: 'Litter near bus shelter', address: 'Lodhi Road, Lodhi Colony', created: '46 min ago', status: 'Assigned', severity: 'Low', position: [28.5897, 77.2273], authority: 'MCD South Zone Team' },
      { id: 'CW-2827', category: 'Illegal dumping', title: 'Bulky waste left curbside', address: 'Chandni Chowk Road, Old Delhi', created: '1 hr ago', status: 'Resolved', severity: 'Medium', position: [28.6506, 77.2303], authority: 'MCD Central Zone Team' },
    ],
  },
  Mumbai: {
    center: [19.076, 72.8777],
    authorities: [
      { name: 'BMC A Ward Response', position: [18.9352, 72.8355] },
      { name: 'BMC G North Ward Response', position: [19.0178, 72.8562] },
      { name: 'BMC K West Ward Response', position: [19.1136, 72.8267] },
    ],
    reports: [
      { id: 'CW-2841', category: 'Illegal dumping', title: 'Renovation waste on pavement', address: 'LBS Marg, Kurla West', created: '8 min ago', status: 'Assigned', severity: 'High', position: [19.0653, 72.8793], authority: 'BMC G North Ward Response' },
      { id: 'CW-2838', category: 'Overflowing bin', title: 'Market bin needs collection', address: 'Hill Road, Bandra West', created: '21 min ago', status: 'In progress', severity: 'Medium', position: [19.055, 72.8295], authority: 'BMC G North Ward Response' },
      { id: 'CW-2832', category: 'Street litter', title: 'Litter near BEST stop', address: 'SV Road, Andheri West', created: '46 min ago', status: 'Assigned', severity: 'Low', position: [19.1197, 72.8464], authority: 'BMC K West Ward Response' },
      { id: 'CW-2827', category: 'Illegal dumping', title: 'Bulky waste near the kerb', address: 'Colaba Causeway, Colaba', created: '1 hr ago', status: 'Resolved', severity: 'Medium', position: [18.922, 72.8322], authority: 'BMC A Ward Response' },
    ],
  },
  Bengaluru: {
    center: [12.9716, 77.5946],
    authorities: [
      { name: 'BBMP East Zone Team', position: [12.9784, 77.6408] },
      { name: 'BBMP South Zone Team', position: [12.925, 77.5938] },
      { name: 'BBMP West Zone Team', position: [12.9781, 77.5581] },
    ],
    reports: [
      { id: 'CW-2841', category: 'Illegal dumping', title: 'Building waste beside road', address: '100 Feet Road, Indiranagar', created: '8 min ago', status: 'Assigned', severity: 'High', position: [12.9784, 77.6408], authority: 'BBMP East Zone Team' },
      { id: 'CW-2838', category: 'Overflowing bin', title: 'Public bin overflow', address: 'Commercial Street, Shivajinagar', created: '21 min ago', status: 'In progress', severity: 'Medium', position: [12.9831, 77.605], authority: 'BBMP East Zone Team' },
      { id: 'CW-2832', category: 'Street litter', title: 'Litter near bus stop', address: 'Jayanagar 4th Block', created: '46 min ago', status: 'Assigned', severity: 'Low', position: [12.925, 77.5838], authority: 'BBMP South Zone Team' },
      { id: 'CW-2827', category: 'Illegal dumping', title: 'Discarded furniture on footpath', address: 'Malleshwaram 8th Cross', created: '1 hr ago', status: 'Resolved', severity: 'Medium', position: [13.0068, 77.569], authority: 'BBMP West Zone Team' },
    ],
  },
  Chennai: {
    center: [13.0827, 80.2707],
    authorities: [
      { name: 'GCC Central Zone Team', position: [13.0732, 80.2569] },
      { name: 'GCC North Zone Team', position: [13.1067, 80.2873] },
      { name: 'GCC South Zone Team', position: [13.0358, 80.24] },
    ],
    reports: [
      { id: 'CW-2841', category: 'Illegal dumping', title: 'Construction waste on service lane', address: 'Anna Salai, Thousand Lights', created: '8 min ago', status: 'Assigned', severity: 'High', position: [13.0612, 80.2544], authority: 'GCC Central Zone Team' },
      { id: 'CW-2838', category: 'Overflowing bin', title: 'Street bin overflow', address: 'T Nagar Bus Stand, T Nagar', created: '21 min ago', status: 'In progress', severity: 'Medium', position: [13.0418, 80.2337], authority: 'GCC South Zone Team' },
      { id: 'CW-2832', category: 'Street litter', title: 'Litter near MTC stop', address: 'Broadway, George Town', created: '46 min ago', status: 'Assigned', severity: 'Low', position: [13.0912, 80.2865], authority: 'GCC North Zone Team' },
      { id: 'CW-2827', category: 'Illegal dumping', title: 'Bulky waste at the kerb', address: 'Marina Loop Road, Triplicane', created: '1 hr ago', status: 'Resolved', severity: 'Medium', position: [13.0555, 80.2824], authority: 'GCC Central Zone Team' },
    ],
  },
  Hyderabad: {
    center: [17.385, 78.4867],
    authorities: [
      { name: 'GHMC Khairatabad Circle Team', position: [17.405, 78.4693] },
      { name: 'GHMC Secunderabad Circle Team', position: [17.4399, 78.4983] },
      { name: 'GHMC Serilingampally Circle Team', position: [17.4483, 78.359] },
    ],
    reports: [
      { id: 'CW-2841', category: 'Illegal dumping', title: 'Building debris on roadside', address: 'Road No. 1, Banjara Hills', created: '8 min ago', status: 'Assigned', severity: 'High', position: [17.4156, 78.4347], authority: 'GHMC Khairatabad Circle Team' },
      { id: 'CW-2838', category: 'Overflowing bin', title: 'Community bin overflow', address: 'Abids Road, Abids', created: '21 min ago', status: 'In progress', severity: 'Medium', position: [17.3892, 78.4781], authority: 'GHMC Khairatabad Circle Team' },
      { id: 'CW-2832', category: 'Street litter', title: 'Litter near bus stop', address: 'Paradise Circle, Secunderabad', created: '46 min ago', status: 'Assigned', severity: 'Low', position: [17.4401, 78.4919], authority: 'GHMC Secunderabad Circle Team' },
      { id: 'CW-2827', category: 'Illegal dumping', title: 'Discarded furniture on footpath', address: 'Miyapur Main Road, Miyapur', created: '1 hr ago', status: 'Resolved', severity: 'Medium', position: [17.4968, 78.357], authority: 'GHMC Serilingampally Circle Team' },
    ],
  },
  Kolkata: {
    center: [22.5726, 88.3639],
    authorities: [
      { name: 'KMC Central Borough Team', position: [22.5726, 88.3568] },
      { name: 'KMC North Borough Team', position: [22.6012, 88.369] },
      { name: 'KMC South Borough Team', position: [22.5197, 88.35] },
    ],
    reports: [
      { id: 'CW-2841', category: 'Illegal dumping', title: 'Construction waste on pavement', address: 'Park Street, Park Street Area', created: '8 min ago', status: 'Assigned', severity: 'High', position: [22.5535, 88.3531], authority: 'KMC Central Borough Team' },
      { id: 'CW-2838', category: 'Overflowing bin', title: 'Market bin needs collection', address: 'College Street, Bowbazar', created: '21 min ago', status: 'In progress', severity: 'Medium', position: [22.5747, 88.3625], authority: 'KMC Central Borough Team' },
      { id: 'CW-2832', category: 'Street litter', title: 'Litter near bus stop', address: 'Shyambazar Five Point Crossing', created: '46 min ago', status: 'Assigned', severity: 'Low', position: [22.6011, 88.373], authority: 'KMC North Borough Team' },
      { id: 'CW-2827', category: 'Illegal dumping', title: 'Bulky waste left curbside', address: 'Gariahat Road, Ballygunge', created: '1 hr ago', status: 'Resolved', severity: 'Medium', position: [22.5208, 88.365], authority: 'KMC South Borough Team' },
    ],
  },
}

function reportMarker(severity: Report['severity'], selected = false) {
  const tone = severity === 'High' ? 'coral' : severity === 'Medium' ? 'gold' : 'green'
  return L.divIcon({
    className: 'report-marker-shell',
    html: `<span class="report-marker report-marker--${tone}${selected ? ' report-marker--selected' : ''}"><i></i></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const hubMarker = L.divIcon({
  className: 'hub-marker-shell',
  html: '<span class="hub-marker"><i></i></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

function MapClickPicker({ onPick }: { onPick: (position: Coordinates) => void }) {
  useMapEvents({ click: (event) => onPick([event.latlng.lat, event.latlng.lng]) })
  return null
}

function MapRecenter({ position }: { position: Coordinates }) {
  const map = useMap()
  useEffect(() => { map.flyTo(position, map.getZoom(), { duration: 0.5 }) }, [map, position])
  return null
}

function findNearestAuthority(position: Coordinates, authorities: CityConfig['authorities']) {
  return authorities.reduce((nearest, authority) => {
    const distance = Math.hypot(position[0] - authority.position[0], position[1] - authority.position[1])
    return distance < nearest.distance ? { name: authority.name, distance } : nearest
  }, { name: authorities[0].name, distance: Number.POSITIVE_INFINITY }).name
}

function Dashboard() {
  const [city, setCity] = useState('New Delhi')
  const [reports, setReports] = useState(supabase ? [] : cities['New Delhi'].reports)
  const [databaseStatus, setDatabaseStatus] = useState<'demo' | 'connecting' | 'connected' | 'error'>(supabase ? 'connecting' : 'demo')
  const [databaseError, setDatabaseError] = useState(supabaseConfigWarning)
  const [filter, setFilter] = useState<ReportFilter>('All reports')
  const [search, setSearch] = useState('')
  const [activeNav, setActiveNav] = useState('Overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    supabase ? [] : cities['New Delhi'].reports.map((report) => report.id),
  )
  const [notice, setNotice] = useState('')
  const [location, setLocation] = useState<Coordinates>(cities['New Delhi'].center)
  const [locationLabel, setLocationLabel] = useState('New Delhi, India · Map center')
  const [category, setCategory] = useState(categories[0])
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const cityConfig = cities[city]

  const openCount = reports.filter((report) => report.status !== 'Resolved').length
  const urgentCount = reports.filter((report) => report.status !== 'Resolved' && report.severity === 'High').length
  const resolvedCount = reports.filter((report) => report.status === 'Resolved').length
  const responseTimes = reports.flatMap((report) => report.responseMinutes === undefined ? [] : [report.responseMinutes])
  const averageResponseTime = responseTimes.length
    ? Math.round(responseTimes.reduce((total, minutes) => total + minutes, 0) / responseTimes.length)
    : null
  const visibleReports = useMemo(() => reports.filter((report) => {
    const matchesFilter = filter === 'All reports' || (filter === 'Open' ? report.status !== 'Resolved' : report.status === 'Resolved')
    const query = search.trim().toLowerCase()
    return matchesFilter && (!query || `${report.title} ${report.address} ${report.id} ${report.category}`.toLowerCase().includes(query))
  }), [filter, reports, search])
  const activityNotifications = reports.slice(0, 8).map((report) => ({
    ...report,
    heading: report.status === 'Resolved' ? 'Cleanup completed' : report.status === 'In progress' ? 'Cleanup in progress' : 'New waste report',
  }))
  const unreadNotificationCount = activityNotifications.filter((item) => !readNotificationIds.includes(item.id)).length

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setModalOpen(false)
        setNotificationsOpen(false)
      }
      if (event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) setModalOpen(true)
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault()
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    function onPointerDown(event: PointerEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setNotificationsOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let active = true
    let unsubscribe: () => void = () => {}

    void loadCityReports(city).then((loadedReports) => {
      if (!active) return
      setReports(loadedReports)
      setReadNotificationIds((current) => Array.from(new Set([...current, ...loadedReports.map((report) => report.id)])))
      setDatabaseStatus('connected')
      unsubscribe = subscribeToCityReports(city, (event, report, id) => {
        if (event === 'DELETE' && id) {
          setReports((current) => current.filter((item) => item.id !== id))
          return
        }
        if (report) {
          setReports((current) => [report, ...current.filter((item) => item.id !== report.id)])
          setReadNotificationIds((current) => current.filter((readId) => readId !== report.id))
        }
      }, (status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') setDatabaseStatus('connected')
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setDatabaseStatus('error')
          setDatabaseError('Live updates are unavailable. Check the Supabase Realtime publication.')
        }
      })
    }).catch(() => {
      if (!active) return
      setDatabaseStatus('error')
      setDatabaseError('Could not load reports. Check the Supabase URL, key, migration, and RLS policies.')
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [city])

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setLocationLabel('Location is unavailable in this browser')
      return
    }
    setLocationLabel('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: Coordinates = [coords.latitude, coords.longitude]
        setLocation(point)
        setLocationLabel(`Device location · ${point[0].toFixed(4)}° N, ${point[1].toFixed(4)}° E`)
      },
      () => setLocationLabel('Location permission denied'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  function onPhotoSelected(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setPhotoError('Choose a JPG, PNG, or WebP image.')
    if (file.size > 10 * 1024 * 1024) return setPhotoError('That photo is over 10 MB. Choose a smaller image.')
    setPhotoError('')
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setIsSubmitting(true)
    const authority = findNearestAuthority(location, cityConfig.authorities)
    const reportInput = {
      city,
      category,
      title: description.trim() || category,
      address: `${location[0].toFixed(4)}° N, ${location[1].toFixed(4)}° E`,
      severity: (category === 'Hazardous waste' || category === 'Illegal dumping' ? 'High' : 'Medium') as Report['severity'],
      position: location,
      authority,
    }

    try {
      let reportId: string
      if (supabase) {
        const savedReport = await createCityReport({ ...reportInput, photo: photoFile || undefined })
        setReports((current) => [savedReport, ...current.filter((item) => item.id !== savedReport.id)])
        setReadNotificationIds((current) => current.filter((readId) => readId !== savedReport.id))
        reportId = savedReport.id
        setNotice(authority)
      } else {
        const demoReport: Report = { ...reportInput, id: `CW-${Date.now().toString().slice(-6)}`, created: 'Just now', status: 'Assigned', image: photo || undefined }
        setReports((current) => [demoReport, ...current])
        setReadNotificationIds((current) => current.filter((readId) => readId !== demoReport.id))
        reportId = demoReport.id
        setNotice(authority)
      }
      setSelectedId(reportId)
      setFilter('All reports')
      setModalOpen(false)
      setDescription('')
      setPhoto(null)
      setPhotoFile(null)
      setPhotoError('')
    } catch {
      setFormError('The report could not be saved. Check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date()).toUpperCase()

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#overview" onClick={() => setActiveNav('Overview')} aria-label="Clearway home">
          <span className="brand-mark"><Recycle size={19} strokeWidth={2.2} /></span><span>clearway<span className="brand-period">.</span></span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          {['Overview', 'Reports', 'Network'].map((item) => <button key={item} className={`nav-link${activeNav === item ? ' nav-link--active' : ''}`} onClick={() => setActiveNav(item)}>{item}{item === 'Reports' && <span className="nav-count">{openCount}</span>}</button>)}
        </nav>
        <div className="topbar-actions">
          <span className={`demo-badge demo-badge--${databaseStatus}`}>{databaseStatus === 'demo' ? 'DEMO MODE' : databaseStatus === 'connecting' ? 'CONNECTING' : databaseStatus === 'connected' ? 'LIVE DATA' : 'DATABASE ERROR'}</span>
          <label className="city-picker"><i className="online-dot" /><select aria-label="Select city" value={city} onChange={(event) => {
            const nextCity = event.target.value
            setCity(nextCity)
            setReports(supabase ? [] : cities[nextCity].reports)
            setDatabaseStatus(supabase ? 'connecting' : 'demo')
            setDatabaseError('')
            setLocation(cities[nextCity].center)
            setLocationLabel(`${nextCity}, India · Map center`)
            setSelectedId(null)
            setSearch('')
            setFilter('All reports')
            setNotice('')
            setDatabaseError('')
          }}>{Object.keys(cities).map((name) => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
          <div className="notification-wrap" ref={notificationsRef} onKeyDown={(event) => { if (event.key === 'Escape') setNotificationsOpen(false) }}>
            <button
              className={`icon-button notification-button${notificationsOpen ? ' notification-button--open' : ''}`}
              aria-label={unreadNotificationCount ? `Notifications, ${unreadNotificationCount} unread` : 'Notifications'}
              aria-expanded={notificationsOpen}
              aria-controls="notifications-panel"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell size={18} />
              {unreadNotificationCount > 0 && <span className="notification-count">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}
            </button>
            {notificationsOpen && <section className="notifications-panel" id="notifications-panel" aria-label="Notifications">
              <div className="notifications-header">
                <div><strong>Activity</strong><span>{unreadNotificationCount ? `${unreadNotificationCount} unread` : 'All caught up'}</span></div>
                <div className="notification-header-actions">
                  <button className="mark-read-button" disabled={!unreadNotificationCount} onClick={() => setReadNotificationIds((current) => Array.from(new Set([...current, ...activityNotifications.map((item) => item.id)])))}>Mark all read</button>
                  <button className="icon-button notification-close" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X size={15} /></button>
                </div>
              </div>
              <div className="notifications-list">
                {activityNotifications.length ? activityNotifications.map((item) => {
                  const isUnread = !readNotificationIds.includes(item.id)
                  return <button
                    className={`notification-item${isUnread ? ' notification-item--unread' : ''}`}
                    key={item.id}
                    onClick={() => {
                      setReadNotificationIds((current) => current.includes(item.id) ? current : [...current, item.id])
                      setSelectedId(item.id)
                      setFilter('All reports')
                      setSearch('')
                      setActiveNav('Reports')
                      setNotificationsOpen(false)
                    }}
                  >
                    <span className={`notification-severity notification-severity--${item.severity.toLowerCase()}`}><MapPin size={14} /></span>
                    <span className="notification-copy"><strong>{item.heading}</strong><span>{item.title}</span><small>{item.address} · {item.authority}</small></span>
                    <span className="notification-trailing"><small>{item.created}</small>{isUnread && <i />}</span>
                  </button>
                }) : <div className="notifications-empty"><Bell size={18} /><strong>No activity yet</strong><span>New reports will show up here.</span></div>}
              </div>
              <div className="notifications-footer"><span>{city} operations</span><span className={`connection-indicator connection-indicator--${databaseStatus}`}><i /> {databaseStatus === 'connected' ? 'Live' : databaseStatus === 'demo' ? 'Demo' : databaseStatus === 'error' ? 'Offline' : 'Syncing'}</span></div>
            </section>}
          </div>
          <div className="avatar" aria-label="Signed in as Mayur">M</div>
        </div>
      </header>

      <main className="main-content" id="overview">
        <section className="page-heading">
          <div>
            <div className="eyebrow"><i className="eyebrow-line" /> CITY CLEANUP OPERATIONS <span>/ {today}</span></div>
            <h1>{activeNav === 'Reports' ? 'Report activity' : activeNav === 'Network' ? 'Response network' : 'Good morning, Mayur'}<span className="heading-spark">✳</span></h1>
            <p className="heading-subtitle">A clearer view of what needs attention across {city}, India.</p>
          </div>
          <button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={17} /> New report <kbd>N</kbd></button>
        </section>

        <section className="metrics-grid" aria-label="Cleanup overview">
          <article className="metric-card metric-card--primary">
            <div className="metric-top"><span>Open reports</span><span className="metric-icon"><MapPin size={16} /></span></div>
            <div className="metric-value">{String(openCount).padStart(2, '0')}<span className="metric-trend"><ArrowUpRight size={14} /> 12%</span></div>
            <div className="metric-caption">{supabase ? `Live reports · ${city}` : 'vs. last 7 days'}</div>
            <div className="metric-sparkline" aria-hidden="true">{[35, 55, 42, 69, 47, 62, 40, 77, 57, 70, 47, 83, 59, 74, 52, 68, 42].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div>
          </article>
          <article className="metric-card">
            <div className="metric-top"><span>Avg. response time</span><span className="metric-icon metric-icon--blue"><Clock3 size={16} /></span></div>
            <div className={`metric-value${averageResponseTime === null ? ' metric-value--empty' : ''}`}>{averageResponseTime === null ? 'Not recorded' : <>{averageResponseTime}<span className="metric-unit">min</span></>}</div>
            <div className="metric-caption">{averageResponseTime === null ? resolvedCount ? 'No resolution times recorded' : 'Awaiting the first resolved report' : `Average of ${responseTimes.length} completed reports`}</div>
            <div className="metric-bar"><i style={{ width: averageResponseTime === null ? '0%' : `${Math.min(100, Math.max(8, 100 - averageResponseTime))}%` }} /></div>
          </article>
          <article className="metric-card">
            <div className="metric-top"><span>Resolved reports</span><span className="metric-icon metric-icon--green"><Check size={16} /></span></div>
            <div className="metric-value">{resolvedCount}</div>
            <div className="metric-caption">{resolvedCount ? supabase ? `Completed in ${city}` : 'Sample completed reports' : 'No reports resolved yet'}</div>
            <div className="metric-bar metric-bar--green"><i style={{ width: `${Math.min(100, resolvedCount * 10)}%` }} /></div>
          </article>
          <article className="metric-card metric-card--alert">
            <div className="metric-top"><span>Needs attention</span><span className="metric-icon metric-icon--coral"><ShieldCheck size={16} /></span></div>
            <div className="metric-value">{String(urgentCount).padStart(2, '0')}<span className="metric-unit">urgent</span></div>
            <div className="metric-caption">High priority · in {city}</div>
            <div className="attention-line"><i />Priority response active</div>
          </article>
        </section>

        {notice && <div className="toast" role="status"><span className="toast-check"><Check size={16} /></span><span><strong>{supabase ? `Report saved for ${notice}` : `Demo report created for ${notice}`}</strong><small>{supabase ? 'Database updated. Municipal alerts are not configured.' : 'Demo only. No real authority alert was sent.'}</small></span><button className="icon-button toast-close" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {(supabaseConfigWarning || databaseError) && <div className="backend-alert" role="alert"><ShieldCheck size={16} /><span>{supabaseConfigWarning || databaseError}</span></div>}

        <section className="workspace-grid">
          <div className="map-panel">
            <div className="panel-heading">
              <div><div className="section-kicker">CITY OPERATIONS</div><h2>Reports map <span className="live-tag"><i /> {databaseStatus === 'connected' ? 'LIVE' : databaseStatus === 'connecting' ? 'SYNC' : databaseStatus === 'error' ? 'OFFLINE' : 'SAMPLE'}</span></h2></div>
              <div className="map-heading-actions"><span className="updated-label"><i /> {databaseStatus === 'connected' ? 'Realtime connected' : databaseStatus === 'connecting' ? 'Connecting to database' : databaseStatus === 'error' ? 'Database unavailable' : 'Sample reports'}</span><button className="subtle-button" onClick={() => setFilter(filter === 'All reports' ? 'Open' : 'All reports')}><Filter size={15} /> Filter</button></div>
            </div>
            <div className="map-toolbar">
              <div className="map-tabs" role="group" aria-label="Filter map reports">
                {(['All reports', 'Open', 'Resolved'] as ReportFilter[]).map((item) => <button key={item} className={`map-tab${filter === item ? ' map-tab--active' : ''}`} onClick={() => setFilter(item)}>{item}<span>{item === 'All reports' ? reports.length : item === 'Open' ? openCount : resolvedCount}</span></button>)}
              </div>
              <label className="search-field"><Search size={15} /><input ref={searchInput} aria-label="Search reports" placeholder="Search reports" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>/</kbd></label>
            </div>
            <div className="map-frame">
              <MapContainer key={city} center={cityConfig.center} zoom={14} zoomControl={false} scrollWheelZoom className="operations-map">
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ZoomControl position="bottomright" /><MapRecenter position={location} /><MapClickPicker onPick={(point) => { setLocation(point); setLocationLabel(`Pinned location · ${point[0].toFixed(4)}, ${point[1].toFixed(4)}`) }} />
                {cityConfig.authorities.map((authority) => <Marker key={authority.name} position={authority.position} icon={hubMarker}><Popup><strong>{authority.name}</strong><br />Municipal response hub</Popup></Marker>)}
                {visibleReports.map((report) => <Marker key={report.id} position={report.position} icon={reportMarker(report.severity, selectedId === report.id)} eventHandlers={{ click: () => setSelectedId(report.id) }}><Popup><strong>{report.title}</strong><br />{report.address}<br /><span>{report.status} · {report.id}</span></Popup></Marker>)}
              </MapContainer>
              <div className="map-legend"><span><i className="legend-dot legend-dot--coral" /> Urgent</span><span><i className="legend-dot legend-dot--gold" /> Standard</span><span><i className="legend-dot legend-dot--green" /> Low</span><span><i className="legend-hub" /> Response hub</span></div>
              <button className="locate-button" title="Use my current location" aria-label="Use my current location" onClick={useDeviceLocation}><LocateFixed size={17} /></button>
            </div>
            <div className="map-footer"><span><i /> {visibleReports.length} reports in this view</span><span>Map data © OpenStreetMap</span></div>
          </div>

          <aside className="queue-panel">
            <div className="queue-heading"><div><div className="section-kicker">FIELD RESPONSE</div><h2>Priority queue <span className="queue-count">{visibleReports.filter((report) => report.status !== 'Resolved').length}</span></h2></div><button className="more-button" aria-label="More queue options"><Menu size={18} /></button></div>
            <div className="queue-list">
              {visibleReports.slice(0, 4).map((report) => <button className={`queue-item${selectedId === report.id ? ' queue-item--selected' : ''}`} key={report.id} onClick={() => setSelectedId(report.id)}>
                <span className="queue-thumb">{report.image ? <img src={report.image} alt="" /> : <Trash2 size={17} />}</span>
                <span className="queue-item-content">
                  <span className="queue-item-top"><i className={`severity-dot severity-dot--${report.severity.toLowerCase()}`} />{report.category}<span className="queue-age">{report.created}</span></span>
                  <strong>{report.title}</strong><span className="queue-address"><MapPin size={12} /> {report.address}</span>
                  <span className="queue-meta"><span className={`status-chip status-chip--${report.status.toLowerCase().replace(' ', '-')}`}>{report.status}</span><span className="queue-authority">{report.authority}</span></span>
                </span>
              </button>)}
              {visibleReports.length === 0 && <div className="empty-state"><Search size={18} /><strong>{databaseStatus === 'connecting' ? 'Loading city reports' : databaseStatus === 'error' ? 'Reports unavailable' : search ? 'No reports match' : 'No reports in this city yet'}</strong><span>{databaseStatus === 'connecting' ? 'Syncing with the live database.' : databaseStatus === 'error' ? 'Check the database status message above.' : search ? 'Try another search or filter.' : 'New community reports will appear here.'}</span></div>}
            </div>
            <button className="view-all-button" onClick={() => { setActiveNav('Reports'); setFilter('All reports') }}>View all reports <ArrowUpRight size={15} /></button>
            <div className="network-card">
              <div className="network-card-top"><span className="network-icon"><ShieldCheck size={16} /></span><span className="network-status"><i /> {databaseStatus === 'connected' ? 'DATABASE LIVE' : 'SAMPLE NETWORK'}</span></div>
              <strong>Municipal response network</strong><p>{databaseStatus === 'connected' ? 'Reports are syncing live. Municipal notifications need a configured authority contact.' : 'Reports are assigned to the nearest sample response team.'}</p>
              <div className="network-teams"><span className="team-avatars"><i>01</i><i>02</i><i>03</i></span><span>{cityConfig.authorities.length} local teams</span><ArrowUpRight size={14} /></div>
            </div>
          </aside>
        </section>

        <footer className="page-footer"><span>Clearway <b>·</b> Cleaner streets, stronger communities.</span><span><i /> India demo · {city}</span></footer>
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}>
        <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="modal-header"><div><span className="modal-eyebrow"><Sparkles size={13} /> COMMUNITY REPORT</span><h2 id="report-title">Report an issue</h2><p>Help the right team find and fix it.</p></div><button className="icon-button modal-close" aria-label="Close report form" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
          <form className="report-form" onSubmit={submitReport}>
            <label className="form-label" htmlFor="issue-type">What are you seeing?</label>
            <div className="select-wrap"><Trash2 size={16} /><select id="issue-type" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div>
            <label className="form-label" htmlFor="issue-description">Add a note <span>OPTIONAL</span></label>
            <textarea id="issue-description" placeholder="Describe what needs attention…" value={description} maxLength={180} onChange={(event) => setDescription(event.target.value)} rows={3} />
            <div className="form-label photo-label">Add a photo <span>OPTIONAL</span></div>
            <input ref={photoInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => onPhotoSelected(event.target.files?.[0])} />
            <button className={`photo-upload${photo ? ' photo-upload--has-image' : ''}`} type="button" onClick={() => photoInput.current?.click()}>
              {photo ? <><img src={photo} alt="Selected report" /><span><strong>Photo attached</strong><small>Tap to replace</small></span><Check size={18} className="photo-check" /></> : <><span className="camera-icon"><Camera size={19} /></span><span><strong>Take a photo or upload</strong><small>JPG, PNG · up to 10 MB</small></span><Plus size={17} className="photo-plus" /></>}
            </button>
            {photoError && <p className="photo-error" role="alert">{photoError}</p>}
            <div className="location-card"><span className="location-icon"><MapPin size={17} /></span><span><strong>Incident location</strong><small>{locationLabel}</small></span><button type="button" className="location-action" onClick={useDeviceLocation}>Use my location</button></div>
            <div className="location-picker-map"><MapContainer center={location} zoom={15} zoomControl={false} scrollWheelZoom={false} className="mini-map"><TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapRecenter position={location} /><MapClickPicker onPick={(point) => { setLocation(point); setLocationLabel(`Pinned location · ${point[0].toFixed(4)}, ${point[1].toFixed(4)}`) }} /><Marker position={location} icon={hubMarker} /></MapContainer><span><Crosshair size={12} /> Tap the map to pin the location</span></div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <button className="submit-button" type="submit" disabled={isSubmitting}><Send size={16} /> {isSubmitting ? 'Saving report…' : supabase ? 'Submit report' : 'Send report'} <span>{supabase ? 'Save to database' : 'Demo only'}</span></button>
            <p className="privacy-note"><ShieldCheck size={13} /> {supabase ? 'Report locations and photos are public. Do not include personal information.' : 'Demo only. Connect a municipal service for real dispatch.'}</p>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default Dashboard