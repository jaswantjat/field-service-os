# 🎯 Baserow Integration Setup Guide

## Architecture: "Headless Baserow" (No Local Database Sync)

Your Next.js app now talks **directly** to Baserow. Baserow is your single source of truth - no Drizzle, no Postgres, no syncing, no lag.

---

## 📋 What Changed

### ✅ **Added**
- `src/lib/baserow.ts` - Direct Baserow API client
- `src/app/api/baserow/orders/*` - API routes for Baserow operations
- Baserow environment variables in `.env`

### 🔄 **Updated**
- `src/app/dashboard/page.tsx` - Now fetches from Baserow API
- Dashboard shows only "Ready to Dispatch" orders
- Schedule button updates order status in Baserow

### ❌ **What You Can Remove (Optional)**
- Old local database routes in `src/app/api/orders/` (if not needed)
- Drizzle database calls (replaced with Baserow)
- n8n middleman for scheduling (Next.js talks directly to Baserow)

---

## 🔧 Setup Instructions

### 1. Get Your Baserow API Token

1. Log into your Baserow instance
2. Go to **Settings** → **API tokens** (top right corner)
3. Click **"Create new token"**
4. Give it a name (e.g., "Field Service App")
5. Select permissions: **Read** and **Write**
6. Copy the generated token

### 2. Get Your Table ID

1. Open your Orders table in Baserow
2. Look at the URL in your browser:
   ```
   https://app.baserow.io/database/123/table/456
                                      ^^^      ^^^
                                   DB ID   TABLE ID
   ```
3. The **Table ID** is the number after `/table/` (e.g., `456`)

### 3. Update Environment Variables

Open `.env` and update these values:

```bash
# Baserow Configuration
BASEROW_TOKEN=your_actual_token_here
BASEROW_BASE_URL=https://api.baserow.io
BASEROW_ORDERS_TABLE_ID=456  # Your actual table ID
```

**Important Notes:**
- If using self-hosted Baserow, change `BASEROW_BASE_URL` to your instance URL
- Keep the token secret - never commit it to Git!

### 4. Baserow Table Structure

Your Baserow Orders table should have these fields (field names with underscores):

**Required Fields:**
- `Customer_Name` (Text)
- `Address` (Text)
- `City` (Text)
- `Service_Type` (Text)
- `Status` (Single Select)
  - Options: "Ready to Dispatch", "Claimed", "3-Scheduled", "In Progress", "Completed"

**Optional Fields:**
- `Customer_Email` (Email)
- `Customer_Phone` (Phone Number)
- `Location_Lat` (Number)
- `Location_Lng` (Number)
- `Priority` (Single Select: urgent, high, medium, low)
- `Partner_Assigned` (Text)
- `Technician_Name` (Text)
- `Install_Date` (Date)
- `Time_Slot` (Text)
- `Estimated_Duration` (Number)
- `Special_Instructions` (Long Text)
- `Inventory_Status` (Single Select)
- `Due_Date` (Date)
- `Created_At` (Date)
- `Completion_Notes` (Long Text)
- `Completion_Photos` (Long Text or URL)
- `Customer_Signature` (Long Text or URL)
- `Customer_Rating` (Number)
- `Completed_At` (Date)

### 5. Test the Integration

1. Restart your dev server (if running):
   ```bash
   bun run dev
   ```

2. Login to your app and go to `/dashboard`

3. You should see orders from Baserow with status "Ready to Dispatch"

4. Click "Schedule" on an order - it will update the status in Baserow to "3-Scheduled"

---

## 📡 API Endpoints

Your app now has these Baserow API routes:

### GET `/api/baserow/orders`
Fetch orders with optional filters:
```javascript
// Get all "Ready to Dispatch" orders
fetch('/api/baserow/orders?status=Ready to Dispatch')

// Filter by city
fetch('/api/baserow/orders?city=Madrid')

// Filter by partner region
fetch('/api/baserow/orders?partnerRegion=Extremadura')

// Combine filters
fetch('/api/baserow/orders?status=Ready to Dispatch&city=Madrid&priority=urgent')
```

