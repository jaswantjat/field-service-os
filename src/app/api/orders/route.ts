import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq, like, and, or, desc, sql } from 'drizzle-orm';

const VALID_SERVICE_TYPES = ['Installation', 'Delivery', 'Repair'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_INVENTORY_STATUSES = ['available', 'partial', 'pending'];
const VALID_STATUSES = ['unassigned', 'claimed', 'scheduled', 'in_progress', 'completed', 'cancelled'];

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, parseInt(id)))
        .limit(1);

      if (order.length === 0) {
        return NextResponse.json(
          { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(order[0], { status: 200 });
    }

    // List with filters, search, and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const inventoryStatusFilter = searchParams.get('inventory_status');
    const cityFilter = searchParams.get('city');

    const conditions = [];

    // Search condition
    if (search) {
      conditions.push(
        or(
          like(orders.customerName, `%${search}%`),
          like(orders.customerEmail, `%${search}%`),
          like(orders.address, `%${search}%`)
        )
      );
    }

    // Filter conditions
    if (statusFilter) {
      conditions.push(eq(orders.status, statusFilter));
    }

    if (priorityFilter) {
      conditions.push(eq(orders.priority, priorityFilter));
    }

    if (inventoryStatusFilter) {
      conditions.push(eq(orders.inventoryStatus, inventoryStatusFilter));
    }

    if (cityFilter) {
      conditions.push(eq(orders.city, cityFilter));
    }

    // Build query
    let query = db.select().from(orders);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Fetch results
    const results = await query;

    // Sort by priority and createdAt
    const sortedResults = results.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply pagination
    const paginatedResults = sortedResults.slice(offset, offset + limit);

    return NextResponse.json(paginatedResults, { status: 200 });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const {
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      locationLat,
      locationLng,
      serviceType,
      inventoryItems,
      estimatedDuration,
      dueDate,
      specialInstructions,
      priority,
      inventoryStatus,
      status,
    } = body;

    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      return NextResponse.json(
        { error: 'Customer name is required', code: 'MISSING_CUSTOMER_NAME' },
        { status: 400 }
      );
    }

    if (!customerEmail || typeof customerEmail !== 'string' || customerEmail.trim() === '') {
      return NextResponse.json(
        { error: 'Customer email is required', code: 'MISSING_CUSTOMER_EMAIL' },
        { status: 400 }
      );
    }

    if (!validateEmail(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim() === '') {
      return NextResponse.json(
        { error: 'Customer phone is required', code: 'MISSING_CUSTOMER_PHONE' },
        { status: 400 }
      );
    }

    if (!address || typeof address !== 'string' || address.trim() === '') {
      return NextResponse.json(
        { error: 'Address is required', code: 'MISSING_ADDRESS' },
        { status: 400 }
      );
    }

    if (!city || typeof city !== 'string' || city.trim() === '') {
      return NextResponse.json(
        { error: 'City is required', code: 'MISSING_CITY' },
        { status: 400 }
      );
    }

    if (locationLat === undefined || locationLat === null || typeof locationLat !== 'number') {
      return NextResponse.json(
        { error: 'Location latitude must be a number', code: 'INVALID_LOCATION_LAT' },
        { status: 400 }
      );
    }

    if (locationLng === undefined || locationLng === null || typeof locationLng !== 'number') {
      return NextResponse.json(
        { error: 'Location longitude must be a number', code: 'INVALID_LOCATION_LNG' },
        { status: 400 }
      );
    }

    if (!serviceType || typeof serviceType !== 'string') {
      return NextResponse.json(
        { error: 'Service type is required', code: 'MISSING_SERVICE_TYPE' },
        { status: 400 }
      );
    }

    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json(
        {
          error: `Service type must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
          code: 'INVALID_SERVICE_TYPE',
        },
        { status: 400 }
      );
    }

    if (!inventoryItems || !Array.isArray(inventoryItems)) {
      return NextResponse.json(
        { error: 'Inventory items must be an array', code: 'INVALID_INVENTORY_ITEMS' },
        { status: 400 }
      );
    }

    if (!estimatedDuration || typeof estimatedDuration !== 'number' || estimatedDuration <= 0) {
      return NextResponse.json(
        { error: 'Estimated duration must be a positive number', code: 'INVALID_ESTIMATED_DURATION' },
        { status: 400 }
      );
    }

    if (!dueDate || typeof dueDate !== 'string') {
      return NextResponse.json(
        { error: 'Due date is required', code: 'MISSING_DUE_DATE' },
        { status: 400 }
      );
    }

    // Validate optional fields with defaults
    const finalPriority = priority || 'medium';
    if (!VALID_PRIORITIES.includes(finalPriority)) {
      return NextResponse.json(
        {
          error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
          code: 'INVALID_PRIORITY',
        },
        { status: 400 }
      );
    }

    const finalInventoryStatus = inventoryStatus || 'pending';
    if (!VALID_INVENTORY_STATUSES.includes(finalInventoryStatus)) {
      return NextResponse.json(
        {
          error: `Inventory status must be one of: ${VALID_INVENTORY_STATUSES.join(', ')}`,
          code: 'INVALID_INVENTORY_STATUS',
        },
        { status: 400 }
      );
    }

    const finalStatus = status || 'unassigned';
    if (!VALID_STATUSES.includes(finalStatus)) {
      return NextResponse.json(
        {
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Create order
    const newOrder = await db
      .insert(orders)
      .values({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        city: city.trim(),
        locationLat,
        locationLng,
        serviceType,
        inventoryItems,
        inventoryStatus: finalInventoryStatus,
        priority: finalPriority,
        estimatedDuration,
        specialInstructions: specialInstructions ? specialInstructions.trim() : null,
        status: finalStatus,
        dueDate,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newOrder[0], { status: 201 });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json(
        { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    // Validate and prepare updates
    if (body.customerName !== undefined) {
      if (typeof body.customerName !== 'string' || body.customerName.trim() === '') {
        return NextResponse.json(
          { error: 'Customer name must be a non-empty string', code: 'INVALID_CUSTOMER_NAME' },
          { status: 400 }
        );
      }
      updates.customerName = body.customerName.trim();
    }

    if (body.customerEmail !== undefined) {
      if (typeof body.customerEmail !== 'string' || !validateEmail(body.customerEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }
      updates.customerEmail = body.customerEmail.trim().toLowerCase();
    }

    if (body.customerPhone !== undefined) {
      if (typeof body.customerPhone !== 'string' || body.customerPhone.trim() === '') {
        return NextResponse.json(
          { error: 'Customer phone must be a non-empty string', code: 'INVALID_CUSTOMER_PHONE' },
          { status: 400 }
        );
      }
      updates.customerPhone = body.customerPhone.trim();
    }

    if (body.address !== undefined) {
      if (typeof body.address !== 'string' || body.address.trim() === '') {
        return NextResponse.json(
          { error: 'Address must be a non-empty string', code: 'INVALID_ADDRESS' },
          { status: 400 }
        );
      }
      updates.address = body.address.trim();
    }

    if (body.city !== undefined) {
      if (typeof body.city !== 'string' || body.city.trim() === '') {
        return NextResponse.json(
          { error: 'City must be a non-empty string', code: 'INVALID_CITY' },
          { status: 400 }
        );
      }
      updates.city = body.city.trim();
    }

    if (body.locationLat !== undefined) {
      if (typeof body.locationLat !== 'number') {
        return NextResponse.json(
          { error: 'Location latitude must be a number', code: 'INVALID_LOCATION_LAT' },
          { status: 400 }
        );
      }
      updates.locationLat = body.locationLat;
    }

    if (body.locationLng !== undefined) {
      if (typeof body.locationLng !== 'number') {
        return NextResponse.json(
          { error: 'Location longitude must be a number', code: 'INVALID_LOCATION_LNG' },
          { status: 400 }
        );
      }
      updates.locationLng = body.locationLng;
    }

    if (body.serviceType !== undefined) {
      if (!VALID_SERVICE_TYPES.includes(body.serviceType)) {
        return NextResponse.json(
          {
            error: `Service type must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
            code: 'INVALID_SERVICE_TYPE',
          },
          { status: 400 }
        );
      }
      updates.serviceType = body.serviceType;
    }

    if (body.inventoryItems !== undefined) {
      if (!Array.isArray(body.inventoryItems)) {
        return NextResponse.json(
          { error: 'Inventory items must be an array', code: 'INVALID_INVENTORY_ITEMS' },
          { status: 400 }
        );
      }
      updates.inventoryItems = body.inventoryItems;
    }

    if (body.inventoryStatus !== undefined) {
      if (!VALID_INVENTORY_STATUSES.includes(body.inventoryStatus)) {
        return NextResponse.json(
          {
            error: `Inventory status must be one of: ${VALID_INVENTORY_STATUSES.join(', ')}`,
            code: 'INVALID_INVENTORY_STATUS',
          },
          { status: 400 }
        );
      }
      updates.inventoryStatus = body.inventoryStatus;
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json(
          {
            error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
            code: 'INVALID_PRIORITY',
          },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if (body.estimatedDuration !== undefined) {
      if (typeof body.estimatedDuration !== 'number' || body.estimatedDuration <= 0) {
        return NextResponse.json(
          { error: 'Estimated duration must be a positive number', code: 'INVALID_ESTIMATED_DURATION' },
          { status: 400 }
        );
      }
      updates.estimatedDuration = body.estimatedDuration;
    }

    if (body.specialInstructions !== undefined) {
      updates.specialInstructions = body.specialInstructions ? body.specialInstructions.trim() : null;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
            code: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (body.dueDate !== undefined) {
      if (typeof body.dueDate !== 'string') {
        return NextResponse.json(
          { error: 'Due date must be a string', code: 'INVALID_DUE_DATE' },
          { status: 400 }
        );
      }
      updates.dueDate = body.dueDate;
    }

    // Always update updatedAt (even though not in schema, maintaining pattern)
    // Since schema doesn't have updatedAt, we'll skip it

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_UPDATES' },
        { status: 400 }
      );
    }

    const updated = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json(
        { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(orders)
      .where(eq(orders.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Order deleted successfully',
        order: deleted[0],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}