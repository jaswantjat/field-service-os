import { NextRequest, NextResponse } from 'next/server';
import { scheduleOrder } from '@/lib/baserow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status, technicianName, installDate, timeSlot } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const updatedOrder = await scheduleOrder(orderId, {
      status,
      technicianName,
      installDate,
      timeSlot
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error scheduling order in Baserow:', error);
    return NextResponse.json(
      { error: 'Failed to schedule order in Baserow' },
      { status: 500 }
    );
  }
}
