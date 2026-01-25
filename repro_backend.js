
const fs = require('fs');
const path = require('path');

// Mock Data
const mockTrip = {
    itinerary: [
        { id: '1', title: 'Breakfast', day: 3, startTime: '09:00', endTime: '10:00' },
        { id: '2', title: 'Museum', day: 3, startTime: '10:00', endTime: '12:00' }
    ]
};

// Mock AI Response (What we WANT the AI to produce)
const mockAiResponse = JSON.stringify({
    action: "smart_schedule",
    isOptions: true,
    newItems: [
        {
            title: "Pancake House",
            description: "Good pancakes",
            day: 3,
            duration: 90,
            startTime: "09:00",
            endTime: "10:30",
            location: "Downtown"
        },
        {
            title: "Bagel Shop",
            description: "Fresh bagels",
            day: 3,
            duration: 90,
            startTime: "09:15", // Intentionally staggered to test forcing logic
            endTime: "10:45",
            location: "Uptown"
        }
    ],
    itemsToRemove: ["Breakfast"],
    reschedule: []
});

// SIMULATE ROUTE.TS LOGIC
console.log("Initial Itinerary:", mockTrip.itinerary);

try {
    const actionData = JSON.parse(mockAiResponse);
    console.log("Parsed Action Data:", actionData);

    let addedCount = 0;
    let rescheduledCount = 0;
    let removedCount = 0;

    // --- LOGIC FROM ROUTE.TS START ---

    // Handle explicit item removal
    if (Array.isArray(actionData.itemsToRemove) && actionData.itemsToRemove.length > 0) {
        const initialLength = mockTrip.itinerary.length;
        const titlesToRemove = new Set(actionData.itemsToRemove.map(t => t.toLowerCase()));

        const affectedDays = new Set(
            Array.isArray(actionData.newItems)
                ? actionData.newItems.map(i => i.day || 1)
                : [1]
        );

        mockTrip.itinerary = mockTrip.itinerary.filter(item => {
            if (affectedDays.has(item.day) && titlesToRemove.has(item.title.toLowerCase())) {
                return false;
            }
            return true;
        });

        removedCount = initialLength - mockTrip.itinerary.length;
    }

    // Add new items
    if (Array.isArray(actionData.newItems) && actionData.newItems.length > 0) {
        const toMinutes = (time) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };
        const toTimeStr = (mins) => {
            const h = Math.floor(mins / 60) % 24;
            const m = mins % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        const isOptions = actionData.isOptions === true;
        const groupId = isOptions ? "GROUP_ID_123" : undefined;

        // Force shared timing
        let commonStartTime = '09:00';
        let commonEndTime = '11:00';
        let commonDuration = 120;

        if (isOptions) {
            const first = actionData.newItems[0];
            commonStartTime = first.startTime || '09:00';
            commonDuration = first.duration || 120;

            const startMins = toMinutes(commonStartTime);
            const endMins = startMins + commonDuration;
            commonEndTime = toTimeStr(endMins);

            console.log(`Forced Time for Options: ${commonStartTime} - ${commonEndTime} (${commonDuration}m)`);
        }

        const newItems = actionData.newItems.map(item => {
            const myStartTime = isOptions ? commonStartTime : (item.startTime || '09:00');
            const myEndTime = isOptions ? commonEndTime : (item.endTime || '11:00');
            const myDuration = isOptions ? commonDuration : (item.duration || 120);

            return {
                id: Math.random().toString(),
                title: item.title,
                day: item.day || 1,
                startTime: myStartTime,
                endTime: myEndTime,
                duration: myDuration,
                groupId
            };
        });

        mockTrip.itinerary.push(...newItems);
        addedCount = newItems.length;
    }

    // --- LOGIC END ---

    console.log("Final Itinerary:", mockTrip.itinerary);
    console.log(`Stats: Added ${addedCount}, Removed ${removedCount}`);

    // VERIFICATION
    const breakfast = mockTrip.itinerary.find(i => i.title === 'Breakfast');
    if (breakfast) console.error("FAIL: Breakfast was NOT removed");
    else console.log("PASS: Breakfast removed");

    const newItems = mockTrip.itinerary.filter(i => i.groupId === 'GROUP_ID_123');
    if (newItems.length !== 2) console.error("FAIL: Didn't add 2 options");
    else {
        const t1 = newItems[0].startTime;
        const t2 = newItems[1].startTime;
        if (t1 === t2) console.log(`PASS: Options share time ${t1}`);
        else console.error(`FAIL: Options have different times: ${t1} vs ${t2}`);
    }

} catch (e) {
    console.error("Error:", e);
}
