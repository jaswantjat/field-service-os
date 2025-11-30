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
import { Truck, Loader2, LogOut, Calendar, MapPin, AlertCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface BaserowOrder {
  id: number
  Customer_Name: string
  Customer_Email?: string
  Customer_Phone?: string
  Address: string
  City: string
  Service_Type: string
  Status: string
  Special_Instructions?: string
  Order_ID?: string
  Starlink_ID?: string
  Kit_Received?: boolean
  Photo_URL?: Array<{
    url: string
    visible_name: string
  }>
  Availability?: string
  GPS_Link?: string
  Install_Date?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session, isPending, refetch } = useSession()
  const [orders, setOrders] = useState<BaserowOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<BaserowOrder | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user) {
      fetchOrdersFromBaserow()
    }
  }, [session])

  const fetchOrdersFromBaserow = async () => {
    setIsLoading(true)
    try {
      // Call our API route that fetches from Baserow (no status filter - show all)
      const response = await fetch('/api/baserow/orders')

      if (!response.ok) {
        throw new Error('Failed to fetch orders from Baserow')
      }

      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders from Baserow')
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

  const handleScheduleClick = (order: BaserowOrder) => {
    setSelectedOrder(order)
    setIsDialogOpen(true)
  }

  const handleScheduleConfirm = async () => {
    if (!selectedOrder) return

    try {
      // Update order status in Baserow
      const response = await fetch('/api/baserow/orders/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: '3-Scheduled',
          technicianName: session?.user.name || 'Assigned',
          installDate: new Date().toISOString().split('T')[0]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to schedule order')
      }

      toast.success('Order scheduled successfully!')
      setIsDialogOpen(false)
      
      // Refresh the orders list
      fetchOrdersFromBaserow()
      
      // Navigate to calendar
      router.push(`/calendar?orderId=${selectedOrder.id}`)
    } catch (error) {
      console.error('Error scheduling order:', error)
      toast.error('Failed to schedule order')
    }
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
                <h1 className="font-semibold">Baserow Orders Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {session.user.name || session.user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={fetchOrdersFromBaserow}
                size="sm"
                className="gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Refresh
              </Button>
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Live Orders from Baserow</CardTitle>
                <CardDescription>
                  Real-time data from your Railway-hosted Baserow instance
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
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground">
                  There are no orders in your Baserow table yet.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.Order_ID || `#${order.id}`}
                        </TableCell>
                        <TableCell>{order.Customer_Name}</TableCell>
                        <TableCell>{order.City}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.Status.includes('Pending') ? 'destructive' :
                            order.Status.includes('Scheduled') ? 'default' :
                            'secondary'
                          }>
                            {order.Status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.Service_Type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => handleScheduleClick(order)}
                            size="sm"
                            className="gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            View Details
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

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View and manage order from Baserow
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Order ID</span>
                    <span className="text-sm font-mono">{selectedOrder.Order_ID || `#${selectedOrder.id}`}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Customer</span>
                    <span className="text-sm">{selectedOrder.Customer_Name}</span>
                  </div>
                  {selectedOrder.Customer_Phone && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Phone</span>
                      <span className="text-sm">{selectedOrder.Customer_Phone}</span>
                    </div>
                  )}
                  {selectedOrder.Customer_Email && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Email</span>
                      <span className="text-sm">{selectedOrder.Customer_Email}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <Badge variant="outline">{selectedOrder.Status}</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Service Type</span>
                    <Badge variant="secondary">{selectedOrder.Service_Type}</Badge>
                  </div>
                  {selectedOrder.Starlink_ID && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Starlink ID</span>
                      <span className="text-sm font-mono">{selectedOrder.Starlink_ID}</span>
                    </div>
                  )}
                  {selectedOrder.Kit_Received !== undefined && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Kit Status</span>
                      <Badge variant={selectedOrder.Kit_Received ? 'default' : 'destructive'}>
                        {selectedOrder.Kit_Received ? 'Received' : 'Pending'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Address</span>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm">{selectedOrder.Address}, {selectedOrder.City}</span>
                  {selectedOrder.GPS_Link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7"
                      onClick={() => window.open(selectedOrder.GPS_Link, '_blank')}
                    >
                      <MapPin className="w-3 h-3" />
                      Map
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {selectedOrder.Availability && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Availability</span>
                  <span className="text-sm">{selectedOrder.Availability}</span>
                </div>
              )}

              {selectedOrder.Special_Instructions && (
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium mb-1">Special Instructions:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.Special_Instructions}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.Photo_URL && selectedOrder.Photo_URL.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Photos</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.Photo_URL.map((photo, idx) => (
                      <a
                        key={idx}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-video rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={photo.url}
                          alt={photo.visible_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-6 h-6 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleScheduleConfirm} className="gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}