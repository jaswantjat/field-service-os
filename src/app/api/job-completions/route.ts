import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobCompletions, orders, timeSlots, subcontractors } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      subcontractorId,
      timeSlotId,
      completionPhotos,
      signatureData,
      gpsLat,
      gpsLng,
      completionNotes,
      customerSatisfaction
    } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json({
        error: "Order ID is required",
        code: "MISSING_ORDER_ID"
      }, { status: 400 });
    }

    if (!subcontractorId) {
      return NextResponse.json({
        error: "Subcontractor ID is required",
        code: "MISSING_SUBCONTRACTOR_ID"
      }, { status: 400 });
    }

    if (!timeSlotId) {
      return NextResponse.json({
        error: "Time slot ID is required",
        code: "MISSING_TIME_SLOT_ID"
      }, { status: 400 });
    }

    if (!completionPhotos || !Array.isArray(completionPhotos) || completionPhotos.length === 0) {
      return NextResponse.json({
        error: "Completion photos must be a non-empty array",
        code: "INVALID_COMPLETION_PHOTOS"
      }, { status: 400 });
    }

    if (!signatureData || typeof signatureData !== 'string' || signatureData.trim() === '') {
      return NextResponse.json({
        error: "Signature data is required and must not be empty",
        code: "MISSING_SIGNATURE_DATA"
      }, { status: 400 });
    }

    if (gpsLat === undefined || gpsLat === null || typeof gpsLat !== 'number' || isNaN(gpsLat)) {
      return NextResponse.json({
        error: "GPS latitude must be a valid number",
        code: "INVALID_GPS_LAT"
      }, { status: 400 });
    }

    if (gpsLng === undefined || gpsLng === null || typeof gpsLng !== 'number' || isNaN(gpsLng)) {
      return NextResponse.json({
        error: "GPS longitude must be a valid number",
        code: "INVALID_GPS_LNG"
      }, { status: 400 });
    }

    // Validate customer satisfaction if provided
    if (customerSatisfaction !== undefined && customerSatisfaction !== null) {
      if (!Number.isInteger(customerSatisfaction) || customerSatisfaction < 1 || customerSatisfaction > 5) {
        return NextResponse.json({
          error: "Customer satisfaction must be an integer between 1 and 5",
          code: "INVALID_CUSTOMER_SATISFACTION"
        }, { status: 400 });
      }
    }

    // Verify order exists
    const orderRecord = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);

    if (orderRecord.length === 0) {
      return NextResponse.json({
        error: "Order not found",
        code: "ORDER_NOT_FOUND"
      }, { status: 404 });
    }

    // Verify subcontractor exists
    const subcontractorRecord = await db.select()
      .from(subcontractors)
      .where(eq(subcontractors.id, parseInt(subcontractorId)))
      .limit(1);

    if (subcontractorRecord.length === 0) {
      return NextResponse.json({
        error: "Subcontractor not found",
        code: "SUBCONTRACTOR_NOT_FOUND"
      }, { status: 404 });
    }

    // Verify time slot exists
    const timeSlotRecord = await db.select()
      .from(timeSlots)
      .where(eq(timeSlots.id, parseInt(timeSlotId)))
      .limit(1);

    if (timeSlotRecord.length === 0) {
      return NextResponse.json({
        error: "Time slot not found",
        code: "TIME_SLOT_NOT_FOUND"
      }, { status: 404 });
    }

    const timeSlot = timeSlotRecord[0];

    // Validate timeSlot belongs to the order
    if (timeSlot.orderId !== parseInt(orderId)) {
      return NextResponse.json({
        error: "Time slot does not belong to the specified order",
        code: "TIME_SLOT_ORDER_MISMATCH"
      }, { status: 400 });
    }

    // Validate timeSlot is claimed by the subcontractor
    if (timeSlot.subcontractorId !== parseInt(subcontractorId)) {
      return NextResponse.json({
        error: "Time slot is not claimed by the specified subcontractor",
        code: "TIME_SLOT_SUBCONTRACTOR_MISMATCH"
      }, { status: 400 });
    }

    // Validate timeSlot status is 'claimed'
    if (timeSlot.status !== 'claimed') {
      if (timeSlot.status === 'completed') {
        return NextResponse.json({
          error: "Time slot is already completed",
          code: "TIME_SLOT_ALREADY_COMPLETED"
        }, { status: 400 });
      }
      return NextResponse.json({
        error: `Time slot status must be 'claimed', current status: ${timeSlot.status}`,
        code: "INVALID_TIME_SLOT_STATUS"
      }, { status: 400 });
    }

    // Create job completion
    const completedAt = new Date().toISOString();
    const gpsTimestamp = new Date().toISOString();

    const newJobCompletion = await db.insert(jobCompletions)
      .values({
        orderId: parseInt(orderId),
        subcontractorId: parseInt(subcontractorId),
        timeSlotId: parseInt(timeSlotId),
        completionPhotos,
        signatureData: signatureData.trim(),
        gpsLat,
        gpsLng,
        gpsTimestamp,
        completionNotes: completionNotes?.trim() || null,
        completedAt,
        customerSatisfaction: customerSatisfaction !== undefined && customerSatisfaction !== null ? customerSatisfaction : null
      })
      .returning();

    // Update order status to 'completed'
    await db.update(orders)
      .set({
        status: 'completed'
      })
      .where(eq(orders.id, parseInt(orderId)));

    // Update time slot status to 'completed'
    await db.update(timeSlots)
      .set({
        status: 'completed'
      })
      .where(eq(timeSlots.id, parseInt(timeSlotId)));

    return NextResponse.json(newJobCompletion[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}