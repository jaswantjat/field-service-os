import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSlots, orders, subcontractors } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    
    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid time slot ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const timeSlotId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { subcontractorId } = body;

    // Validate required field
    if (!subcontractorId) {
      return NextResponse.json(
        { error: 'Subcontractor ID is required', code: 'MISSING_SUBCONTRACTOR_ID' },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(subcontractorId))) {
      return NextResponse.json(
        { error: 'Valid subcontractor ID is required', code: 'INVALID_SUBCONTRACTOR_ID' },
        { status: 400 }
      );
    }

    const parsedSubcontractorId = parseInt(subcontractorId);

    // Check if time slot exists
    const existingSlot = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.id, timeSlotId))
      .limit(1);

    if (existingSlot.length === 0) {
      return NextResponse.json(
        { error: 'Time slot not found', code: 'TIME_SLOT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const slot = existingSlot[0];

    // Check if slot is available
    if (!slot.isAvailable) {
      return NextResponse.json(
        { error: 'Time slot is not available', code: 'SLOT_NOT_AVAILABLE' },
        { status: 400 }
      );
    }

    // Check if slot status is 'available'
    if (slot.status !== 'available') {
      return NextResponse.json(
        { error: 'Time slot has already been claimed', code: 'SLOT_ALREADY_CLAIMED' },
        { status: 400 }
      );
    }

    // Verify subcontractor exists and is active
    const subcontractor = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, parsedSubcontractorId))
      .limit(1);

    if (subcontractor.length === 0) {
      return NextResponse.json(
        { error: 'Subcontractor not found', code: 'SUBCONTRACTOR_NOT_FOUND' },
        { status: 400 }
      );
    }

    if (!subcontractor[0].active) {
      return NextResponse.json(
        { error: 'Subcontractor is not active', code: 'SUBCONTRACTOR_INACTIVE' },
        { status: 400 }
      );
    }

    const maxDailyJobs = subcontractor[0].maxDailyJobs;

    // Check subcontractor's capacity for the slot date
    const existingClaims = await db
      .select({ count: sql<number>`count(*)` })
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.subcontractorId, parsedSubcontractorId),
          eq(timeSlots.slotDate, slot.slotDate),
          sql`${timeSlots.status} != 'cancelled'`
        )
      );

    const currentJobCount = Number(existingClaims[0].count);

    if (currentJobCount >= maxDailyJobs) {
      return NextResponse.json(
        {
          error: `Subcontractor has reached maximum daily jobs (${maxDailyJobs}) for this date`,
          code: 'MAX_DAILY_JOBS_REACHED'
        },
        { status: 400 }
      );
    }

    // Claim the time slot
    const claimedAt = new Date().toISOString();
    const updatedSlot = await db
      .update(timeSlots)
      .set({
        subcontractorId: parsedSubcontractorId,
        isAvailable: false,
        claimedAt,
        status: 'claimed'
      })
      .where(eq(timeSlots.id, timeSlotId))
      .returning();

    if (updatedSlot.length === 0) {
      return NextResponse.json(
        { error: 'Failed to claim time slot', code: 'CLAIM_FAILED' },
        { status: 500 }
      );
    }

    // Update related order status if it was unassigned
    const relatedOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, slot.orderId))
      .limit(1);

    if (relatedOrder.length > 0 && relatedOrder[0].status === 'unassigned') {
      await db
        .update(orders)
        .set({ status: 'claimed' })
        .where(eq(orders.id, slot.orderId));
    }

    return NextResponse.json(updatedSlot[0], { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}