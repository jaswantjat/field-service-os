import { db } from '@/db';
import { subcontractors } from '@/db/schema';

async function main() {
    const sampleSubcontractors = [
        {
            name: "John's Delivery Services",
            email: 'contact@johnsdelivery.com',
            phone: '206-555-0101',
            serviceAreas: ['North Seattle', 'Bellevue', 'Kirkland'],
            maxDailyJobs: 6,
            rating: 4.7,
            active: true,
            createdAt: new Date('2024-10-15').toISOString(),
        },
        {
            name: 'QuickFix Installations',
            email: 'info@quickfix.com',
            phone: '425-555-0102',
            serviceAreas: ['South Seattle', 'Renton', 'Tacoma'],
            maxDailyJobs: 5,
            rating: 4.9,
            active: true,
            createdAt: new Date('2024-11-01').toISOString(),
        },
        {
            name: 'TechConnect Solutions',
            email: 'support@techconnect.com',
            phone: '206-555-0103',
            serviceAreas: ['Bellevue', 'Redmond', 'Kirkland'],
            maxDailyJobs: 8,
            rating: 4.5,
            active: true,
            createdAt: new Date('2024-09-20').toISOString(),
        },
        {
            name: 'Prime Logistics',
            email: 'contact@primelogistics.com',
            phone: '253-555-0104',
            serviceAreas: ['Tacoma', 'South Seattle'],
            maxDailyJobs: 7,
            rating: 4.2,
            active: true,
            createdAt: new Date('2024-10-05').toISOString(),
        },
        {
            name: 'FastTrack Services',
            email: 'hello@fasttrack.com',
            phone: '425-555-0105',
            serviceAreas: ['North Seattle', 'Everett', 'Kirkland', 'Redmond'],
            maxDailyJobs: 4,
            rating: 4.8,
            active: true,
            createdAt: new Date('2024-11-10').toISOString(),
        },
        {
            name: 'ProInstall Inc',
            email: 'info@proinstall.com',
            phone: '206-555-0106',
            serviceAreas: ['Bellevue', 'Renton'],
            maxDailyJobs: 5,
            rating: 4.6,
            active: true,
            createdAt: new Date('2024-10-22').toISOString(),
        },
        {
            name: 'Metro Delivery Co',
            email: 'contact@metrodelivery.com',
            phone: '206-555-0107',
            serviceAreas: ['North Seattle', 'South Seattle', 'Bellevue'],
            maxDailyJobs: 6,
            rating: 4.4,
            active: false,
            createdAt: new Date('2024-09-15').toISOString(),
        },
        {
            name: 'Elite Services Group',
            email: 'services@elitegroup.com',
            phone: '425-555-0108',
            serviceAreas: ['Redmond', 'Kirkland', 'Bellevue'],
            maxDailyJobs: 7,
            rating: 5.0,
            active: true,
            createdAt: new Date('2024-11-05').toISOString(),
        },
        {
            name: 'Swift Solutions',
            email: 'info@swiftsolutions.com',
            phone: '253-555-0109',
            serviceAreas: ['Tacoma', 'Renton', 'South Seattle'],
            maxDailyJobs: 3,
            rating: 3.8,
            active: true,
            createdAt: new Date('2024-10-18').toISOString(),
        },
        {
            name: 'Reliable Installations LLC',
            email: 'contact@reliableinstalls.com',
            phone: '206-555-0110',
            serviceAreas: ['Everett', 'North Seattle'],
            maxDailyJobs: 4,
            rating: 4.3,
            active: false,
            createdAt: new Date('2024-09-28').toISOString(),
        }
    ];

    await db.insert(subcontractors).values(sampleSubcontractors);
    
    console.log('✅ Subcontractors seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});