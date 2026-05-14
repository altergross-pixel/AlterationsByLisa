'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, X, Loader2, Expand, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { recordGarmentPhoto, deleteGarmentPhoto } from '@/lib/actions'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { GarmentPhoto } from '@/types'

export interface PendingPhoto {
  storage_path: string
  filename: string
  localUrl: string
}

interface DisplayPhoto {
  id: string
  storage_path: string
  filename: string
  localUrl?: string
  uploading: boolean
  error: string | null
}

function photoPublicUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/order-photos/${storagePath}`
}

// ── Props ─────────────────────────────────────────────────────
// Edit mode: provide garmentId + orderId  → saves to DB via server action
// Create mode: provide garmentId (temp UUID) + onPhotosChange → notifies parent

interface Props {
  garmentId: string
  orderId?: string                                // undefined = create mode
  initialPhotos?: GarmentPhoto[]
  onPhotosChange?: (photos: PendingPhoto[]) => void  // create mode callback
  compact?: boolean
}

export function GarmentPhotos({
  garmentId,
  orderId,
  initialPhotos = [],
  onPhotosChange,
  compact = false,
}: Props) {
  const isEditMode = !!orderId

  const [photos, setPhotos] = useState<DisplayPhoto[]>(
    initialPhotos.map((p) => ({
      id: p.id,
      storage_path: p.storage_path,
      filename: p.filename,
      uploading: false,
      error: null,
    }))
  )
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep parent in sync (create mode)
  function syncParent(updatedPhotos: DisplayPhoto[]) {
    if (!onPhotosChange) return
    const done = updatedPhotos
      .filter((p) => !p.uploading && !p.error && p.storage_path)
      .map((p) => ({ storage_path: p.storage_path, filename: p.filename, localUrl: p.localUrl ?? '' }))
    onPhotosChange(done)
  }

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setUploadError(null)

      const supabase = createClient()

      for (const file of Array.from(files)) {
        // Validate file size (10 MB)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`"${file.name}" is too large. Maximum size is 10 MB.`)
          continue
        }

        const localUrl = URL.createObjectURL(file)
        const tempId = `uploading-${Date.now()}-${Math.random().toString(36).slice(2)}`

        const pending: DisplayPhoto = {
          id: tempId,
          storage_path: '',
          filename: file.name,
          localUrl,
          uploading: true,
          error: null,
        }

        setPhotos((prev) => {
          const next = [...prev, pending]
          syncParent(next)
          return next
        })

        try {
          const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
          const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`
          const storagePath = `garments/${garmentId}/${safeName}`

          const { error: uploadErr } = await supabase.storage
            .from('order-photos')
            .upload(storagePath, file, { upsert: false, contentType: file.type || 'image/jpeg' })

          if (uploadErr) {
            const msg = uploadErr.message.includes('The resource already exists')
              ? 'File already exists — retrying with new name'
              : uploadErr.message
            setPhotos((prev) => {
              const next = prev.map((p) =>
                p.id === tempId ? { ...p, uploading: false, error: msg } : p
              )
              syncParent(next)
              return next
            })
            continue
          }

          if (isEditMode) {
            // Save to DB
            try {
              const realId = await recordGarmentPhoto(garmentId, orderId!, storagePath, file.name)
              setPhotos((prev) => {
                const next = prev.map((p) =>
                  p.id === tempId
                    ? { id: realId, storage_path: storagePath, filename: file.name, localUrl, uploading: false, error: null }
                    : p
                )
                syncParent(next)
                return next
              })
            } catch (dbErr) {
              setPhotos((prev) => {
                const next = prev.map((p) =>
                  p.id === tempId ? { ...p, uploading: false, error: 'Saved to storage but DB record failed. Refresh to retry.' } : p
                )
                syncParent(next)
                return next
              })
            }
          } else {
            // Create mode — just track locally
            setPhotos((prev) => {
              const next = prev.map((p) =>
                p.id === tempId
                  ? { ...p, storage_path: storagePath, uploading: false, error: null }
                  : p
              )
              syncParent(next)
              return next
            })
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setUploadError(msg)
          setPhotos((prev) => {
            const next = prev.map((p) =>
              p.id === tempId ? { ...p, uploading: false, error: msg } : p
            )
            syncParent(next)
            return next
          })
        }
      }

      if (inputRef.current) inputRef.current.value = ''
    },
    [garmentId, orderId, isEditMode]
  )

  async function handleDelete(photo: DisplayPhoto) {
    if (photo.uploading) return

    if (isEditMode && photo.storage_path && !photo.id.startsWith('uploading-')) {
      try {
        await deleteGarmentPhoto(photo.id, photo.storage_path, orderId!)
      } catch {
        setUploadError('Failed to delete photo. Please try again.')
        return
      }
    }

    if (photo.localUrl) URL.revokeObjectURL(photo.localUrl)

    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== photo.id)
      syncParent(next)
      return next
    })
  }

  function getDisplayUrl(p: DisplayPhoto): string {
    if (p.localUrl) return p.localUrl
    return photoPublicUrl(p.storage_path)
  }

  const visible = photos.filter((p) => !p.error)
  const errored = photos.filter((p) => p.error)

  return (
    <div className="flex flex-col gap-2">
      {/* Hidden input — no `capture` so iOS shows full action sheet */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload error banner */}
      {uploadError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-sans">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Photo grid */}
      {visible.length > 0 && (
        <div className={`grid gap-1.5 ${compact ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {visible.map((photo) => {
            const url = getDisplayUrl(photo)
            return (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-cream-100 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  style={{ opacity: photo.uploading ? 0.5 : 1 }}
                  onClick={() => !photo.uploading && setLightboxUrl(url)}
                />

                {/* Upload spinner */}
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}

                {/* Controls — always visible on touch, hover on desktop */}
                {!photo.uploading && (
                  <>
                    <button
                      onClick={() => setLightboxUrl(url)}
                      className="absolute bottom-1 left-1 w-6 h-6 bg-charcoal/70 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                    >
                      <Expand className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(photo)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Failed uploads — show with retry */}
      {errored.length > 0 && (
        <div className="flex flex-col gap-1">
          {errored.map((p) => (
            <div key={p.id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2 text-xs font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="flex-1 text-red-700 truncate">{p.filename}: {p.error}</span>
              <button
                onClick={() => setPhotos((prev) => prev.filter((ph) => ph.id !== p.id))}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={() => inputRef.current?.click()}
        className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border font-sans font-semibold text-charcoal-muted hover:border-gold hover:text-gold active:scale-[0.98] transition-all ${
          compact ? 'py-2 text-xs' : 'py-2.5 text-sm'
        }`}
      >
        <Camera className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {visible.length === 0 ? 'Add Photos' : 'Add More Photos'}
      </button>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-screen-sm p-2 bg-charcoal border-charcoal rounded-2xl">
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt="Full size"
              className="w-full h-auto rounded-xl max-h-[85dvh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
