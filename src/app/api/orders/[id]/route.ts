import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

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
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Prevent updating immutable fields
    if ('id' in body) {
      return NextResponse.json(
        { error: 'ID cannot be updated', code: 'IMMUTABLE_FIELD' },
        { status: 400 }
      );
    }

    if ('createdAt' in body) {
      return NextResponse.json(
        { error: 'Created date cannot be updated', code: 'IMMUTABLE_FIELD' },
        { status: 400 }
      );
    }

    // Check if order exists
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

    // Validate fields if provided
    if (body.customerEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.customerEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }
      body.customerEmail = body.customerEmail.toLowerCase().trim();
    }

    if (body.customerName !== undefined) {
      body.customerName = body.customerName.trim();
      if (!body.customerName) {
        return NextResponse.json(
          { error: 'Customer name cannot be empty', code: 'INVALID_CUSTOMER_NAME' },
          { status: 400 }
        );
      }
    }

    if (body.customerPhone !== undefined) {
      body.customerPhone = body.customerPhone.trim();
      if (!body.customerPhone) {
        return NextResponse.json(
          { error: 'Customer phone cannot be empty', code: 'INVALID_CUSTOMER_PHONE' },
          { status: 400 }
        );
      }
    }

    if (body.address !== undefined) {
      body.address = body.address.trim();
      if (!body.address) {
        return NextResponse.json(
          { error: 'Address cannot be empty', code: 'INVALID_ADDRESS' },
          { status: 400 }
        );
      }
    }

    if (body.city !== undefined) {
      body.city = body.city.trim();
      if (!body.city) {
        return NextResponse.json(
          { error: 'City cannot be empty', code: 'INVALID_CITY' },
          { status: 400 }
        );
      }
    }

    if (body.locationLat !== undefined) {
      if (typeof body.locationLat !== 'number' || body.locationLat < -90 || body.locationLat > 90) {
        return NextResponse.json(
          { error: 'Invalid latitude (must be between -90 and 90)', code: 'INVALID_LATITUDE' },
          { status: 400 }
        );
      }
    }

    if (body.locationLng !== undefined) {
      if (typeof body.locationLng !== 'number' || body.locationLng < -180 || body.locationLng > 180) {
        return NextResponse.json(
          { error: 'Invalid longitude (must be between -180 and 180)', code: 'INVALID_LONGITUDE' },
          { status: 400 }
        );
      }
    }

    if (body.serviceType !== undefined) {
      body.serviceType = body.serviceType.trim();
      if (!body.serviceType) {
        return NextResponse.json(
          { error: 'Service type cannot be empty', code: 'INVALID_SERVICE_TYPE' },
          { status: 400 }
        );
      }
    }

    if (body.inventoryItems !== undefined) {
      if (!Array.isArray(body.inventoryItems)) {
        return NextResponse.json(
          { error: 'Inventory items must be an array', code: 'INVALID_INVENTORY_ITEMS' },
          { status: 400 }
        );
      }

      for (const item of body.inventoryItems) {
        if (!item.name || typeof item.name !== 'string') {
          return NextResponse.json(
            { error: 'Each inventory item must have a valid name', code: 'INVALID_INVENTORY_ITEM' },
            { status: 400 }
          );
        }
        if (typeof item.quantity !== 'number' || item.quantity < 0) {
          return NextResponse.json(
            { error: 'Each inventory item must have a valid quantity', code: 'INVALID_INVENTORY_ITEM' },
            { status: 400 }
          );
        }
        if (typeof item.inStock !== 'boolean') {
          return NextResponse.json(
            { error: 'Each inventory item must have inStock boolean', code: 'INVALID_INVENTORY_ITEM' },
            { status: 400 }
          );
        }
      }
    }

    if (body.inventoryStatus !== undefined) {
      const validStatuses = ['pending', 'available', 'unavailable', 'partial'];
      if (!validStatuses.includes(body.inventoryStatus)) {
        return NextResponse.json(
          { error: 'Invalid inventory status', code: 'INVALID_INVENTORY_STATUS' },
          { status: 400 }
        );
      }
    }

    if (body.priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          { error: 'Invalid priority', code: 'INVALID_PRIORITY' },
          { status: 400 }
        );
      }
    }

    if (body.estimatedDuration !== undefined) {
      if (typeof body.estimatedDuration !== 'number' || body.estimatedDuration <= 0) {
        return NextResponse.json(
          { error: 'Estimated duration must be a positive number', code: 'INVALID_ESTIMATED_DURATION' },
          { status: 400 }
        );
      }
    }

    if (body.specialInstructions !== undefined && body.specialInstructions !== null) {
      body.specialInstructions = body.specialInstructions.trim();
    }

    if (body.status !== undefined) {
      const validStatuses = ['unassigned', 'assigned', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
    }

    if (body.dueDate !== undefined) {
      const dueDateObj = new Date(body.dueDate);
      if (isNaN(dueDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due date format', code: 'INVALID_DUE_DATE' },
          { status: 400 }
        );
      }
    }

    // Update the order
    const updated = await db
      .update(orders)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update order', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}