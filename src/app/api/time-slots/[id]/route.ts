import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSlots, orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid time slot ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const timeSlotId = parseInt(id);

    // Fetch the time slot to check if it exists and get its current status
    const existingSlot = await db.select()
      .from(timeSlots)
      .where(eq(timeSlots.id, timeSlotId))
      .limit(1);

    if (existingSlot.length === 0) {
      return NextResponse.json(
        { 
          error: "Time slot not found",
          code: "TIME_SLOT_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    const slot = existingSlot[0];

    // Check if the slot is already completed
    if (slot.status === 'completed') {
      return NextResponse.json(
        { 
          error: "Cannot cancel a completed time slot",
          code: "CANNOT_CANCEL_COMPLETED" 
        },
        { status: 400 }
      );
    }

    // Update the time slot to cancelled status (soft delete)
    const cancelledSlot = await db.update(timeSlots)
      .set({
        status: 'cancelled',
        isAvailable: false
      })
      .where(eq(timeSlots.id, timeSlotId))
      .returning();

    if (cancelledSlot.length === 0) {
      return NextResponse.json(
        { 
          error: "Failed to cancel time slot",
          code: "CANCELLATION_FAILED" 
        },
        { status: 500 }
      );
    }

    // If the slot had an associated order, update the order status
    if (slot.orderId) {
      const relatedOrder = await db.select()
        .from(orders)
        .where(eq(orders.id, slot.orderId))
        .limit(1);

      if (relatedOrder.length > 0) {
        const orderStatus = relatedOrder[0].status;

        // If order was claimed or scheduled, set it back to unassigned
        if (orderStatus === 'claimed' || orderStatus === 'scheduled') {
          await db.update(orders)
            .set({
              status: 'unassigned'
            })
            .where(eq(orders.id, slot.orderId));
        }
      }
    }

    return NextResponse.json(
      {
        message: "Time slot cancelled successfully",
        timeSlot: cancelledSlot[0]
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE time slot error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}