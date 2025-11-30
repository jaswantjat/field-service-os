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

// Raw Baserow API response structure (as returned by the API)
interface BaserowRawOrder {
  id: number;
  Order_ID?: string;
  Status?: {
    id: number;
    value: string;
    color: string;
  } | null;
  Customer_Name?: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  City?: string;
  Zip_Code?: string;
  House_Type?: {
    id: number;
    value: string;
    color: string;
  } | null;
  Kit_Received?: boolean;
  Starlink_ID?: string;
  Notes?: string;
  Photo_URL?: Array<{
    url: string;
    visible_name: string;
    name: string;
    size: number;
    mime_type: string;
  }>;
  Date?: string;
  Availability?: string;
  Cable_Distance?: string;
  GPS_Link?: string;
  Auth_Community?: string;
  [key: string]: any;
}

// Normalized order structure for the app
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
  // Additional Baserow-specific fields
  Order_ID?: string;
  Starlink_ID?: string;
  Kit_Received?: boolean;
  Photo_URL?: Array<{
    url: string;
    visible_name: string;
  }>;
  Availability?: string;
  GPS_Link?: string;
}

interface BaserowListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BaserowRawOrder[];
}

/**
 * Transform raw Baserow response to normalized order structure
 */
function transformOrder(raw: BaserowRawOrder): BaserowOrder {
  return {
    id: raw.id,
    Customer_Name: raw.Customer_Name || '',
    Customer_Email: raw.Email,
    Customer_Phone: raw.Phone,
    Address: raw.Address || '',
    City: raw.City || '',
    Service_Type: raw.House_Type?.value || 'Standard',
    Status: raw.Status?.value || 'Unknown',
    Special_Instructions: raw.Notes,
    Install_Date: raw.Date,
    Inventory_Status: raw.Kit_Received ? 'In Stock' : 'Pending',
    Order_ID: raw.Order_ID,
    Starlink_ID: raw.Starlink_ID,
    Kit_Received: raw.Kit_Received,
    Photo_URL: raw.Photo_URL?.map(p => ({ url: p.url, visible_name: p.visible_name })),
    Availability: raw.Availability,
    GPS_Link: raw.GPS_Link,
  };
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
        type: "contains",
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
      const errorText = await res.text();
      throw new Error(`Baserow API error ${res.status}: ${errorText}`);
    }

    const data: BaserowListResponse = await res.json();
    
    // Transform and filter out empty rows
    return data.results
      .filter(row => row.Customer_Name && row.Customer_Name.trim() !== '')
      .map(transformOrder);
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
      const errorText = await res.text();
      throw new Error(`Baserow API error ${res.status}: ${errorText}`);
    }

    const raw: BaserowRawOrder = await res.json();
    return transformOrder(raw);
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
    
    // Map to actual Baserow field names
    if (data.installDate) {
      updateData.Date = data.installDate;
    }
    
    // Note: Status and Technician fields might need to be updated based on your Baserow schema
    // For now, we'll use Notes to track scheduling info
    if (data.technicianName || data.status) {
      const scheduleNote = `Scheduled: ${data.status || 'Assigned'} | Technician: ${data.technicianName || 'TBD'}`;
      updateData.Notes = scheduleNote;
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
      const errorText = await res.text();
      throw new Error(`Baserow API error ${res.status}: ${errorText}`);
    }

    const raw: BaserowRawOrder = await res.json();
    return transformOrder(raw);
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