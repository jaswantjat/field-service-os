import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subcontractors, timeSlots } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const subcontractorId = parseInt(id);

    // Fetch subcontractor
    const subcontractor = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);

    if (subcontractor.length === 0) {
      return NextResponse.json(
        { 
          error: 'Subcontractor not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Calculate current daily jobs for today
    const today = new Date().toISOString().split('T')[0];
    
    const currentJobs = await db
      .select({ count: sql<number>`count(*)` })
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.subcontractorId, subcontractorId),
          eq(timeSlots.slotDate, today),
          sql`${timeSlots.status} != 'cancelled'`
        )
      );

    const currentDailyJobs = Number(currentJobs[0]?.count || 0);
    const maxDailyJobs = subcontractor[0].maxDailyJobs;
    const availableCapacity = maxDailyJobs - currentDailyJobs;

    return NextResponse.json({
      ...subcontractor[0],
      currentDailyJobs,
      availableCapacity
    });

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

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const subcontractorId = parseInt(id);

    // Check if subcontractor exists
    const existing = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { 
          error: 'Subcontractor not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Prevent updating id and createdAt
    if ('id' in body || 'createdAt' in body) {
      return NextResponse.json(
        { 
          error: 'Cannot update id or createdAt fields',
          code: 'FORBIDDEN_FIELD_UPDATE'
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {};

    // Validate and add name if provided
    if ('name' in body) {
      if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { 
            error: 'Name must be a non-empty string',
            code: 'INVALID_NAME'
          },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    // Validate and add email if provided
    if ('email' in body) {
      if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
        return NextResponse.json(
          { 
            error: 'Valid email is required',
            code: 'INVALID_EMAIL'
          },
          { status: 400 }
        );
      }
      updates.email = body.email.toLowerCase().trim();

      // Check email uniqueness (excluding current record)
      const existingEmail = await db
        .select()
        .from(subcontractors)
        .where(
          and(
            eq(subcontractors.email, updates.email),
            sql`${subcontractors.id} != ${subcontractorId}`
          )
        )
        .limit(1);

      if (existingEmail.length > 0) {
        return NextResponse.json(
          { 
            error: 'Email already exists',
            code: 'EMAIL_EXISTS'
          },
          { status: 400 }
        );
      }
    }

    // Validate and add phone if provided
    if ('phone' in body) {
      if (!body.phone || typeof body.phone !== 'string' || body.phone.trim().length === 0) {
        return NextResponse.json(
          { 
            error: 'Phone number is required',
            code: 'INVALID_PHONE'
          },
          { status: 400 }
        );
      }
      updates.phone = body.phone.trim();
    }

    // Validate and add serviceAreas if provided
    if ('serviceAreas' in body) {
      if (!Array.isArray(body.serviceAreas) || body.serviceAreas.length === 0) {
        return NextResponse.json(
          { 
            error: 'Service areas must be a non-empty array',
            code: 'INVALID_SERVICE_AREAS'
          },
          { status: 400 }
        );
      }
      if (!body.serviceAreas.every((area: any) => typeof area === 'string')) {
        return NextResponse.json(
          { 
            error: 'All service areas must be strings',
            code: 'INVALID_SERVICE_AREAS_TYPE'
          },
          { status: 400 }
        );
      }
      updates.serviceAreas = body.serviceAreas;
    }

    // Validate and add maxDailyJobs if provided
    if ('maxDailyJobs' in body) {
      if (typeof body.maxDailyJobs !== 'number' || body.maxDailyJobs < 1) {
        return NextResponse.json(
          { 
            error: 'Max daily jobs must be a positive number',
            code: 'INVALID_MAX_DAILY_JOBS'
          },
          { status: 400 }
        );
      }
      updates.maxDailyJobs = body.maxDailyJobs;
    }

    // Validate and add rating if provided
    if ('rating' in body) {
      if (typeof body.rating !== 'number' || body.rating < 0 || body.rating > 5) {
        return NextResponse.json(
          { 
            error: 'Rating must be a number between 0 and 5',
            code: 'INVALID_RATING'
          },
          { status: 400 }
        );
      }
      updates.rating = body.rating;
    }

    // Validate and add active if provided
    if ('active' in body) {
      if (typeof body.active !== 'boolean') {
        return NextResponse.json(
          { 
            error: 'Active must be a boolean',
            code: 'INVALID_ACTIVE'
          },
          { status: 400 }
        );
      }
      updates.active = body.active;
    }

    // If no valid fields to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid fields to update',
          code: 'NO_UPDATES'
        },
        { status: 400 }
      );
    }

    // Perform update
    const updated = await db
      .update(subcontractors)
      .set(updates)
      .where(eq(subcontractors.id, subcontractorId))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}