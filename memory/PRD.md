# FoodFleet - Diet Meal Subscription Management System PRD

## Original Problem Statement
Build a comprehensive diet meal subscription management system with:
- Multi-role RBAC: Super Admin, Admin, Sales Manager, City Manager, Kitchen Manager, Delivery Boy, Customer
- Cities: Kochi & Trivandrum with multiple kitchens per city
- Subscription plans: Weekly (6), 15 Days (12), Monthly (24 deliveries)
- Diet types: Veg, Non-Veg, Mixed, Breakfast-only
- Sunday holiday - no deliveries
- Auto-extend subscription on cancellation/skip

## Cancellation Deadlines
- **Breakfast**: Before 7:00 AM
- **Lunch**: Before 9:30 AM  
- **Dinner**: Before 3:00 PM

## What's Been Implemented

### Customer Dashboard ✅
- Running Announcement Bar (marquee)
- Banner Carousel (5 slides) with autoplay
- Delivery Calendar (Scheduled/Delivered/Cancelled highlights)
- Today's Meals with:
  - Click for item details (image, ingredients, nutrition)
  - Cancel/Change Time buttons when available
  - **"Cancellation cutoff has passed"** message when cutoff passed
  - **"Ready for pickup"** / **"Being prepared"** status messages
- Your Plan: Name, Next Renewal, **Renew Now** button (→ Razorpay)
- Shop Section for add-on items
- Cancellation Deadlines info

### Customer Profile ✅
- Profile completion progress (₹100 max)
- Google Location options:
  - Paste Google Maps Link
  - Enter Latitude/Longitude
  - **Get Current Location** (with improved error handling)
  - **"Open in Maps"** button to view on Google Maps
- Allergies selection + **"Other allergies"** text field
- **"I drink alcohol"** checkbox
- **Delivery Time Window** dropdown (1-hour slots)
- **Save Profile** working correctly

### Admin Dashboard ✅
- Kitchens CRUD with Google coordinates
- Staff CRUD with Kitchen assignment
- Customers CRUD with Kitchen/City/Address

### Sales Manager Dashboard ✅ (Updated Jan 30, 2026)
- **Tabs for filtering customers**:
  - **Active** - Customers with active subscriptions
  - **Inactive** - No plan or expired
  - **Recently Finished** - Ended within 7 days
- Stats cards (clickable to filter)
- Add Customer with GPS location
- Create Subscription dialog:
  - Kitchen selection
  - Plan selection (shows price & deliveries)
  - Diet type, Meals, Delivery days
  - Start date, Amount paid
- Customer cards show subscription status

### Super Admin Dashboard ✅
- Menu Items CRUD (nutrition, allergies, image)
- Plans CRUD (delivery_days, price, menu selection)

## Login Credentials (Password: admin123)
| Role | Phone |
|------|-------|
| Super Admin | 9000000001 |
| Admin | 9000000002 |
| Sales Manager | 9000000003 |
| Customer (Test) | 9000000011 |

## Prioritized Backlog

### P0 (Critical - Next)
- [ ] Delivery Boy "Mark as Delivered" functionality
- [ ] Customer map view with live delivery tracking
- [ ] Print/KOT functionality for kitchen
- [ ] Highlight unassigned customers (no kitchen/delivery boy)

### P1 (High Priority)
- [ ] Approve/Reject reschedule requests (Admin)
- [ ] Shop items purchase integration
- [ ] Food rating system
- [ ] Excel export for reports

### P2 (Nice to Have)
- [ ] Push/SMS notifications
- [ ] Photo proof of delivery
- [ ] Cash collection tracking

## Recent Fixes (Jan 30, 2026)
1. **Cancel delivery**: Shows "Cancellation cutoff has passed" when cutoff time exceeded
2. **Google Maps**: Added "Open in Maps" button to view location
3. **Location errors**: Improved error handling with specific messages
4. **Sales Manager**: Added Active/Inactive/Recently Finished tabs
5. **Subscription creation**: Works correctly from Sales Manager dashboard
6. **Plan display**: Shows fallback for delivery count in legacy plans

## Test Reports
- `/app/test_reports/iteration_7.json` - 100% pass rate (9/9 tests)
