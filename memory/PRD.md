# FoodFleet - Diet Meal Subscription Management System PRD

## Original Problem Statement
Build a comprehensive diet meal subscription management system (Salad Caffe) with:
- Multi-role RBAC: Super Admin, Admin, Sales Manager, Sales Executive, City Manager, Kitchen Manager, Delivery Boy, Customer
- Cities: Kochi & Trivandrum with multiple kitchens per city
- Subscription plans: Weekly (6), 15 Days (12), Monthly (24 deliveries)
- Diet types: Veg, Non-Veg, Mixed, Breakfast-only
- Menu categories: Salad, Wrap, Sandwich, Multigrain
- Sunday holiday - no deliveries
- Auto-extend subscription on cancellation/skip
- Cancellation cutoffs: Breakfast 6AM, Lunch 10AM, Dinner 2PM
- Customer profile with health info, allergies, lifestyle data
- Profile completion wallet (₹100 max)
- Razorpay integration for payments

## User Personas
1. **Super Admin** - Full system access, pricing control, menu management, analytics, audit logs
2. **Admin** - User management, subscription management, reports
3. **Sales Manager** - Customer onboarding, subscription creation, renewals
4. **Sales Executive** - Customer onboarding, basic sales
5. **City Manager** - Manage city operations, delivery boys, approve requests
6. **Kitchen Manager** - View orders, mark ready, dispatch, print KOT
7. **Delivery Boy** - View assigned deliveries, navigation, mark delivered
8. **Customer** - View schedule, track delivery, manage profile, pause/cancel

## Core Requirements (Static)
- Phone-based authentication with auto-generated passwords
- Force password change on first login
- Role-based access control (RBAC)
- Allergies: milk, gluten, peanuts, pineapple, onion, wheat, egg
- Lifestyle diseases: Diabetes, Hypertension, Cholesterol, Thyroid
- Menu follows delivery sequence (not calendar)
- Fixed monthly menu (1st = Med Chicken Salad, etc.)
- All cancelled/skipped meals auto-extend subscription
- Audit logging for all actions

## What's Been Implemented (Jan 2025)

### Backend (FastAPI + MongoDB)
- [x] New role structure (8 roles with RBAC)
- [x] User management with profile points/wallet
- [x] Kitchen management (Kochi, Trivandrum)
- [x] Plan management (Weekly/15 Days/Monthly)
- [x] Menu item management with categories
- [x] Subscription management with auto-extension
- [x] Delivery scheduling with cancellation rules
- [x] Alternative delivery requests (skip/reschedule)
- [x] In-app notifications
- [x] Audit logging for all actions
- [x] Constants API for all dropdowns
- [x] Reports: Subscriptions, Expiring, Revenue, Delivery Boys
- [x] Razorpay integration (ready for keys)

### Frontend (React + Tailwind + Shadcn)
- [x] Landing page
- [x] Login/Signup with phone
- [x] Super Admin Dashboard (plans, menu, audit logs)
- [x] Admin Dashboard (users, kitchens)
- [x] City Manager Dashboard (kitchens, delivery boys, requests)
- [x] Kitchen Manager Dashboard (ALL meals visible - Breakfast/Lunch/Dinner tabs)
- [x] Delivery Boy Dashboard (map + delivery list)
- [x] Sales Manager Dashboard (customer onboarding)
- [x] Customer Dashboard (schedule, tracking)
- [x] Customer Profile (health info, allergies, preferences)

## Login Credentials (Password: admin123)
| Role | Phone |
|------|-------|
| Super Admin | 9000000001 |
| Admin | 9000000002 |
| Sales Manager | 9000000003 |
| Sales Executive | 9000000004 |
| City Manager Kochi | 9000000005 |
| City Manager Trivandrum | 9000000006 |
| Kitchen Manager Kochi | 9000000007 |
| Kitchen Manager Trivandrum | 9000000008 |
| Delivery Boy 1 | 9000000009 |
| Delivery Boy 2 | 9000000010 |
| Customer | 9000000011 |

## Prioritized Backlog

### P0 (Critical - Next)
- [ ] Menu Template Builder with mandatory rules validation
- [ ] Razorpay payment link generation (add API keys)
- [ ] Print/KOT functionality for kitchen
- [ ] Customer map view with status colors (🟢🟡🔴)

### P1 (High Priority)
- [ ] Food rating system (after 2 hours)
- [ ] Banner carousel (max 4)
- [ ] Delivery route optimization
- [ ] SMS notifications option
- [ ] Excel export for all reports

### P2 (Nice to Have)
- [ ] Push notifications
- [ ] Offline mode for delivery app
- [ ] Photo proof of delivery
- [ ] Cash collection tracking

## Next Action Items
1. Add Razorpay API keys to enable payment links
2. Complete Menu Template Builder with mandatory category rules
3. Implement Print/KOT functionality
4. Add customer map view with delivery status colors
5. Implement food rating system
