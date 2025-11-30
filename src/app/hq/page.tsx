"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Order, Subcontractor, Analytics } from '@/types'
import { toast } from 'sonner'
import { 
  BarChart3, 
  Users, 
  PackageCheck, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  MapPin,
  Star,
  Activity,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Phone,
  Mail,
  Package,
  ArrowUpDown
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

const statusColors = {
  unassigned: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  claimed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  scheduled: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function HQDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | 'priority'>('dueDate')

  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [viewOrderDialog, setViewOrderDialog] = useState(false)
  const [cancelOrderDialog, setCancelOrderDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersRes, subcontractorsRes, analyticsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/subcontractors'),
        fetch('/api/analytics')
      ])

      if (!ordersRes.ok) throw new Error('Failed to fetch orders')
      if (!subcontractorsRes.ok) throw new Error('Failed to fetch subcontractors')
      if (!analyticsRes.ok) throw new Error('Failed to fetch analytics')

      const ordersData = await ordersRes.json()
      const subcontractorsData = await subcontractorsRes.json()
      const analyticsData = await analyticsRes.json()

      setOrders(ordersData)
      setSubcontractors(subcontractorsData)
      setAnalytics(analyticsData)
      toast.success('Dashboard data loaded')
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Get unique values for filters
  const uniqueServiceTypes = useMemo(() => 
    Array.from(new Set(orders.map(o => o.serviceType))).sort(),
    [orders]
  )

  const uniqueCities = useMemo(() => 
    Array.from(new Set(orders.map(o => o.city))).sort(),
    [orders]
  )

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        order.customerName.toLowerCase().includes(searchLower) ||
        order.customerEmail.toLowerCase().includes(searchLower) ||
        order.city.toLowerCase().includes(searchLower) ||
        order.address.toLowerCase().includes(searchLower) ||
        order.id.toString().includes(searchLower)

      // Status filter
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter

      // Service type filter
      const matchesServiceType = serviceTypeFilter === 'all' || order.serviceType === serviceTypeFilter

      // City filter
      const matchesCity = cityFilter === 'all' || order.city === cityFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesServiceType && matchesCity
    })

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      } else if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
    })

    return filtered
  }, [orders, searchQuery, statusFilter, priorityFilter, serviceTypeFilter, cityFilter, sortBy])

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setViewOrderDialog(true)
  }

  const handleCancelOrder = async () => {
    if (!selectedOrder) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      })

      if (!response.ok) throw new Error('Failed to cancel order')

      toast.success(`Order #${selectedOrder.id} cancelled successfully`)
      setCancelOrderDialog(false)
      setSelectedOrder(null)
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to cancel order:', error)
      toast.error('Failed to cancel order')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportData = () => {
    const csv = [
      ['ID', 'Customer', 'Email', 'Phone', 'City', 'Service Type', 'Status', 'Priority', 'Due Date'].join(','),
      ...filteredOrders.map(o => [
        o.id,
        o.customerName,
        o.customerEmail,
        o.customerPhone,
        o.city,
        o.serviceType,
        o.status,
        o.priority,
        format(new Date(o.dueDate), 'yyyy-MM-dd')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    toast.success('Data exported successfully')
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setServiceTypeFilter('all')
    setCityFilter('all')
    toast.info('Filters cleared')
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    trend 
  }: { 
    title: string
    value: string | number
    icon: any
    description?: string
    trend?: { value: string; positive: boolean }
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="w-4 h-4" />
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          <div className={`p-4 rounded-full bg-primary/10`}>
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const OrderDetailsDialog = () => {
    if (!selectedOrder) return null

    return (
      <Dialog open={viewOrderDialog} onOpenChange={setViewOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order #{selectedOrder.id}
              <Badge className={statusColors[selectedOrder.status]}>
                {selectedOrder.status}
              </Badge>
              <Badge className={priorityColors[selectedOrder.priority]}>
                {selectedOrder.priority}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Complete order details and management
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedOrder.customerEmail}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedOrder.customerPhone}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">{selectedOrder.address}</p>
                <p className="text-muted-foreground">{selectedOrder.city}</p>
                <p className="text-xs text-muted-foreground">
                  Coordinates: {selectedOrder.locationLat.toFixed(6)}, {selectedOrder.locationLng.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                Service Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Service Type</p>
                  <p className="font-medium">{selectedOrder.serviceType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Duration</p>
                  <p className="font-medium">{selectedOrder.estimatedDuration} minutes</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(new Date(selectedOrder.dueDate), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(selectedOrder.createdAt), 'PPP')}</p>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Inventory Status
                <Badge variant={selectedOrder.inventoryStatus === 'available' ? 'default' : 'outline'}>
                  {selectedOrder.inventoryStatus}
                </Badge>
              </h3>
              <div className="space-y-2">
                {selectedOrder.inventoryItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                    <span className="font-medium">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span>Qty: {item.quantity}</span>
                      <Badge variant={item.inStock ? 'default' : 'destructive'}>
                        {item.inStock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            {selectedOrder.specialInstructions && (
              <div>
                <h3 className="font-semibold mb-2">Special Instructions</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {selectedOrder.specialInstructions}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewOrderDialog(false)}>
              Close
            </Button>
            <Link href={`/calendar`}>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </Link>
            {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
              <Button 
                variant="destructive"
                onClick={() => {
                  setViewOrderDialog(false)
                  setCancelOrderDialog(true)
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const CancelOrderDialog = () => {
    if (!selectedOrder) return null

    return (
      <Dialog open={cancelOrderDialog} onOpenChange={setCancelOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order #{selectedOrder.id}?</DialogTitle>
            <DialogDescription>
              This will mark the order as cancelled. This action can be undone by changing the status back.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <span className="font-semibold">Customer:</span> {selectedOrder.customerName}
            </p>
            <p className="text-sm mt-1">
              <span className="font-semibold">Service:</span> {selectedOrder.serviceType}
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelOrderDialog(false)}
              disabled={actionLoading}
            >
              Keep Order
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">HQ Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Centralized operations control center
              </p>
            </div>
            <Button onClick={fetchDashboardData} variant="outline" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Error loading data</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData}>
              Retry
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">
              Orders
              {filteredOrders.length !== orders.length && (
                <Badge variant="secondary" className="ml-2">
                  {filteredOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Total Orders"
                    value={analytics.summary.totalOrders}
                    icon={PackageCheck}
                    description="All time"
                  />
                  <StatCard
                    title="Completion Rate"
                    value={`${analytics.summary.completionRate}%`}
                    icon={CheckCircle2}
                    trend={{ value: "+5% from last week", positive: true }}
                  />
                  <StatCard
                    title="Ghost Jobs"
                    value={analytics.summary.ghostJobs}
                    icon={AlertTriangle}
                    description="Require attention"
                  />
                  <StatCard
                    title="Double Bookings"
                    value={analytics.summary.doubleBookings}
                    icon={AlertCircle}
                    description="Conflicts detected"
                  />
                </div>

                {/* Orders by Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Status Distribution</CardTitle>
                    <CardDescription>Current order pipeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
                        <div key={status} className="text-center p-4 rounded-lg border">
                          <Badge className={statusColors[status as keyof typeof statusColors]}>
                            {status}
                          </Badge>
                          <p className="text-2xl font-bold mt-2">{count}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Service Types */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Service Type Breakdown</CardTitle>
                      <CardDescription>Orders by service type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(analytics.ordersByServiceType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="font-medium">{type}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full"
                                  style={{ 
                                    width: `${(count / analytics.summary.totalOrders) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold w-12 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Priority Distribution</CardTitle>
                      <CardDescription>Orders by priority level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(analytics.ordersByPriority).map(([priority, count]) => (
                          <div key={priority} className="flex items-center justify-between">
                            <Badge className={priorityColors[priority as keyof typeof priorityColors] || ''}>
                              {priority.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full"
                                  style={{ 
                                    width: `${(count / analytics.summary.totalOrders) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold w-12 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6 space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filters & Search
                    </CardTitle>
                    <CardDescription>
                      Refine your order view with advanced filters
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportData} disabled={filteredOrders.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="lg:col-span-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, city, address, or order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value="claimed">Claimed</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Priority Filter */}
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Service Type Filter */}
                  <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Service Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Service Types</SelectItem>
                      {uniqueServiceTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* City Filter */}
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort By */}
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                      <SelectItem value="createdAt">Created Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Results count */}
                  <div className="lg:col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <PackageCheck className="w-4 h-4" />
                    Showing {filteredOrders.length} of {orders.length} orders
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders List */}
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>Complete order management view</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <PackageCheck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-semibold mb-2">No orders found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? 'Try adjusting your filters or search query'
                        : 'No orders in the system yet'}
                    </p>
                    {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map(order => (
                      <div 
                        key={order.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold">#{order.id}</span>
                            <Badge className={statusColors[order.status]}>
                              {order.status}
                            </Badge>
                            <Badge className={priorityColors[order.priority]}>
                              {order.priority}
                            </Badge>
                            <Badge variant="outline">{order.serviceType}</Badge>
                            {(order.inventoryStatus === 'pending' || order.inventoryStatus === 'partial') && (
                              <Badge variant="outline" className="text-orange-500">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Inventory {order.inventoryStatus}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{order.customerName}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {order.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              Due {format(new Date(order.dueDate), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {order.estimatedDuration} min
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Link href="/calendar">
                            <Button variant="outline" size="sm">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              Schedule
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading ? (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : subcontractors.length === 0 ? (
                <Card className="lg:col-span-2">
                  <CardContent className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-semibold mb-2">No subcontractors found</p>
                    <p className="text-sm text-muted-foreground">
                      Add subcontractors to your network to start managing jobs
                    </p>
                  </CardContent>
                </Card>
              ) : (
                subcontractors.map(sub => (
                  <Card key={sub.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {sub.name}
                            {!sub.active && (
                              <Badge variant="outline" className="text-red-500">
                                Inactive
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1 space-y-1">
                            <p className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {sub.email}
                            </p>
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {sub.phone}
                            </p>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">{sub.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Service Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {sub.serviceAreas.map(area => (
                            <Badge key={area} variant="outline">{area}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Daily Capacity</p>
                          <p className="text-2xl font-bold">{sub.maxDailyJobs}</p>
                        </div>
                        {sub.currentDailyJobs !== undefined && (
                          <div>
                            <p className="text-sm text-muted-foreground">Today's Jobs</p>
                            <p className="text-2xl font-bold">{sub.currentDailyJobs}</p>
                          </div>
                        )}
                      </div>

                      {sub.availableCapacity !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Available Capacity</span>
                            <span className="text-sm font-bold">{sub.availableCapacity} slots</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                sub.availableCapacity > sub.maxDailyJobs / 2 
                                  ? 'bg-green-500' 
                                  : sub.availableCapacity > 0 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                              }`}
                              style={{ 
                                width: `${Math.max(5, (sub.availableCapacity / sub.maxDailyJobs) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ) : analytics ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Subcontractors</CardTitle>
                    <CardDescription>Ranked by completion count and customer satisfaction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.topSubcontractors.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No performance data available yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {analytics.topSubcontractors.map((sub, index) => (
                          <div 
                            key={sub.id} 
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold">{sub.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sub.completions} completions
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-semibold">{sub.avgRating.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                      <p className="text-3xl font-bold mb-2">{analytics.summary.ghostJobs}</p>
                      <p className="text-sm text-muted-foreground">Ghost Jobs Detected</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        No-shows or cancelled without notice
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto text-orange-500 mb-4" />
                      <p className="text-3xl font-bold mb-2">{analytics.summary.doubleBookings}</p>
                      <p className="text-sm text-muted-foreground">Double Bookings</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Scheduling conflicts identified
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <XCircle className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                      <p className="text-3xl font-bold mb-2">{analytics.summary.cancellations}</p>
                      <p className="text-sm text-muted-foreground">Cancellations</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Total cancelled orders
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <OrderDetailsDialog />
      <CancelOrderDialog />
    </div>
  )
}