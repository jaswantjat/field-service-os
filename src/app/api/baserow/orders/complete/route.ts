import { NextRequest, NextResponse } from 'next/server';
import { completeOrder } from '@/lib/baserow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      orderId, 
      completionNotes, 
      completionPhotos, 
      signature, 
      rating,
      completedAt 
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const updatedOrder = await completeOrder(orderId, {
      completionNotes,
      completionPhotos,
      signature,
      rating,
      completedAt: completedAt || new Date().toISOString()
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error completing order in Baserow:', error);
    return NextResponse.json(
      { error: 'Failed to complete order in Baserow' },
      { status: 500 }
    );
  }
}
