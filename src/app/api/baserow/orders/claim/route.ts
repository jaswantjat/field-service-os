import { NextRequest, NextResponse } from 'next/server';
import { claimOrder } from '@/lib/baserow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, subcontractorName } = body;

    if (!orderId || !subcontractorName) {
      return NextResponse.json(
        { error: 'Order ID and subcontractor name are required' },
        { status: 400 }
      );
    }

    const updatedOrder = await claimOrder(orderId, subcontractorName);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error claiming order in Baserow:', error);
    return NextResponse.json(
      { error: 'Failed to claim order in Baserow' },
      { status: 500 }
    );
  }
}
