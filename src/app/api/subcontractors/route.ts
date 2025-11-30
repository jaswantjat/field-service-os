import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subcontractors } from '@/db/schema';
import { eq, like, or, desc, asc, sql } from 'drizzle-orm';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    
    // Filter parameters
    const activeParam = searchParams.get('active');
    const serviceArea = searchParams.get('service_area');
    const search = searchParams.get('search');

    // Build query
    let query = db.select().from(subcontractors);
    const conditions = [];

    // Active filter
    if (activeParam !== null) {
      const isActive = activeParam === 'true';
      conditions.push(eq(subcontractors.active, isActive));
    }

    // Service area filter - check if service area exists in JSON array
    if (serviceArea) {
      conditions.push(
        sql`json_each(${subcontractors.serviceAreas}) AND json_each.value = ${serviceArea}`
      );
    }

    // Search filter
    if (search) {
      const searchCondition = or(
        like(subcontractors.name, `%${search}%`),
        like(subcontractors.email, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    // Apply all conditions
    if (conditions.length > 0) {
      // For service area search with JSON, we need a different approach
      if (serviceArea) {
        // Use raw SQL for JSON array search in SQLite
        const results = await db
          .select()
          .from(subcontractors)
          .where(
            sql`EXISTS (
              SELECT 1 FROM json_each(${subcontractors.serviceAreas})
              WHERE json_each.value = ${serviceArea}
            )`
          )
          .orderBy(desc(subcontractors.rating), asc(subcontractors.name))
          .limit(limit)
          .offset(offset);

        // Apply additional filters in memory if needed
        let filtered = results;
        if (activeParam !== null) {
          const isActive = activeParam === 'true';
          filtered = filtered.filter(s => s.active === isActive);
        }
        if (search) {
          filtered = filtered.filter(s => 
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase())
          );
        }

        return NextResponse.json(filtered);
      } else {
        // Standard filtering without service area
        const results = await db
          .select()
          .from(subcontractors)
          .where(conditions.length === 1 ? conditions[0] : sql`${conditions.join(' AND ')}`)
          .orderBy(desc(subcontractors.rating), asc(subcontractors.name))
          .limit(limit)
          .offset(offset);

        return NextResponse.json(results);
      }
    }

    // No filters - return all with sorting
    const results = await db
      .select()
      .from(subcontractors)
      .orderBy(desc(subcontractors.rating), asc(subcontractors.name))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, serviceAreas, maxDailyJobs, rating, active } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required', code: 'MISSING_EMAIL' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existingEmail = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists', code: 'EMAIL_EXISTS' },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return NextResponse.json(
        { error: 'Phone is required and must be a non-empty string', code: 'MISSING_PHONE' },
        { status: 400 }
      );
    }

    // Validate serviceAreas
    if (!serviceAreas || !Array.isArray(serviceAreas) || serviceAreas.length === 0) {
      return NextResponse.json(
        { error: 'Service areas must be a non-empty array', code: 'INVALID_SERVICE_AREAS' },
        { status: 400 }
      );
    }

    // Validate all service areas are strings
    if (!serviceAreas.every(area => typeof area === 'string' && area.trim() !== '')) {
      return NextResponse.json(
        { error: 'All service areas must be non-empty strings', code: 'INVALID_SERVICE_AREA_FORMAT' },
        { status: 400 }
      );
    }

    // Validate maxDailyJobs
    if (!maxDailyJobs || typeof maxDailyJobs !== 'number' || maxDailyJobs <= 0 || !Number.isInteger(maxDailyJobs)) {
      return NextResponse.json(
        { error: 'Max daily jobs must be a positive integer', code: 'INVALID_MAX_DAILY_JOBS' },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be a number between 0 and 5', code: 'INVALID_RATING' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data with defaults
    const insertData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      serviceAreas: serviceAreas.map((area: string) => area.trim()),
      maxDailyJobs,
      rating: rating ?? 0,
      active: active ?? true,
      createdAt: new Date().toISOString(),
    };

    // Insert into database
    const newSubcontractor = await db
      .insert(subcontractors)
      .values(insertData)
      .returning();

    return NextResponse.json(newSubcontractor[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}