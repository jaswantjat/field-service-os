export interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  locationLat: number;
  locationLng: number;
  serviceType: string;
  inventoryItems: InventoryItem[];
  inventoryStatus: 'available' | 'partial' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number;
  specialInstructions: string | null;
  status: 'unassigned' | 'claimed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  dueDate: string;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  inStock: boolean;
}

export interface Subcontractor {
  id: number;
  name: string;
  email: string;
  phone: string;
  serviceAreas: string[];
  maxDailyJobs: number;
  rating: number;
  active: boolean;
  createdAt: string;
  currentDailyJobs?: number;
  availableCapacity?: number;
}

export interface TimeSlot {
  id: number;
  orderId: number;
  subcontractorId: number | null;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  isAvailable: boolean;
  claimedAt: string | null;
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
}

export interface JobCompletion {
  id: number;
  orderId: number;
  subcontractorId: number;
  timeSlotId: number;
  completionPhotos: string[];
  signatureData: string;
  gpsLat: number;
  gpsLng: number;
  gpsTimestamp: string;
  completionNotes: string | null;
  completedAt: string;
  customerSatisfaction: number | null;
}

export interface Analytics {
  summary: {
    totalOrders: number;
    completedOrders: number;
    completionRate: number;
    ghostJobs: number;
    doubleBookings: number;
    cancellations: number;
  };
  ordersByStatus: Record<string, number>;
  ordersByPriority: Record<string, number>;
  ordersByServiceType: Record<string, number>;
  topSubcontractors: Array<{
    id: number;
    name: string;
    completions: number;
    avgRating: number;
  }>;
}
