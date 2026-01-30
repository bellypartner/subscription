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

## Cancellation Deadlines (Updated)
- **Breakfast**: Before 7:00 AM
- **Lunch**: Before 9:30 AM  
- **Dinner**: Before 3:00 PM

## Business Logic (Clarified Jan 28, 2026)
1. **Customer Creation**: Admin creates customer → Customer completes profile (address, height, weight, allergies)
2. **Subscription Assignment**: Sales/Admin assigns plan to customer with start date (can be future)
3. **Delivery Assignment**: Admin assigns delivery boy to customer
4. **Cancellation Impact**: Cancelled delivery removes item from kitchen prep list, auto-extends subscription
5. **Kitchen Assignment**: Required for customers - determines which kitchen prepares their food

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- [x] Role-based access control (8 roles)
- [x] User management with profile completion points
- [x] Kitchen management with coordinates (lat/lng)
- [x] **Kitchen CRUD**: Create, Read, Update, Delete with Google coordinates
- [x] **User CRUD**: Create, Read, Update, Delete for staff and customers
- [x] Plan management with delivery_days/validity_days/selected_items
- [x] Menu item management with nutrition info
- [x] Subscription management with start_date for future scheduling
- [x] **Delivery management**: Create, Read, Update, Cancel with auto-extension
- [x] Cancellation cutoffs (7AM/9:30AM/3PM)
- [x] In-app notifications
- [x] Audit logging

### Frontend (React + Tailwind + Shadcn)

#### Super Admin Dashboard ✅
- [x] Menu Items CRUD (name, category, image, nutrition, allergy tags)
- [x] Plans CRUD (delivery_days, validity_days, price, menu item selection)

#### Admin Dashboard ✅ (Updated Jan 28, 2026)
- [x] **Kitchens Tab**: Full CRUD with Google coordinates, "Get Location" button
- [x] **Staff Tab**: Full CRUD with "Assign to Kitchen" dropdown for delivery boys
- [x] **Customers Tab**: Full CRUD with "Assign to Kitchen", City, Address fields

#### Customer Dashboard ✅ (Updated Jan 28, 2026)
- [x] **Profile completion banner** with percentage and ₹100 earn prompt
- [x] **No subscription banner** when customer has no active plan
- [x] **Delivery Calendar** with color-coded legend (Scheduled/Delivered/Cancelled)
- [x] **Today's Meals** section with:
  - Menu item name and category
  - Full nutrition info (calories, protein, carbs, fat)
  - Cancel button with countdown timer showing time until cutoff
- [x] **Cancel confirmation dialog** explaining subscription extension
- [x] **Upcoming Deliveries** list
- [x] **Cancellation Deadlines** info card
- [x] **Your Plan** card showing status, diet type, remaining deliveries

#### Customer Profile ✅
- [x] Basic info (name, phone, alternate phone, emergency contact)
- [x] Delivery address
- [x] Health info (allergies, lifestyle diseases)
- [x] Physical metrics (height, weight)
- [x] Lifestyle (job type, activity level, smoking status)
- [x] Preferences (meal periods, delivery days, goals)
- [x] Profile completion progress bar

### Other Dashboards (Existing)
- [x] Kitchen Dashboard (meal tabs, mark ready)
- [x] Delivery Dashboard (daily deliveries, navigation)
- [x] Sales Manager Dashboard (customer onboarding)
- [x] City Manager Dashboard (kitchen/delivery oversight)

## Login Credentials (Password: admin123)
| Role | Phone |
|------|-------|
| Super Admin | 9000000001 |
| Admin | 9000000002 |
| Sales Manager | 9000000003 |
| Customer (Test) | 9000000011 |

## Prioritized Backlog

### P0 (Critical - Next)
- [ ] **Pay/Renew button** with Razorpay link (https://razorpay.me/@saladcaffe)
- [ ] Delivery Boy "Mark as Delivered" functionality
- [ ] Customer map view with delivery tracking (status colors)
- [ ] Print/KOT functionality for kitchen

### P1 (High Priority)
- [ ] Highlight unassigned customers (no kitchen/delivery boy) in Admin dashboard
- [ ] Separate "Assign Deliveries" screen for bulk assignment
- [ ] Food rating system (after 2 hours)
- [ ] Banner carousel (max 4)
- [ ] Excel export for all reports

### P2 (Nice to Have)
- [ ] Push notifications
- [ ] SMS notifications option
- [ ] Photo proof of delivery
- [ ] Cash collection tracking

## Recent Changes

### Jan 28, 2026
1. **Admin Dashboard Complete Rewrite**:
   - Added Kitchen Edit/Delete with Google coordinates fields
   - Added Staff Edit/Delete with Kitchen assignment
   - Added Customer Edit/Delete with Kitchen/City/Address

2. **Customer Dashboard Complete Rewrite**:
   - Added calendar view with delivery highlights
   - Added Today's Meals with menu items and nutrition
   - Added Cancel button with countdown timer
   - Added Cancellation Deadlines info card
   - Added profile completion prompt

3. **Backend Updates**:
   - Updated cancellation cutoffs: Breakfast 7AM, Lunch 9:30AM, Dinner 3PM
   - Added Kitchen PUT/DELETE endpoints
   - Added User DELETE endpoint
   - Added Delivery POST endpoint
   - Fixed MongoDB projection error in deliveries

## Test Reports
- `/app/test_reports/iteration_5.json` - 100% pass rate (23/23 tests)
