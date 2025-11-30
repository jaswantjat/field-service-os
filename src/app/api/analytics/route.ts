import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { analyticsEvents, orders, jobCompletions, subcontractors } from '@/db/schema';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('event_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build date filter conditions
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(orders.createdAt, startDate));
    }
    if (endDate) {
      dateConditions.push(lte(orders.createdAt, endDate));
    }

    // Get total orders with date filtering
    const totalOrdersQuery = db.select({ count: sql<number>`count(*)` })
      .from(orders);
    
    if (dateConditions.length > 0) {
      totalOrdersQuery.where(and(...dateConditions));
    }

    const totalOrdersResult = await totalOrdersQuery;
    const totalOrders = totalOrdersResult[0]?.count || 0;

    // Get completed orders count with date filtering
    const completedOrdersQuery = db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'completed'));
    
    if (dateConditions.length > 0) {
      completedOrdersQuery.where(
        and(eq(orders.status, 'completed'), ...dateConditions)
      );
    }

    const completedOrdersResult = await completedOrdersQuery;
    const completedOrders = completedOrdersResult[0]?.count || 0;

    // Calculate completion rate
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Get orders by status with date filtering
    let ordersByStatusQuery = db.select({
      status: orders.status,
      count: sql<number>`count(*)`
    })
      .from(orders)
      .groupBy(orders.status);

    if (dateConditions.length > 0) {
      ordersByStatusQuery = ordersByStatusQuery.where(and(...dateConditions)) as any;
    }

    const ordersByStatusResult = await ordersByStatusQuery;
    const ordersByStatus: Record<string, number> = {};
    ordersByStatusResult.forEach(row => {
      ordersByStatus[row.status] = row.count;
    });

    // Get orders by priority with date filtering
    let ordersByPriorityQuery = db.select({
      priority: orders.priority,
      count: sql<number>`count(*)`
    })
      .from(orders)
      .groupBy(orders.priority);

    if (dateConditions.length > 0) {
      ordersByPriorityQuery = ordersByPriorityQuery.where(and(...dateConditions)) as any;
    }

    const ordersByPriorityResult = await ordersByPriorityQuery;
    const ordersByPriority: Record<string, number> = {};
    ordersByPriorityResult.forEach(row => {
      ordersByPriority[row.priority] = row.count;
    });

    // Get orders by service type with date filtering
    let ordersByServiceTypeQuery = db.select({
      serviceType: orders.serviceType,
      count: sql<number>`count(*)`
    })
      .from(orders)
      .groupBy(orders.serviceType);

    if (dateConditions.length > 0) {
      ordersByServiceTypeQuery = ordersByServiceTypeQuery.where(and(...dateConditions)) as any;
    }

    const ordersByServiceTypeResult = await ordersByServiceTypeQuery;
    const ordersByServiceType: Record<string, number> = {};
    ordersByServiceTypeResult.forEach(row => {
      ordersByServiceType[row.serviceType] = row.count;
    });

    // Build analytics events date filter conditions
    const analyticsDateConditions = [];
    if (startDate) {
      analyticsDateConditions.push(gte(analyticsEvents.createdAt, startDate));
    }
    if (endDate) {
      analyticsDateConditions.push(lte(analyticsEvents.createdAt, endDate));
    }

    // Get ghost jobs count
    const ghostJobsQuery = db.select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventType, 'ghost_job'));

    if (analyticsDateConditions.length > 0) {
      ghostJobsQuery.where(
        and(eq(analyticsEvents.eventType, 'ghost_job'), ...analyticsDateConditions)
      );
    }

    const ghostJobsResult = await ghostJobsQuery;
    const ghostJobs = ghostJobsResult[0]?.count || 0;

    // Get double bookings count
    const doubleBookingsQuery = db.select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventType, 'double_book'));

    if (analyticsDateConditions.length > 0) {
      doubleBookingsQuery.where(
        and(eq(analyticsEvents.eventType, 'double_book'), ...analyticsDateConditions)
      );
    }

    const doubleBookingsResult = await doubleBookingsQuery;
    const doubleBookings = doubleBookingsResult[0]?.count || 0;

    // Get cancellations count
    const cancellationsQuery = db.select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventType, 'cancellation'));

    if (analyticsDateConditions.length > 0) {
      cancellationsQuery.where(
        and(eq(analyticsEvents.eventType, 'cancellation'), ...analyticsDateConditions)
      );
    }

    const cancellationsResult = await cancellationsQuery;
    const cancellations = cancellationsResult[0]?.count || 0;

    // Get top performing subcontractors
    let topSubcontractorsQuery = db.select({
      id: subcontractors.id,
      name: subcontractors.name,
      completions: sql<number>`count(${jobCompletions.id})`,
      avgRating: sql<number>`coalesce(avg(${jobCompletions.customerSatisfaction}), 0)`
    })
      .from(subcontractors)
      .leftJoin(jobCompletions, eq(jobCompletions.subcontractorId, subcontractors.id));

    if (analyticsDateConditions.length > 0) {
      topSubcontractorsQuery = topSubcontractorsQuery.where(
        and(...analyticsDateConditions.map(condition => {
          const conditionStr = condition.toString();
          if (conditionStr.includes('orders.created_at')) {
            return sql`${jobCompletions.completedAt} >= ${startDate}` as any;
          }
          return condition;
        }))
      ) as any;
    }

    topSubcontractorsQuery = topSubcontractorsQuery
      .groupBy(subcontractors.id, subcontractors.name)
      .orderBy(sql`count(${jobCompletions.id}) desc`)
      .limit(10);

    const topSubcontractorsResult = await topSubcontractorsQuery;
    const topSubcontractors = topSubcontractorsResult.map(sub => ({
      id: sub.id,
      name: sub.name,
      completions: sub.completions,
      avgRating: Math.round(sub.avgRating * 100) / 100
    }));

    // Build response object
    const response: any = {
      summary: {
        totalOrders,
        completedOrders,
        completionRate: Math.round(completionRate * 100) / 100,
        ghostJobs,
        doubleBookings,
        cancellations
      },
      ordersByStatus,
      ordersByPriority,
      ordersByServiceType,
      topSubcontractors
    };

    // If event_type filter is provided, return filtered events
    if (eventType) {
      let eventsQuery = db.select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.eventType, eventType));

      if (analyticsDateConditions.length > 0) {
        eventsQuery = eventsQuery.where(
          and(eq(analyticsEvents.eventType, eventType), ...analyticsDateConditions)
        ) as any;
      }

      const events = await eventsQuery.orderBy(sql`${analyticsEvents.createdAt} desc`);
      response.events = events;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}