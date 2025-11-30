"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient, useSession } from '@/lib/auth-client'
import { Order } from '@/types'
import { 
  MapPin, 
  Clock, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Filter,
  Truck,
  CheckSquare,
  LogOut,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const inventoryStatusColors = {
  available: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  pending: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function SubcontractorPortal() {
  const router = useRouter()
  const { data: session, isPending, refetch } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set())
  const [claiming, setClaiming] = useState<number | null>(null)
  const [batchClaiming, setBatchClaiming] = useState(false)
  
  // Filters
  const [cityFilter, setCityFilter] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user) {
      fetchAvailableJobs()
    }
  }, [cityFilter, serviceTypeFilter, priorityFilter, session])

  const handleSignOut = async () => {
    const { error } = await authClient.signOut()
    if (error?.code) {
      toast.error(error.code)
    } else {
      localStorage.removeItem("bearer_token")
      refetch()
      router.push('/')
      toast.success('Signed out successfully')
    }
  }

  const fetchAvailableJobs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (cityFilter) params.append('city', cityFilter)
      if (serviceTypeFilter) params.append('service_type', serviceTypeFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      
      const response = await fetch(`/api/orders/available?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimJob = async (orderId: number) => {
    setClaiming(orderId)
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const slotDate = tomorrow.toISOString().split('T')[0]
      
      const timeSlotResponse = await fetch('/api/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          slotDate,
          slotStartTime: '09:00',
          slotEndTime: '11:00',
          isAvailable: true,
          status: 'available'
        })
      })

      if (!timeSlotResponse.ok) {
        throw new Error('Failed to create time slot')
      }

      const timeSlot = await timeSlotResponse.json()

      const claimResponse = await fetch(`/api/time-slots/${timeSlot.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcontractorId: 1
        })
      })

      if (claimResponse.ok) {
        setOrders(orders.filter(o => o.id !== orderId))
        setSelectedJobs(prev => {
          const newSet = new Set(prev)
          newSet.delete(orderId)
          return newSet
        })
        toast.success('Job claimed successfully!')
      }
    } catch (error) {
      console.error('Failed to claim job:', error)
      toast.error('Failed to claim job. Please try again.')
    } finally {
      setClaiming(null)
    }
  }

  const handleBatchClaim = async () => {
    if (selectedJobs.size === 0) return
    
    setBatchClaiming(true)
    try {
      const jobIds = Array.from(selectedJobs)
      
      for (const orderId of jobIds) {
        await handleClaimJob(orderId)
      }
      
      setSelectedJobs(new Set())
      toast.success(`Successfully claimed ${jobIds.length} job(s)`)
    } catch (error) {
      console.error('Batch claim failed:', error)
      toast.error('Batch claim failed')
    } finally {
      setBatchClaiming(false)
    }
  }

  const toggleJobSelection = (orderId: number) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.customerName.toLowerCase().includes(query) ||
      order.address.toLowerCase().includes(query) ||
      order.city.toLowerCase().includes(query) ||
      order.serviceType.toLowerCase().includes(query)
    )
  })

  const uniqueCities = Array.from(new Set(orders.map(o => o.city)))
  const uniqueServiceTypes = Array.from(new Set(orders.map(o => o.serviceType)))

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Subcontractor Portal</h1>
              <p className="text-muted-foreground mt-1">
                Welcome, {session.user.name || session.user.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg py-2 px-4">
                <Truck className="w-4 h-4 mr-2" />
                {filteredOrders.length} Available Jobs
              </Badge>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by customer, address, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Service Types</option>
                {uniqueServiceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {selectedJobs.size > 0 && (
              <div className="mt-4 flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  <span className="font-medium">{selectedJobs.size} job(s) selected</span>
                </div>
                <Button
                  onClick={handleBatchClaim}
                  disabled={batchClaiming}
                  className="gap-2"
                >
                  {batchClaiming ? (
                    <>Claiming...</>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Claim Selected Jobs
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Board */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Truck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Available Jobs</h3>
              <p className="text-muted-foreground">
                Check back later for new job opportunities
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOrders.map(order => (
              <Card 
                key={order.id}
                className={`transition-all ${
                  selectedJobs.has(order.id) 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(order.id)}
                          onChange={() => toggleJobSelection(order.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Badge className={priorityColors[order.priority]}>
                          {order.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{order.serviceType}</Badge>
                      </div>
                      <CardTitle className="text-xl">{order.customerName}</CardTitle>
                      <CardDescription className="mt-1">
                        Order #{order.id} • Due {format(new Date(order.dueDate), 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{order.address}</p>
                      <p className="text-sm text-muted-foreground">{order.city}</p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">
                      Estimated duration: <span className="font-medium">{order.estimatedDuration} minutes</span>
                    </span>
                  </div>

                  {/* Inventory Status */}
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">Inventory:</span>
                        <Badge className={inventoryStatusColors[order.inventoryStatus]}>
                          {order.inventoryStatus}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {order.inventoryItems.map((item, idx) => (
                          <div key={idx} className="text-sm flex items-center gap-2">
                            {item.inStock ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span className={!item.inStock ? 'text-muted-foreground line-through' : ''}>
                              {item.name} (x{item.quantity})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {order.specialInstructions && (
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">Special Instructions:</p>
                        <p className="text-sm text-muted-foreground">{order.specialInstructions}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    onClick={() => handleClaimJob(order.id)}
                    disabled={claiming === order.id}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {claiming === order.id ? (
                      <>Claiming...</>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Claim This Job
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}