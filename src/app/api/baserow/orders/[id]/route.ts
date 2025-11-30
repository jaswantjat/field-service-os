import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/baserow';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const order = await getOrderById(orderId);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order from Baserow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order from Baserow' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const updatedOrder = await updateOrderStatus(orderId, status);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order in Baserow:', error);
    return NextResponse.json(
      { error: 'Failed to update order in Baserow' },
      { status: 500 }
    );
  }
}
