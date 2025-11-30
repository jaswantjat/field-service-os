import { db } from '@/db';
import { timeSlots } from '@/db/schema';

async function main() {
    const today = new Date();
    const timeSlotData = [];
    
    // Helper function to get date string for next N days
    const getDateString = (daysFromNow: number) => {
        const date = new Date(today);
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString().split('T')[0];
    };
    
    // Helper function to get ISO timestamp for claimed slots
    const getClaimedTimestamp = (daysAgo: number) => {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
        return date.toISOString();
    };
    
    // Available time slots
    const startTimes = ['09:00', '11:00', '13:00', '15:00', '17:00'];
    const getEndTime = (startTime: string) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const duration = Math.random() > 0.5 ? 2 : 3;
        const endHours = hours + duration;
        return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    let slotId = 0;
    
    // Distribute slots across subcontractors (ensuring each has 3-7 claimed slots)
    const subcontractorSlotCounts = [5, 6, 4, 7, 5, 6, 4, 5, 6, 3];
    let subcontractorIndex = 0;
    
    // Generate 30 available slots (60%)
    for (let i = 0; i < 30; i++) {
        const dayOffset = Math.floor(i / 5);
        const orderId = (i % 30) + 1;
        const startTime = startTimes[i % 5];
        
        timeSlotData.push({
            orderId,
            subcontractorId: null,
            slotDate: getDateString(dayOffset),
            slotStartTime: startTime,
            slotEndTime: getEndTime(startTime),
            isAvailable: true,
            claimedAt: null,
            status: 'available',
        });
        slotId++;
    }
    
    // Generate 13 claimed slots (25%)
    for (let i = 0; i < 13; i++) {
        const dayOffset = Math.floor(i / 2);
        const orderId = (i % 25) + 1;
        const startTime = startTimes[i % 5];
        const subcontractorId = (subcontractorIndex % 10) + 1;
        
        timeSlotData.push({
            orderId,
            subcontractorId,
            slotDate: getDateString(dayOffset),
            slotStartTime: startTime,
            slotEndTime: getEndTime(startTime),
            isAvailable: false,
            claimedAt: getClaimedTimestamp(7 - dayOffset),
            status: 'claimed',
        });
        
        subcontractorIndex++;
        slotId++;
    }
    
    // Generate 5 completed slots (10%)
    for (let i = 0; i < 5; i++) {
        const dayOffset = Math.floor(i / 1);
        const orderId = (i % 20) + 5;
        const startTime = startTimes[i % 5];
        const subcontractorId = (i % 10) + 1;
        
        timeSlotData.push({
            orderId,
            subcontractorId,
            slotDate: getDateString(dayOffset),
            slotStartTime: startTime,
            slotEndTime: getEndTime(startTime),
            isAvailable: false,
            claimedAt: getClaimedTimestamp(8 - dayOffset),
            status: 'completed',
        });
        slotId++;
    }
    
    // Generate 2 cancelled slots (5%)
    for (let i = 0; i < 2; i++) {
        const dayOffset = i + 2;
        const orderId = (i % 15) + 10;
        const startTime = startTimes[(i * 2) % 5];
        const subcontractorId = (i % 10) + 1;
        
        timeSlotData.push({
            orderId,
            subcontractorId,
            slotDate: getDateString(dayOffset),
            slotStartTime: startTime,
            slotEndTime: getEndTime(startTime),
            isAvailable: false,
            claimedAt: getClaimedTimestamp(9 - dayOffset),
            status: 'cancelled',
        });
        slotId++;
    }

    await db.insert(timeSlots).values(timeSlotData);
    
    console.log('✅ Time slots seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});