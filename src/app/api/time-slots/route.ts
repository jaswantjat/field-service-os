import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSlots, orders } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const orderId = searchParams.get('order_id');
    const subcontractorId = searchParams.get('subcontractor_id');
    const slotDate = searchParams.get('slot_date');
    const status = searchParams.get('status');
    const isAvailable = searchParams.get('is_available');

    let query = db.select().from(timeSlots);

    const conditions = [];

    if (orderId) {
      const orderIdInt = parseInt(orderId);
      if (isNaN(orderIdInt)) {
        return NextResponse.json({ 
          error: 'Invalid order_id parameter',
          code: 'INVALID_ORDER_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(timeSlots.orderId, orderIdInt));
    }

    if (subcontractorId) {
      const subcontractorIdInt = parseInt(subcontractorId);
      if (isNaN(subcontractorIdInt)) {
        return NextResponse.json({ 
          error: 'Invalid subcontractor_id parameter',
          code: 'INVALID_SUBCONTRACTOR_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(timeSlots.subcontractorId, subcontractorIdInt));
    }

    if (slotDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
        return NextResponse.json({ 
          error: 'Invalid slot_date format. Expected YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT' 
        }, { status: 400 });
      }
      conditions.push(eq(timeSlots.slotDate, slotDate));
    }

    if (status) {
      const validStatuses = ['available', 'claimed', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status. Must be one of: available, claimed, completed, cancelled',
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      conditions.push(eq(timeSlots.status, status));
    }

    if (isAvailable !== null) {
      const isAvailableBool = isAvailable === 'true';
      conditions.push(eq(timeSlots.isAvailable, isAvailableBool));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(asc(timeSlots.slotDate), asc(timeSlots.slotStartTime))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, subcontractorId, slotDate, slotStartTime, slotEndTime, isAvailable, status } = body;

    if (!orderId) {
      return NextResponse.json({ 
        error: 'orderId is required',
        code: 'MISSING_ORDER_ID' 
      }, { status: 400 });
    }

    if (!slotDate) {
      return NextResponse.json({ 
        error: 'slotDate is required',
        code: 'MISSING_SLOT_DATE' 
      }, { status: 400 });
    }

    if (!slotStartTime) {
      return NextResponse.json({ 
        error: 'slotStartTime is required',
        code: 'MISSING_SLOT_START_TIME' 
      }, { status: 400 });
    }

    if (!slotEndTime) {
      return NextResponse.json({ 
        error: 'slotEndTime is required',
        code: 'MISSING_SLOT_END_TIME' 
      }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
      return NextResponse.json({ 
        error: 'Invalid slotDate format. Expected YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT' 
      }, { status: 400 });
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(slotStartTime)) {
      return NextResponse.json({ 
        error: 'Invalid slotStartTime format. Expected HH:MM (24-hour)',
        code: 'INVALID_START_TIME_FORMAT' 
      }, { status: 400 });
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(slotEndTime)) {
      return NextResponse.json({ 
        error: 'Invalid slotEndTime format. Expected HH:MM (24-hour)',
        code: 'INVALID_END_TIME_FORMAT' 
      }, { status: 400 });
    }

    if (slotStartTime >= slotEndTime) {
      return NextResponse.json({ 
        error: 'slotStartTime must be before slotEndTime',
        code: 'INVALID_TIME_RANGE' 
      }, { status: 400 });
    }

    const orderExists = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderExists.length === 0) {
      return NextResponse.json({ 
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND' 
      }, { status: 400 });
    }

    const validStatuses = ['available', 'claimed', 'completed', 'cancelled'];
    const finalStatus = status || 'available';
    if (!validStatuses.includes(finalStatus)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: available, claimed, completed, cancelled',
        code: 'INVALID_STATUS' 
      }, { status: 400 });
    }

    const insertData: any = {
      orderId,
      slotDate,
      slotStartTime,
      slotEndTime,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      status: finalStatus,
      claimedAt: null
    };

    if (subcontractorId !== undefined) {
      insertData.subcontractorId = subcontractorId;
    }

    const newTimeSlot = await db.insert(timeSlots)
      .values(insertData)
      .returning();

    return NextResponse.json(newTimeSlot[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}