import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq, and, or, asc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    
    // Filter parameters
    const city = searchParams.get('city');
    const serviceType = searchParams.get('service_type');
    const priority = searchParams.get('priority');

    // Build where conditions
    const conditions = [
      or(
        eq(orders.status, 'unassigned'),
        eq(orders.status, 'scheduled')
      )
    ];

    if (city) {
      conditions.push(eq(orders.city, city));
    }

    if (serviceType) {
      conditions.push(eq(orders.serviceType, serviceType));
    }

    if (priority) {
      conditions.push(eq(orders.priority, priority));
    }

    // Query with priority-based sorting and due date
    const availableOrders = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(
        sql`CASE ${orders.priority}
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END`,
        asc(orders.dueDate)
      )
      .limit(limit)
      .offset(offset);

    return NextResponse.json(availableOrders, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}