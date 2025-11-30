import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/baserow';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const priority = searchParams.get('priority');
    const partnerRegion = searchParams.get('partnerRegion');

    const filters: any = {};
    
    if (status) filters.status = status;
    if (city) filters.city = city;
    if (priority) filters.priority = priority;
    if (partnerRegion) filters.partnerRegion = partnerRegion;

    const orders = await getOrders(filters);

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders from Baserow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders from Baserow' },
      { status: 500 }
    );
  }
}
