"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { authClient, useSession } from '@/lib/auth-client'
import { Truck, Loader2, LogOut, Calendar, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface Order {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  address: string
  city: string
  locationLat: number
  locationLng: number
  serviceType: string
  inventoryItems: Array<{ name: string; quantity: number; inStock: boolean }>
  inventoryStatus: string
  priority: string
  estimatedDuration: number
  specialInstructions: string | null
  status: string
  createdAt: string
  dueDate: string
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session, isPending, refetch } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user) {
      fetchOrders()
    }
  }, [session])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('bearer_token')
      const response = await fetch('/api/orders?status=Ready to Dispatch', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleScheduleClick = (order: Order) => {
    setSelectedOrder(order)
    setIsDialogOpen(true)
  }

  const handleScheduleConfirm = () => {
    // Navigate to calendar with the selected order
    if (selectedOrder) {
      router.push(`/calendar?orderId=${selectedOrder.id}`)
    }
    setIsDialogOpen(false)
  }

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Dashboard - Ready to Dispatch</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {session.user.name || session.user.email}
                </p>
              </div>
            </div>
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Orders Ready to Dispatch</CardTitle>
                <CardDescription>
                  View and schedule orders that are ready for field service
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Orders Ready to Dispatch</h3>
                <p className="text-muted-foreground">
                  All orders have been scheduled or there are no pending orders.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Order ID</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.city}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => handleScheduleClick(order)}
                            size="sm"
                            className="gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            Schedule
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Order</DialogTitle>
            <DialogDescription>
              Review order details before scheduling
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Order ID:</span>
                  <span className="text-sm">#{selectedOrder.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Customer:</span>
                  <span className="text-sm">{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Phone:</span>
                  <span className="text-sm">{selectedOrder.customerPhone}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium">Address:</span>
                  <span className="text-sm text-right max-w-[200px]">
                    {selectedOrder.address}, {selectedOrder.city}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Service Type:</span>
                  <Badge variant="outline">{selectedOrder.serviceType}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Priority:</span>
                  <Badge 
                    variant={
                      selectedOrder.priority === 'urgent' ? 'destructive' :
                      selectedOrder.priority === 'high' ? 'default' :
                      'secondary'
                    }
                  >
                    {selectedOrder.priority}
                  </Badge>
                </div>
              </div>
              {selectedOrder.specialInstructions && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium mb-1">Special Instructions:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.specialInstructions}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleConfirm} className="gap-2">
              <Calendar className="w-4 h-4" />
              Go to Calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}