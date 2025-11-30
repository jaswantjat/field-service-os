"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Order } from '@/types'
import { 
  Camera, 
  MapPin, 
  Clock,
  CheckCircle2,
  Star,
  AlertCircle,
  Loader2,
  X,
  PenTool,
  RotateCcw,
  Navigation
} from 'lucide-react'
import { format } from 'date-fns'
import SignatureCanvas from 'react-signature-canvas'

interface PageProps {
  params: { id: string }
}

export default function JobCompletionPage({ params }: PageProps) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [photos, setPhotos] = useState<string[]>([])
  const [signature, setSignature] = useState<string | null>(null)
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [gettingLocation, setGettingLocation] = useState(false)

  const signaturePadRef = useRef<SignatureCanvas>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchOrder()
    getGPSLocation()
  }, [params.id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGPSLocation = () => {
    setGettingLocation(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setGettingLocation(false)
        },
        (error) => {
          console.error('GPS error:', error)
          // Use default location for demo
          setGpsLocation({ lat: 47.6062, lng: -122.3321 })
          setGettingLocation(false)
        }
      )
    } else {
      // Use default location for demo
      setGpsLocation({ lat: 47.6062, lng: -122.3321 })
      setGettingLocation(false)
    }
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
    setSignature(null)
  }

  const saveSignature = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataUrl = signaturePadRef.current.toDataURL()
      setSignature(dataUrl)
    }
  }

  const handleSubmit = async () => {
    if (!order || !gpsLocation) return

    if (photos.length === 0) {
      alert('Please capture at least one photo')
      return
    }

    if (!signature) {
      alert('Please capture customer signature')
      return
    }

    setSubmitting(true)

    try {
      // First, get or create a time slot for this order
      const slotsResponse = await fetch(`/api/time-slots?order_id=${order.id}`)
      let timeSlotId: number

      if (slotsResponse.ok) {
        const slots = await slotsResponse.json()
        const claimedSlot = slots.find((s: any) => s.status === 'claimed')
        
        if (claimedSlot) {
          timeSlotId = claimedSlot.id
        } else {
          // Create a new time slot
          const createSlotResponse = await fetch('/api/time-slots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              slotDate: format(new Date(), 'yyyy-MM-dd'),
              slotStartTime: format(new Date(), 'HH:00'),
              slotEndTime: format(new Date(Date.now() + 2 * 60 * 60 * 1000), 'HH:00'),
              isAvailable: false,
              status: 'claimed'
            })
          })

          if (!createSlotResponse.ok) {
            throw new Error('Failed to create time slot')
          }

          const newSlot = await createSlotResponse.json()
          
          // Claim the slot
          const claimResponse = await fetch(`/api/time-slots/${newSlot.id}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subcontractorId: 1 })
          })

          if (!claimResponse.ok) {
            throw new Error('Failed to claim time slot')
          }

          timeSlotId = newSlot.id
        }
      } else {
        throw new Error('Failed to fetch time slots')
      }

      // Submit job completion
      const response = await fetch('/api/job-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          subcontractorId: 1, // Demo: using subcontractor ID 1
          timeSlotId,
          completionPhotos: photos,
          signatureData: signature,
          gpsLat: gpsLocation.lat,
          gpsLng: gpsLocation.lng,
          completionNotes: notes,
          customerSatisfaction: rating > 0 ? rating : null
        })
      })

      if (response.ok) {
        alert('Job completed successfully!')
        router.push('/portal')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit completion')
      }
    } catch (error) {
      console.error('Submission error:', error)
      alert(`Failed to submit: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Order Not Found</h3>
            <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/portal')}>Back to Portal</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Complete Job</h1>
              <p className="text-sm text-muted-foreground">Order #{order.id}</p>
            </div>
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              In Progress
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{order.customerName}</CardTitle>
            <CardDescription>{order.serviceType}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{order.address}</p>
                <p className="text-sm text-muted-foreground">{order.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">Duration: {order.estimatedDuration} minutes</span>
            </div>
            {order.specialInstructions && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Special Instructions:</p>
                <p className="text-sm text-muted-foreground">{order.specialInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPS Location */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              GPS Location
            </CardTitle>
            <CardDescription>Verify your location at the job site</CardDescription>
          </CardHeader>
          <CardContent>
            {gettingLocation ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Getting location...</span>
              </div>
            ) : gpsLocation ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Location Captured</p>
                    <p className="text-sm text-muted-foreground">
                      {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                    </p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getGPSLocation}
                  className="w-full"
                >
                  Refresh Location
                </Button>
              </div>
            ) : (
              <Button onClick={getGPSLocation} className="w-full">
                Get GPS Location
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Photo Capture */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Completion Photos
            </CardTitle>
            <CardDescription>Take photos of completed work (required)</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />
            
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={photo} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              {photos.length > 0 ? 'Add More Photos' : 'Take Photos'}
            </Button>
            
            {photos.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {photos.length} photo{photos.length > 1 ? 's' : ''} captured
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer Signature */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Customer Signature
            </CardTitle>
            <CardDescription>Get customer signature to confirm completion</CardDescription>
          </CardHeader>
          <CardContent>
            {!signature ? (
              <div>
                <div className="border-2 border-dashed border-muted rounded-lg overflow-hidden">
                  <SignatureCanvas
                    ref={signaturePadRef}
                    canvasProps={{
                      className: 'w-full h-40 bg-white dark:bg-gray-900',
                    }}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={clearSignature}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  <Button 
                    onClick={saveSignature}
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Signature
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <img 
                  src={signature} 
                  alt="Signature" 
                  className="w-full h-40 object-contain border rounded-lg bg-white dark:bg-gray-900"
                />
                <Button 
                  variant="outline" 
                  onClick={() => setSignature(null)}
                  className="w-full mt-4"
                >
                  Edit Signature
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Rating */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Customer Satisfaction
            </CardTitle>
            <CardDescription>Optional: How satisfied was the customer?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-10 h-10 ${
                      star <= rating 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {rating} out of 5 stars
              </p>
            )}
          </CardContent>
        </Card>

        {/* Completion Notes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Completion Notes</CardTitle>
            <CardDescription>Optional: Add any additional notes or observations</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="E.g., Customer was very satisfied, requested follow-up appointment, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !gpsLocation || photos.length === 0 || !signature}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Complete Job
            </>
          )}
        </Button>

        {(!gpsLocation || photos.length === 0 || !signature) && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Required to submit:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {!gpsLocation && (
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  GPS location
                </li>
              )}
              {photos.length === 0 && (
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  At least one photo
                </li>
              )}
              {!signature && (
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Customer signature
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
