// Baserow API Client - Direct connection to Baserow as Backend
// No local database, no syncing - Baserow is the single source of truth

const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL || "https://api.baserow.io";
const ORDERS_TABLE_ID = process.env.BASEROW_ORDERS_TABLE_ID;

if (!BASEROW_TOKEN) {
  console.warn("BASEROW_TOKEN is not set. Baserow API calls will fail.");
}

if (!ORDERS_TABLE_ID) {
  console.warn("BASEROW_ORDERS_TABLE_ID is not set. Baserow API calls will fail.");
}

interface BaserowOrder {
  id: number;
  Customer_Name: string;
  Customer_Email?: string;
  Customer_Phone?: string;
  Address: string;
  City: string;
  Location_Lat?: number;
  Location_Lng?: number;
  Service_Type: string;
  Status: string;
  Priority?: string;
  Partner_Assigned?: string;
  Technician_Name?: string;
  Install_Date?: string;
  Estimated_Duration?: number;
  Special_Instructions?: string;
  Inventory_Status?: string;
  Due_Date?: string;
  Created_At?: string;
}

interface BaserowListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BaserowOrder[];
}

/**
 * Fetch orders from Baserow with optional filters
 * @param filters - Object containing filter criteria
 * @returns Promise with orders data
 */
export async function getOrders(filters?: {
  status?: string;
  partnerRegion?: string;
  city?: string;
  priority?: string;
}): Promise<BaserowOrder[]> {
  try {
    if (!BASEROW_TOKEN || !ORDERS_TABLE_ID) {
      throw new Error("Baserow configuration is missing");
    }

    // Build filter query
    const filterConditions: any[] = [];
    
    if (filters?.status) {
      filterConditions.push({
        field: "Status",
        type: "equal",
        value: filters.status
      });
    }
    
    if (filters?.partnerRegion) {
      filterConditions.push({
        field: "Partner_Assigned",
        type: "contains",
        value: filters.partnerRegion
      });
    }
    
    if (filters?.city) {
      filterConditions.push({
        field: "City",
        type: "equal",
        value: filters.city
      });
    }
    
    if (filters?.priority) {
      filterConditions.push({
        field: "Priority",
        type: "equal",
        value: filters.priority
      });
    }

    // Build URL with filters
    let url = `${BASEROW_BASE_URL}/api/database/rows/table/${ORDERS_TABLE_ID}/?user_field_names=true`;
    
    if (filterConditions.length > 0) {
      const filterQuery = {
        filter_type: "AND",
        filters: filterConditions
      };
      url += `&filters=${encodeURIComponent(JSON.stringify(filterQuery))}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`,
      },
      cache: "no-store", // Ensure real-time data
    });

    if (!res.ok) {
      throw new Error(`Baserow API error: ${res.status} ${res.statusText}`);
    }

    const data: BaserowListResponse = await res.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching orders from Baserow:", error);
    throw error;
  }
}

/**
 * Get orders ready to dispatch for a specific partner region
 */
export async function getOrdersForPartner(partnerRegion: string): Promise<BaserowOrder[]> {
  return getOrders({
    status: "Ready to Dispatch",
    partnerRegion
  });
}

/**
 * Get a single order by ID
 */
export async function getOrderById(orderId: number): Promise<BaserowOrder> {
  try {
    if (!BASEROW_TOKEN || !ORDERS_TABLE_ID) {
      throw new Error("Baserow configuration is missing");
    }

    const res = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${ORDERS_TABLE_ID}/${orderId}/?user_field_names=true`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`Baserow API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching order from Baserow:", error);
    throw error;
  }
}

/**
 * Schedule an order - update status and assign technician
 */
export async function scheduleOrder(
  rowId: number,
  data: {
    technicianName?: string;
    installDate?: string;
    status?: string;
    timeSlot?: string;
  }
): Promise<BaserowOrder> {
  try {
    if (!BASEROW_TOKEN || !ORDERS_TABLE_ID) {
      throw new Error("Baserow configuration is missing");
    }

    const updateData: any = {};
    
    if (data.status) {
      updateData.Status = data.status;
    }
    
    if (data.technicianName) {
      updateData.Technician_Name = data.technicianName;
    }
    
    if (data.installDate) {
      updateData.Install_Date = data.installDate;
    }
    
    if (data.timeSlot) {
      updateData.Time_Slot = data.timeSlot;
    }

    const res = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${ORDERS_TABLE_ID}/${rowId}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!res.ok) {
      throw new Error(`Baserow API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error scheduling order in Baserow:", error);
    throw error;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  rowId: number,
  status: string
): Promise<BaserowOrder> {
  return scheduleOrder(rowId, { status });
}

/**
 * Claim an order (assign to subcontractor)
 */
export async function claimOrder(
  rowId: number,
  subcontractorName: string
): Promise<BaserowOrder> {
  try {
    if (!BASEROW_TOKEN || !ORDERS_TABLE_ID) {
      throw new Error("Baserow configuration is missing");
    }

    const res = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${ORDERS_TABLE_ID}/${rowId}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Status: "Claimed",
          Technician_Name: subcontractorName,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Baserow API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error claiming order in Baserow:", error);
    throw error;
  }
}

/**
 * Complete an order with job completion data
 */
export async function completeOrder(
  rowId: number,
  data: {
    completionNotes?: string;
    completionPhotos?: string[];
    signature?: string;
    rating?: number;
    completedAt?: string;
  }
): Promise<BaserowOrder> {
  try {
    if (!BASEROW_TOKEN || !ORDERS_TABLE_ID) {
      throw new Error("Baserow configuration is missing");
    }

    const updateData: any = {
      Status: "Completed",
    };
    
    if (data.completionNotes) {
      updateData.Completion_Notes = data.completionNotes;
    }
    
    if (data.completionPhotos && data.completionPhotos.length > 0) {
      updateData.Completion_Photos = data.completionPhotos.join(", ");
    }
    
    if (data.signature) {
      updateData.Customer_Signature = data.signature;
    }
    
    if (data.rating) {
      updateData.Customer_Rating = data.rating;
    }
    
    if (data.completedAt) {
      updateData.Completed_At = data.completedAt;
    }

    const res = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${ORDERS_TABLE_ID}/${rowId}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!res.ok) {
      throw new Error(`Baserow API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error completing order in Baserow:", error);
    throw error;
  }
}
