import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router'

import { useAuth } from '@/hooks/use-auth'
import { APP_CONFIG } from '@/constants/config'
import { useGeolocated } from 'react-geolocated'
import { AttendanceUpdateResponse, useAttendanceUpdate } from '@/service/employees/attendance-update'
import { showNotifError, showNotifSuccess } from '@/lib/show-notif'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppTranslation } from '@/lib/i18n-typed'
import { Camera, ChevronLeft, Loader2, LogOut, MapPin, RefreshCw, Send, Trash2 } from 'lucide-react'
import { AppRoute } from '@/constants/app-route'
import { AttendanceListResponse, useAttendanceList } from '@/service/employees/attendance-list'
import { useEmployeeAttendanceProfile } from '@/service/employees/employee-profile'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppApi } from '@/constants/app-api'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MapPinned } from 'lucide-react'
import L from 'leaflet'
import DatePicker from '@/components/custom/components/DatePicker'
import { format } from 'date-fns'

import { renderToStaticMarkup } from 'react-dom/server'
import { FaMapMarkerAlt } from 'react-icons/fa'

const customMarkerIcon = L.divIcon({
  className: 'custom-icon',
  html: renderToStaticMarkup(<FaMapMarkerAlt className="text-red-600 text-4xl drop-shadow-md" />),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
})

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}




const fixRotation = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file)
          return
        }
        const newFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        })
        resolve(newFile)
      }, file.type, 0.8)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}


export const Route = createFileRoute('/employees/attendance')({
  component: EmployeeAttendancePage,

  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: APP_CONFIG.path.employeeLogin })
    }
  },
})