### GET `/api/baserow/orders/[id]`
Get a single order by ID:
```javascript
fetch('/api/baserow/orders/123')
```

### POST `/api/baserow/orders/schedule`
Schedule an order (updates status, assigns tech, sets date):
```javascript
fetch('/api/baserow/orders/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 123,
    status: '3-Scheduled',
    technicianName: 'Pedro',
    installDate: '2025-11-12',
    timeSlot: '09:00-11:00'
  })
})
```

### PATCH `/api/baserow/orders/[id]`
Update order status:
```javascript
fetch('/api/baserow/orders/123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'In Progress'
  })
})
```

### POST `/api/baserow/orders/claim`
Claim an order (subcontractor claims job):
```javascript
fetch('/api/baserow/orders/claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 123,
    subcontractorName: 'Manolo'
  })
})
```

### POST `/api/baserow/orders/complete`
Complete an order with job details:
```javascript
fetch('/api/baserow/orders/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 123,
    completionNotes: 'Installation successful',
    completionPhotos: ['https://...photo1.jpg', 'https://...photo2.jpg'],
    signature: 'base64_signature_data',
    rating: 5,
    completedAt: '2025-11-27T14:30:00Z'
  })
})
```

---

## 🎯 How It Works

### The Flow

1. **Email arrives** → n8n parses it → Creates row in Baserow
2. **Dashboard loads** → Next.js calls Baserow API → Shows "Ready to Dispatch" orders
3. **User clicks Schedule** → Next.js updates Baserow → Status changes to "3-Scheduled"
4. **Subcontractor portal** → Fetches available jobs from Baserow → Claims job
5. **Job completion** → Mobile app updates Baserow → HQ sees real-time data

### Why This Is Better

✅ **No Sync Gap** - Data is always live from Baserow
✅ **Zero Latency** - No waiting for webhooks or background jobs
✅ **Less Infrastructure** - No Postgres, no Drizzle migrations, no sync workers
✅ **Single Source of Truth** - Baserow is your database
✅ **Real-time Updates** - All users see the same data immediately

---

## 🔍 Troubleshooting

### Error: "Baserow configuration is missing"
- Check that `BASEROW_TOKEN` and `BASEROW_ORDERS_TABLE_ID` are set in `.env`
- Restart your dev server after changing `.env`

### Error: "Failed to fetch orders from Baserow"
- Verify your API token is correct and has read permissions
- Check that the table ID is correct
- Make sure your Baserow table exists and is accessible

### Orders not showing up
- Check the `Status` field in Baserow - only "Ready to Dispatch" shows in dashboard
- Verify field names match exactly (case-sensitive: `Customer_Name`, not `customer_name`)
- Check browser console for API errors

### Schedule button not working
- Verify your API token has write permissions
- Check that the `Status` field allows the value "3-Scheduled"
- Look at browser console and server logs for errors

---

## 🚀 Next Steps

1. **Test the integration** with a few sample orders in Baserow
2. **Update other pages** (portal, calendar, HQ) to use Baserow API
3. **Remove old local database routes** if not needed
4. **Add error handling** and retry logic for production
5. **Consider caching** if you need better performance

---

## 📝 Notes

- **Cache Policy**: All requests use `cache: "no-store"` for real-time data
- **n8n Still Needed**: Keep n8n for email parsing (STEP 1 only)
- **Authentication**: Still uses local database for user auth
- **Field Names**: Baserow uses snake_case with capitals (e.g., `Customer_Name`)

---

## 💡 Tips for Monday Demo

1. **Pre-populate Baserow** with 5-10 sample orders in "Ready to Dispatch" status
2. **Test the flow end-to-end** before the demo
3. **Have Baserow open in another tab** to show real-time updates
4. **Prepare talking points**:
   - "No sync lag - Baserow is our backend"
   - "Direct API calls - no middleware"
   - "Single source of truth for all data"

Good luck! 🎉
