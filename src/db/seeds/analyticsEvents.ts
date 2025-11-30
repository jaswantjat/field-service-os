import { db } from '@/db';
import { analyticsEvents } from '@/db/schema';

async function main() {
    const sampleAnalyticsEvents = [
        {
            eventType: 'ghost_job',
            orderId: 5,
            subcontractorId: 3,
            metadata: {
                reason: 'No show',
                scheduledTime: '2024-01-15T14:00:00Z',
                contactAttempts: 3,
                lastContactTime: '2024-01-15T13:45:00Z'
            },
            createdAt: new Date('2024-01-15T14:30:00Z').toISOString(),
        },
        {
            eventType: 'cancellation',
            orderId: 12,
            subcontractorId: null,
            metadata: {
                reason: 'Customer request',
                noticeHours: 24,
                refundIssued: true,
                cancellationFee: 0
            },
            createdAt: new Date('2024-01-16T09:15:00Z').toISOString(),
        },
        {
            eventType: 'double_book',
            orderId: null,
            subcontractorId: 7,
            metadata: {
                conflictingSlots: [8, 15],
                subcontractorId: 7,
                date: '2024-01-17',
                timeRange: '10:00-12:00'
            },
            createdAt: new Date('2024-01-17T08:45:00Z').toISOString(),
        },
        {
            eventType: 'completion',
            orderId: 3,
            subcontractorId: 2,
            metadata: {
                duration: 90,
                onTime: true,
                rating: 5,
                tipsReceived: 25.00
            },
            createdAt: new Date('2024-01-17T15:30:00Z').toISOString(),
        },
        {
            eventType: 'cancellation',
            orderId: 18,
            subcontractorId: 5,
            metadata: {
                reason: 'Weather conditions',
                noticeHours: 4,
                refundIssued: true,
                rescheduleOffered: true
            },
            createdAt: new Date('2024-01-18T07:20:00Z').toISOString(),
        },
        {
            eventType: 'ghost_job',
            orderId: 22,
            subcontractorId: null,
            metadata: {
                reason: 'Customer unavailable',
                scheduledTime: '2024-01-18T16:00:00Z',
                contactAttempts: 5,
                lastContactTime: '2024-01-18T15:50:00Z'
            },
            createdAt: new Date('2024-01-18T16:25:00Z').toISOString(),
        },
        {
            eventType: 'completion',
            orderId: 7,
            subcontractorId: 4,
            metadata: {
                duration: 120,
                onTime: false,
                rating: 4,
                delayMinutes: 15
            },
            createdAt: new Date('2024-01-19T11:45:00Z').toISOString(),
        },
        {
            eventType: 'cancellation',
            orderId: 25,
            subcontractorId: 9,
            metadata: {
                reason: 'Subcontractor illness',
                noticeHours: 2,
                refundIssued: false,
                replacementFound: true
            },
            createdAt: new Date('2024-01-19T14:30:00Z').toISOString(),
        },
        {
            eventType: 'double_book',
            orderId: 28,
            subcontractorId: 3,
            metadata: {
                conflictingSlots: [5, 12],
                subcontractorId: 3,
                date: '2024-01-20',
                timeRange: '14:00-16:00',
                resolutionTime: 35
            },
            createdAt: new Date('2024-01-20T10:15:00Z').toISOString(),
        },
        {
            eventType: 'cancellation',
            orderId: 14,
            subcontractorId: null,
            metadata: {
                reason: 'Duplicate booking',
                noticeHours: 48,
                refundIssued: true,
                cancellationFee: 0
            },
            createdAt: new Date('2024-01-20T16:40:00Z').toISOString(),
        },
        {
            eventType: 'ghost_job',
            orderId: 9,
            subcontractorId: 6,
            metadata: {
                reason: 'Wrong address provided',
                scheduledTime: '2024-01-21T10:00:00Z',
                contactAttempts: 4,
                lastContactTime: '2024-01-21T09:55:00Z'
            },
            createdAt: new Date('2024-01-21T10:35:00Z').toISOString(),
        },
        {
            eventType: 'completion',
            orderId: 16,
            subcontractorId: 1,
            metadata: {
                duration: 75,
                onTime: true,
                rating: 5,
                tipsReceived: 30.00,
                additionalServices: true
            },
            createdAt: new Date('2024-01-21T13:20:00Z').toISOString(),
        },
        {
            eventType: 'cancellation',
            orderId: null,
            subcontractorId: 8,
            metadata: {
                reason: 'Vehicle breakdown',
                noticeHours: 1,
                refundIssued: true,
                emergencyBackup: false
            },
            createdAt: new Date('2024-01-22T08:50:00Z').toISOString(),
        },
        {
            eventType: 'double_book',
            orderId: 30,
            subcontractorId: 10,
            metadata: {
                conflictingSlots: [18, 23],
                subcontractorId: 10,
                date: '2024-01-22',
                timeRange: '09:00-11:00'
            },
            createdAt: new Date('2024-01-22T12:10:00Z').toISOString(),
        },
        {
            eventType: 'ghost_job',
            orderId: 20,
            subcontractorId: null,
            metadata: {
                reason: 'Gate code incorrect',
                scheduledTime: '2024-01-23T11:00:00Z',
                contactAttempts: 6,
                lastContactTime: '2024-01-23T11:20:00Z'
            },
            createdAt: new Date('2024-01-23T11:40:00Z').toISOString(),
        },
        {
            eventType: 'completion',
            orderId: 11,
            subcontractorId: 5,
            metadata: {
                duration: 105,
                onTime: true,
                rating: 4,
                tipsReceived: 20.00
            },
            createdAt: new Date('2024-01-23T15:50:00Z').toISOString(),
        },
        {
            eventType: 'cancellation',
            orderId: 27,
            subcontractorId: 2,
            metadata: {
                reason: 'Customer no longer needs service',
                noticeHours: 12,
                refundIssued: true,
                cancellationFee: 15.00
            },
            createdAt: new Date('2024-01-24T09:30:00Z').toISOString(),
        },
        {
            eventType: 'ghost_job',
            orderId: 19,
            subcontractorId: 4,
            metadata: {
                reason: 'Customer not home',
                scheduledTime: '2024-01-24T13:00:00Z',
                contactAttempts: 2,
                lastContactTime: '2024-01-24T13:10:00Z'
            },
            createdAt: new Date('2024-01-24T13:25:00Z').toISOString(),
        },
        {
            eventType: 'cancellation',
            orderId: 24,
            subcontractorId: null,
            metadata: {
                reason: 'Inventory unavailable',
                noticeHours: 36,
                refundIssued: true,
                rescheduleOffered: true
            },
            createdAt: new Date('2024-01-25T10:15:00Z').toISOString(),
        },
        {
            eventType: 'completion',
            orderId: 8,
            subcontractorId: 7,
            metadata: {
                duration: 85,
                onTime: false,
                rating: 3,
                delayMinutes: 25,
                customerComplaints: 'Late arrival'
            },
            createdAt: new Date('2024-01-25T14:40:00Z').toISOString(),
        }
    ];

    await db.insert(analyticsEvents).values(sampleAnalyticsEvents);
    
    console.log('✅ Analytics events seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});