function EmployeeAttendancePage() {
  const { t } = useAppTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()


  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [statusChangeDate, setStatusChangeDate] = useState<Date | undefined>(undefined)

  const handleLocationSuccess = useCallback(() => {
    setIsRefreshing(false)
  }, [])

  const handleLocationError = useCallback(() => {
    setIsRefreshing(false)
  }, [])

  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    positionError,
    getPosition
  } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Set to 0 to ensure fresh location on every update
    },
    userDecisionTimeout: 5000,
    onSuccess: handleLocationSuccess,
    onError: handleLocationError,
  })

  const location = coords ? {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
  } : null

  // Ensure 'location' stability to prevent effect re-firing
  const stableLocation = useRef<any>(null)

  // Update ref if values change
  if (location) {
    if (!stableLocation.current ||
      stableLocation.current.lat !== location.lat ||
      stableLocation.current.lng !== location.lng ||
      stableLocation.current.accuracy !== location.accuracy) {
      stableLocation.current = location
    }
  } else {
    stableLocation.current = null
  }

  const { data: profileRes, isLoading: isLoadingProfile } = useEmployeeAttendanceProfile()
  const employeeProfile = profileRes?.data

  const [selectedWorkLocationId, setSelectedWorkLocationId] = useState<string>('')
  const [manualOverrideCoords, setManualOverrideCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)

  const finalLocation = manualOverrideCoords || stableLocation.current

  const handleRefreshLocation = () => {
    setManualOverrideCoords(null)
    setIsRefreshing(true)
    getPosition()
  }

  const handleWorkLocationChange = (val: string) => {
    setSelectedWorkLocationId(val)
    const wl = employeeProfile?.workLocations?.find((w) => w.id === val)
    if (wl && wl.latitude !== null && wl.longitude !== null) {
      const lat = Number(wl.latitude)
      const lng = Number(wl.longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        setManualOverrideCoords({ lat, lng, accuracy: 5 })
      }
    }
  }

  // const getLocation = getPosition
  const locationError = positionError ? positionError.message : (!isGeolocationAvailable ? "Geolocation not supported" : (!isGeolocationEnabled ? "Geolocation disabled" : null))
  const isLocating = !finalLocation && !locationError
  const [address, setAddress] = useState<string>('')

  // Also handling the location error if it occurs
  useEffect(() => {
    if (locationError) {
      showNotifError({ message: locationError })
    }
  }, [locationError])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const attendanceUpdateMutation = useAttendanceUpdate()
  const attendanceListMutation = useAttendanceList()

  const [showConfirm, setShowConfirm] = useState(false)
  const [targetStatus, setTargetStatus] = useState<'on_duty' | 'off_duty'>('on_duty')

  useEffect(() => {
    attendanceListMutation.mutate({
      body: {
        limit: 1
      }
    }, {
      onSuccess: (res: AttendanceListResponse) => {
        if (res.success && res.data) {
          if (res.data.length > 0) {
            const latest = res.data[0]
            if (latest.workLocationId) {
              setSelectedWorkLocationId(latest.workLocationId)
            }
            if (latest.statusAfter === 'on_duty') {
              setTargetStatus('off_duty')
            } else {
              setTargetStatus('on_duty')
              setStatusChangeDate(new Date())
            }
          } else {
            setTargetStatus('on_duty')
            setStatusChangeDate(new Date())
          }
        }
      }
    })
  }, [])

  useEffect(() => {
    if (employeeProfile?.workLocations && selectedWorkLocationId && !manualOverrideCoords) {
      const wl = employeeProfile.workLocations.find((w) => w.id === selectedWorkLocationId)
      if (wl && wl.latitude !== null && wl.longitude !== null) {
        const lat = Number(wl.latitude)
        const lng = Number(wl.longitude)
        if (!isNaN(lat) && !isNaN(lng)) {
          setManualOverrideCoords({ lat, lng, accuracy: 5 })
        }
      }
    }
  }, [employeeProfile, selectedWorkLocationId])

  const action = targetStatus === 'on_duty' ? 'check-in' : 'check-out'
  const pageTitle = action === 'check-in' ? t($ => $.employeesAttendance.modalCheckInTitle) : t($ => $.employeesAttendance.modalCheckOutTitle)



  useEffect(() => {
    if (finalLocation) {
      fetchAddress(finalLocation.lat, finalLocation.lng)
    }
  }, [finalLocation])

  const fetchAddress = async (lat: number, lon: number) => {
    try {
      // Using OpenStreetMap Nominatim API (Free, handle with care regarding rate limits in prod)
      // In a real app, you might want to proxy this or use Google Maps API
      const response = await fetch(`${AppApi.public.geocode}?lat=${lat}&lon=${lon}`)
      const data = await response.json()
      if (data.display_name) {
        setAddress(data.display_name)
      }
    } catch (error) {
      console.error('Error fetching address:', error)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processPhoto(file)
    }
  }

  const processPhoto = async (file: File) => {
    try {
      const fixedFile = await fixRotation(file)
      setSelectedPhoto(fixedFile)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string)
      }
      reader.readAsDataURL(fixedFile)
    } catch (error) {
      console.error('Error processing photo:', error)
      setSelectedPhoto(file)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRetake = () => {
    setSelectedPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Photo is now optional based on user request
    // if (!selectedPhoto) {
    //   showNotifError({ message: t($ => $.employeesAttendance.notifications.photoRequired) })
    //   return
    // }

    if (!user?.user?.id) {
      showNotifError({ message: t($ => $.employeesAttendance.notifications.userInvalid) })
      return
    }

    if (targetStatus === 'on_duty' && !statusChangeDate) {
      showNotifError({ message: t($ => $.shared.required) })
      return
    }

    setShowConfirm(true)
  }

  const performUpdate = () => {
    const formData = new FormData()
    formData.append('status', targetStatus)
    if (selectedPhoto) {
      formData.append('photoEvidence', selectedPhoto)
    }
    formData.append('notes', notes)

    if (targetStatus === 'on_duty' && statusChangeDate) {
      formData.append('statusChangeDate', format(statusChangeDate, 'yyyy-MM-dd'))
    }

    if (selectedWorkLocationId) {
      formData.append('workLocationId', selectedWorkLocationId)
    }

    if (finalLocation) {
      formData.append('position', JSON.stringify({
        latitude: finalLocation.lat,
        longitude: finalLocation.lng,
        ...(coords ? { deviceLat: coords.latitude, deviceLng: coords.longitude, accuracy: coords.accuracy } : {})
      }))
    }

    attendanceUpdateMutation.mutate(formData, {
      onSuccess: (res: AttendanceUpdateResponse) => {
        if (res.success) {
          showNotifSuccess({
            message: action === 'check-in'
              ? t($ => $.employeesAttendance.notifications.checkInSuccess)
              : t($ => $.employeesAttendance.notifications.checkOutSuccess)
          })
          navigate({ to: AppRoute.employeeUser.dashboard.url })
        } else {
          showNotifError({ message: res.message || t($ => $.employeesAttendance.notifications.processFailed) })
        }
      },
      onError: (err: any) => {
        showNotifError({ message: err?.message || t($ => $.employeesAttendance.notifications.uploadError) })
      }
    })
  }

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={AppRoute.employeeUser.dashboard.url}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-lg font-bold text-slate-800">{pageTitle}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Status Change Date Section - Only for Check-in */}
        {targetStatus === 'on_duty' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              {t($ => $.employeesAttendance.attendanceDate)}
            </label>
            <div className="relative">
              <DatePicker
                value={statusChangeDate}
                onChange={setStatusChangeDate}
                className="p-3 border-slate-200 rounded-xl focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>
        )}

        {/* Work Location Section - For Project Employees */}
        {employeeProfile?.projectId && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Work Location
              </label>
              {employeeProfile.projectName && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {employeeProfile.projectName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Pilih lokasi kerja proyek untuk check-in. Koordinat dan lokasi barge akan otomatis disesuaikan.
            </p>
            {employeeProfile.workLocations && employeeProfile.workLocations.length > 0 ? (
              <Select
                value={selectedWorkLocationId}
                onValueChange={handleWorkLocationChange}
              >
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-11 text-sm focus:ring-blue-500/20">
                  <SelectValue placeholder="-- Pilih Work Location --" />
                </SelectTrigger>
                <SelectContent>
                  {employeeProfile.workLocations.map((wl) => (
                    <SelectItem key={wl.id} value={wl.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium text-slate-800">{wl.name}</span>
                        {wl.latitude !== null && wl.longitude !== null && (
                          <span className="text-[11px] text-slate-400 font-mono ml-1">
                            ({Number(wl.latitude).toFixed(4)}, {Number(wl.longitude).toFixed(4)})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                Belum ada Work Location terdaftar untuk proyek ini.
              </div>
            )}
          </div>
        )}

        {/* Location Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-semibold text-slate-700">
              {t($ => $.employeesAttendance.detail.location)}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMap(true)}
                disabled={!finalLocation}
                className="text-xs text-slate-600 font-medium hover:text-blue-600 flex items-center gap-1 disabled:opacity-50 transition-colors"
                title={t($ => $.employeesAttendance.detail.viewMap)}
              >
                <MapPinned className="w-3.5 h-3.5" />
                {t($ => $.employeesAttendance.detail.viewMap)}
              </button>
              <div className="w-px h-4 bg-slate-200"></div>
              <button
                type="button"
                onClick={handleRefreshLocation}
                disabled={isLocating || isRefreshing}
                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {(isLocating || isRefreshing) && <Loader2 className="w-3 h-3 animate-spin" />}
                {t($ => $.employeesAttendance.detail.refreshLocation)}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-600 flex flex-col gap-1">
            {isLocating ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>{t($ => $.employeesAttendance.detail.gettingLocation)}</span>
              </div>
            ) : finalLocation ? (
              <>
                <div className="font-medium text-slate-800">{address || t($ => $.employeesAttendance.detail.locationIdentified)}</div>
                <div className="text-xs text-slate-400 font-mono">
                  Lat: {finalLocation.lat.toFixed(6)}, Lng: {finalLocation.lng.toFixed(6)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span>{t($ => $.employeesAttendance.detail.accuracy)}:</span>
                  <span className="font-mono">
                    {finalLocation.accuracy ? (
                      finalLocation.accuracy > 1000
                        ? `${(finalLocation.accuracy / 1000).toFixed(2)} km`
                        : `${finalLocation.accuracy.toFixed(0)} m`
                    ) : '-'}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-red-500 text-xs">
                {t($ => $.employeesAttendance.detail.locationNotFound)}
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            {t($ => $.employeesAttendance.detail.notes)}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-h-[100px] resize-y"
            placeholder={t($ => $.employeesAttendance.detail.notesPlaceholder)}
          />
        </div>

        {/* Photo Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            {t($ => $.employeesAttendance.detail.evidence)} <span className="text-slate-400 font-normal text-xs ml-1">(Optional)</span>
          </label>

          {!photoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all gap-3 min-h-[200px]"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">{t($ => $.employeesAttendance.modalPhotoPlaceholder)}</span>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
              <img
                src={photoPreview}
                alt="Attendance Evidence"
                className="w-full h-auto max-h-[300px] object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="bg-white/90 text-red-600 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-white transition-colors shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t($ => $.employeesAttendance.modalRetake)}
                </button>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={attendanceUpdateMutation.isPending || !finalLocation}
          className={`w-full py-4 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${action === 'check-in'
            ? 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
            : 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
            }`}
        >
          {attendanceUpdateMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t($ => $.employeesAttendance.modalProcess)}
            </>
          ) : (
            <>
              {action === 'check-in' ? <Camera className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
              {t($ => $.employeesAttendance.modalConfirm)}
            </>
          )}
        </button>

      </form>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {action === 'check-in' ? t($ => $.employeesAttendance.confirmCheckIn) : t($ => $.employeesAttendance.confirmCheckOut)}
            </h3>
            <p className="text-slate-500 mb-6 text-sm">
              {t($ => $.employeesAttendance.confirmMessage)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
              >
                {t($ => $.shared.cancel)}
              </button>
              <button
                onClick={performUpdate}
                disabled={attendanceUpdateMutation.isPending}
                className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 ${action === 'check-in' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
              >
                {attendanceUpdateMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : (action === 'check-in' ? <Camera className="w-4 h-4" /> : <LogOut className="w-4 h-4" />)}
                {t($ => $.shared.yes)}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Map Dialog */}
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent aria-describedby={undefined} className="max-w-3xl w-[80vw] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 border-b border-slate-100 bg-white z-10 flex flex-row items-center justify-between">
            <DialogTitle>{t($ => $.employeesAttendance.detail.locationStart)}</DialogTitle>
            <button
              type="button"
              onClick={handleRefreshLocation}
              disabled={isLocating || isRefreshing}
              className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              {(isLocating || isRefreshing) && <Loader2 className="w-3 h-3 animate-spin" />}
              {t($ => $.employeesAttendance.detail.refreshLocation)}
            </button>
          </DialogHeader>
          <div className="flex-1 relative bg-slate-100 w-full h-full">
            {finalLocation && (
              <MapContainer
                center={[finalLocation.lat, finalLocation.lng]}
                zoom={16}
                scrollWheelZoom={true}
                className="w-full h-full z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[finalLocation.lat, finalLocation.lng]} icon={customMarkerIcon}>
                  <Popup>
                    <div className="text-xs font-medium">
                      {address || "Your Location"}
                    </div>
                  </Popup>
                </Marker>
                <MapUpdater center={[finalLocation.lat, finalLocation.lng]} />
              </MapContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
