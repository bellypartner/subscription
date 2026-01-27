# FoodFleet - Diet Meal Subscription Management System PRD

## Original Problem Statement
Build a comprehensive diet meal subscription management system with:
- Multi-role access (Admin, Sales Manager, Kitchen Staff, Delivery Boy, Customer)
- Multi-kitchen support across cities
- Subscription plans (Monthly: 24 deliveries/30 days, Weekly: 6 deliveries/7 days)
- Diet types: Pure Veg, Mixed, Non-Veg
- Flexible meal combinations: Breakfast, Lunch, Dinner
- Customizable delivery days (daily, alternate, specific days)
- Real-time delivery tracking with map
- In-app notifications
- Pause/cancel delivery functionality

## User Personas
1. **Customer** - Subscribes to meal plans, tracks deliveries, manages schedule
2. **Kitchen Staff** - Views daily orders, updates order status, dispatches deliveries
3. **Delivery Boy** - Views delivery routes on map, completes deliveries
4. **Sales Manager** - Onboards customers, creates subscriptions
5. **Admin** - Manages kitchens, users, and system-wide settings

## Core Requirements (Static)
- Phone + Google OAuth authentication
- Role-based access control
- Monthly/Weekly subscription plans
- Mon-Sat delivery (Sunday off)
- Menu management with calories/macros
- Real-time delivery tracking using OpenStreetMap
- Delivery pause/cancel functionality
- Multi-kitchen per city support

## What's Been Implemented (Dec 2025)
### Backend (FastAPI + MongoDB)
- [x] User authentication (phone signup, login, Google OAuth)
- [x] Kitchen CRUD operations
- [x] Menu item management
- [x] Subscription management (create, pause, resume)
- [x] Delivery scheduling and status updates
- [x] Delivery boy assignment
- [x] In-app notifications
- [x] Role-based access control
- [x] Analytics endpoints

### Frontend (React + Tailwind + Shadcn)
- [x] Landing page with features showcase
- [x] Login/Signup pages (phone + Google)
- [x] Customer Dashboard (Bento grid layout)
- [x] Kitchen Dashboard (order management)
- [x] Delivery Dashboard (map + delivery list)
- [x] Sales Manager Dashboard (customer onboarding)
- [x] Admin Dashboard (system management)
- [x] Delivery tracking page with live map
- [x] Subscription management page

## Prioritized Backlog

### P0 (Critical - Next Phase)
- [ ] Menu item bulk import/export
- [ ] Push notifications setup
- [ ] Payment integration (Stripe/Razorpay)

### P1 (High Priority)
- [ ] Delivery route optimization
- [ ] Customer feedback/ratings
- [ ] Kitchen inventory management
- [ ] SMS notifications option

### P2 (Nice to Have)
- [ ] Meal customization requests
- [ ] Referral system
- [ ] Loyalty points program
- [ ] Mobile app (React Native)

## Next Action Items
1. Add payment integration for subscriptions
2. Implement push notifications
3. Add menu bulk import feature
4. Create analytics dashboard for admins
5. Add delivery route optimization
