# FoodFleet - Diet Meal Subscription Management System PRD

## Original Problem Statement
Build a comprehensive diet meal subscription management system with:
- Multi-role RBAC: Super Admin, Admin, Sales Manager, Sales Executive, City Manager, Kitchen Manager, Delivery Boy, Customer
- Cities: Kochi & Trivandrum with multiple kitchens per city
- Subscription plans: Weekly (6), 15 Days (12), Monthly (24 deliveries)
- Diet types: Veg, Non-Veg, Mixed, Breakfast-only
- Menu categories: Salad, Wrap, Sandwich, Multigrain
- Sunday holiday - no deliveries
- Auto-extend subscription on cancellation/skip

## Cancellation Deadlines
- **Breakfast**: Before 7:00 AM
- **Lunch**: Before 9:30 AM  
- **Dinner**: Before 3:00 PM

## Business Logic
1. **Customer Creation**: Admin creates customer → Customer completes profile
2. **Subscription Assignment**: Sales/Admin assigns plan with start date (can be future)
3. **Delivery Assignment**: Admin assigns delivery boy to customer
4. **Cancellation**: Removed from kitchen prep, auto-extends subscription
5. **Kitchen Assignment**: Required for customers - determines which kitchen prepares food

## What's Been Implemented

### Customer Dashboard ✅ (Updated Jan 30, 2026)
- [x] **Running Announcement Bar** - Marquee animation at top
- [x] **Banner Carousel** - 5 banners with autoplay and navigation
- [x] **Delivery Calendar** - Color-coded (Scheduled/Delivered/Cancelled)
- [x] **Today's Meals** - Click item for full details (image, ingredients, nutrition)
- [x] **Your Plan Card**:
  - Plan Name, Status, Diet Type
  - Remaining deliveries with progress bar
  - Extended days count
  - **Next Renewal Date**
  - **Renew Now button** (links to https://razorpay.me/@saladcaffe)
- [x] **Cancel Button** with countdown timer
- [x] **Change Time Button** - Request different delivery time (needs admin approval)
- [x] **Upcoming Deliveries** list
- [x] **Shop Section** - Browse items to add to subscription (Coming soon)
- [x] **Cancellation Deadlines** info card

### Customer Profile ✅ (Updated Jan 30, 2026)
- [x] Profile completion progress with ₹ value (₹100 max)
- [x] Basic info (name, phone, alternate phone, emergency contact)
- [x] **Delivery Address**
- [x] **Google Location** options:
  - Option 1: Paste Google Maps Link (auto-extracts coordinates)
  - Option 2: Enter Latitude/Longitude manually
  - Get Current Location button
- [x] **Allergies** - Clickable badges (milk, gluten, peanuts, etc.)
- [x] **"Other allergies"** - Text field for non-listed allergies
- [x] **Lifestyle Diseases** - Diabetes, Hypertension, Cholesterol, Thyroid
- [x] Height/Weight inputs
- [x] **"I smoke"** checkbox
- [x] **"I drink alcohol"** checkbox
- [x] Accommodation type
- [x] **Preferred Delivery Time Window** - 1-hour slots:
  - 09:00-10:00, 10:00-11:00, 11:00-12:00, 12:00-13:00
  - 13:00-14:00, 14:00-15:00, 18:00-19:00, 19:00-20:00, 20:00-21:00
- [x] Preferred Meal Times (breakfast/lunch/dinner)
- [x] Delivery Days (Mon-Sat, Sunday disabled)
- [x] Subscription Goal
- [x] **Save Profile** button (working with success toast)

### Admin Dashboard ✅
- [x] Kitchens CRUD with Google coordinates
- [x] Staff CRUD with Kitchen assignment
- [x] Customers CRUD with Kitchen/City/Address

### Super Admin Dashboard ✅
- [x] Menu Items CRUD with nutrition info
- [x] Plans CRUD with menu item selection

### Backend Endpoints Added ✅
- [x] GET/POST /api/announcements
- [x] GET/POST /api/shop-items
- [x] PUT /api/deliveries/{id}/request-reschedule
- [x] PUT /api/users/{id}/profile (with new fields)
- [x] GET /api/constants (includes delivery_time_windows)

## Login Credentials (Password: admin123)
| Role | Phone |
|------|-------|
| Super Admin | 9000000001 |
| Admin | 9000000002 |
| Customer (Test) | 9000000011 |

## Prioritized Backlog

### P0 (Critical - Next)
- [ ] Delivery Boy "Mark as Delivered" functionality
- [ ] Customer map view with live delivery tracking
- [ ] Print/KOT functionality for kitchen
- [ ] Highlight unassigned customers in Admin dashboard

### P1 (High Priority)
- [ ] Approve/Reject reschedule requests (Admin)
- [ ] Shop items purchase integration
- [ ] Food rating system (after 2 hours)
- [ ] Excel export for reports

### P2 (Nice to Have)
- [ ] Push/SMS notifications
- [ ] Photo proof of delivery
- [ ] Cash collection tracking

## Recent Changes (Jan 30, 2026)
1. Customer Dashboard enhanced with:
   - Running announcement bar
   - Banner carousel with autoplay
   - Item detail dialog (click for ingredients, nutrition)
   - Renew Now button with Razorpay link
   - Change Time option for same-day reschedule
   - Shop items section

2. Customer Profile enhanced with:
   - Google Maps Link paste option
   - Other allergies text field
   - "I drink alcohol" checkbox
   - Delivery time window dropdown (1-hour slots)
   - Profile save working correctly

## Test Reports
- `/app/test_reports/iteration_6.json` - 100% pass rate (13/13 tests)
