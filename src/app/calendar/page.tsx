"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Order, TimeSlot, Subcontractor } from '@/types'
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Package,
  AlertTriangle,
  User,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'

interface ScheduleEvent {
  id: number
  orderId: number
  order: Order
  timeSlot: TimeSlot | null
  subcontractor: Subcontractor | null
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
]

export default function CalendarView() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [orders, setOrders] = useState<Order[]>([])
  const [timeSlotData, setTimeSlotData] = useState<TimeSlot[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<{ day: Date; time: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ordersRes, slotsRes, subsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/time-slots'),
        fetch('/api/subcontractors')
      ])

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data)
      }

      if (slotsRes.ok) {
        const data = await slotsRes.json()
        setTimeSlotData(data)
      }

      if (subsRes.ok) {
        const data = await subsRes.json()
        setSubcontractors(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getOrdersForSlot = (day: Date, time: string) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return timeSlotData.filter(slot => 
      slot.slotDate === dayStr && 
      slot.slotStartTime === time &&
      slot.status !== 'cancelled'
    ).map(slot => {
      const order = orders.find(o => o.id === slot.orderId)
      const subcontractor = subcontractors.find(s => s.id === slot.subcontractorId)
      return { slot, order, subcontractor }
    }).filter(item => item.order)
  }

  const handleDragStart = (order: Order) => {
    setDraggedOrder(order)
  }

  const handleDragOver = (e: React.DragEvent, day: Date, time: string) => {
    e.preventDefault()
    setHoveredSlot({ day, time })
  }

  const handleDrop = async (e: React.DragEvent, day: Date, time: string) => {
    e.preventDefault()
    setHoveredSlot(null)

    if (!draggedOrder) return

    const dayStr = format(day, 'yyyy-MM-dd')
    
    // Check for conflicts
    const existingSlots = getOrdersForSlot(day, time)
    if (existingSlots.length >= 3) {
      alert('This time slot is full. Maximum 3 jobs per slot.')
      setDraggedOrder(null)
      return
    }

    // Create time slot
    try {
      const response = await fetch('/api/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: draggedOrder.id,
          slotDate: dayStr,
          slotStartTime: time,
          slotEndTime: `${parseInt(time.split(':')[0]) + 2}:00`,
          isAvailable: true,
          status: 'available'
        })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to schedule:', error)
      alert('Failed to schedule job')
    }

    setDraggedOrder(null)
  }

  const getConflicts = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const slots = timeSlotData.filter(slot => slot.slotDate === dayStr)
    
    // Count slots per subcontractor
    const subcontractorCounts: Record<number, number> = {}
    slots.forEach(slot => {
      if (slot.subcontractorId) {
        subcontractorCounts[slot.subcontractorId] = (subcontractorCounts[slot.subcontractorId] || 0) + 1
      }
    })

    // Find subcontractors over capacity
    const conflicts = subcontractors.filter(sub => {
      const count = subcontractorCounts[sub.id] || 0
      return count > sub.maxDailyJobs
    })

    return conflicts.length
  }

  const getInventoryIssues = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const slots = timeSlotData.filter(slot => slot.slotDate === dayStr)
    const orderIds = slots.map(s => s.orderId)
    const dayOrders = orders.filter(o => orderIds.includes(o.id))
    
    return dayOrders.filter(o => o.inventoryStatus === 'pending' || o.inventoryStatus === 'partial').length
  }

  const unscheduledOrders = orders.filter(o => 
    o.status === 'unassigned' || o.status === 'claimed'
  )

  const priorityColors = {
    low: 'border-gray-300',
    medium: 'border-blue-400',
    high: 'border-orange-400',
    urgent: 'border-red-500'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Scheduling Calendar</h1>
              <p className="text-muted-foreground mt-1">
                Drag-and-drop jobs to schedule with conflict detection
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <p className="font-semibold">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button onClick={() => setCurrentWeek(new Date())}>
                Today
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unscheduled Orders Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Unscheduled Jobs
                </CardTitle>
                <CardDescription>
                  Drag jobs to calendar to schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <>
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                    </>
                  ) : unscheduledOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">All jobs scheduled!</p>
                    </div>
                  ) : (
                    unscheduledOrders.map(order => (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={() => handleDragStart(order)}
                        className={`p-3 border-l-4 ${priorityColors[order.priority]} bg-card rounded cursor-move hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-semibold text-sm">#{order.id}</span>
                          <Badge variant="outline" className="text-xs">
                            {order.priority}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm mb-1">{order.customerName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{order.city}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{order.estimatedDuration} min</span>
                        </div>
                        {(order.inventoryStatus === 'pending' || order.inventoryStatus === 'partial') && (
                          <div className="flex items-center gap-1 text-xs text-orange-500 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Inventory {order.inventoryStatus}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-8 border-b bg-muted/30">
                      <div className="p-3 border-r">
                        <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      {weekDays.map(day => {
                        const conflicts = getConflicts(day)
                        const inventoryIssues = getInventoryIssues(day)
                        const isToday = isSameDay(day, new Date())

                        return (
                          <div 
                            key={day.toISOString()} 
                            className={`p-3 border-r text-center ${isToday ? 'bg-primary/10' : ''}`}
                          >
                            <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                            <p className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                              {format(day, 'd')}
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              {conflicts > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conflicts} conflict{conflicts > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {inventoryIssues > 0 && (
                                <div className="flex items-center gap-1 text-xs text-orange-500">
                                  <AlertTriangle className="w-3 h-3" />
                                  {inventoryIssues}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Time Slot Rows */}
                    {loading ? (
                      <div className="p-8">
                        <Skeleton className="h-96 w-full" />
                      </div>
                    ) : (
                      timeSlots.map(time => (
                        <div key={time} className="grid grid-cols-8 border-b hover:bg-muted/20">
                          <div className="p-3 border-r bg-muted/30 font-medium text-sm">
                            {time}
                          </div>
                          {weekDays.map(day => {
                            const ordersInSlot = getOrdersForSlot(day, time)
                            const isHovered = hoveredSlot?.day === day && hoveredSlot?.time === time
                            const isFull = ordersInSlot.length >= 3

                            return (
                              <div
                                key={`${day.toISOString()}-${time}`}
                                onDragOver={(e) => handleDragOver(e, day, time)}
                                onDrop={(e) => handleDrop(e, day, time)}
                                onDragLeave={() => setHoveredSlot(null)}
                                className={`p-2 border-r min-h-[100px] transition-colors ${
                                  isHovered ? 'bg-primary/10 border-primary' : ''
                                } ${isFull ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                              >
                                <div className="space-y-1">
                                  {ordersInSlot.map(({ slot, order, subcontractor }) => (
                                    order && (
                                      <div
                                        key={slot.id}
                                        className={`p-2 rounded text-xs border-l-2 ${priorityColors[order.priority]} ${
                                          slot.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20' :
                                          slot.status === 'claimed' ? 'bg-blue-100 dark:bg-blue-900/20' :
                                          'bg-white dark:bg-gray-800'
                                        } shadow-sm`}
                                      >
                                        <p className="font-semibold truncate">#{order.id} {order.customerName}</p>
                                        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                          <MapPin className="w-3 h-3" />
                                          <span className="truncate">{order.city}</span>
                                        </div>
                                        {subcontractor && (
                                          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                            <User className="w-3 h-3" />
                                            <span className="truncate">{subcontractor.name}</span>
                                          </div>
                                        )}
                                        {slot.status === 'completed' && (
                                          <Badge variant="outline" className="mt-1 text-xs">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Completed
                                          </Badge>
                                        )}
                                      </div>
                                    )
                                  ))}
                                </div>
                                {isHovered && !isFull && (
                                  <div className="text-xs text-muted-foreground text-center py-2 border-2 border-dashed border-primary rounded">
                                    Drop here to schedule
                                  </div>
                                )}
                                {isFull && (
                                  <div className="text-xs text-red-500 text-center py-1">
                                    Slot full
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-l-4 border-red-500 bg-white dark:bg-gray-800" />
                    <span>Urgent Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-l-4 border-orange-400 bg-white dark:bg-gray-800" />
                    <span>High Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 dark:bg-green-900/20" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/20" />
                    <span>Claimed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
