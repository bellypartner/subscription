from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: Optional[str] = None
    phone: Optional[str] = None
    name: str
    picture: Optional[str] = None
    role: str = "customer"  # admin, sales_manager, kitchen_staff, delivery_boy, customer
    kitchen_id: Optional[str] = None  # For kitchen_staff and delivery_boy
    address: Optional[str] = None
    google_location: Optional[Dict[str, float]] = None  # {lat, lng}
    city: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    name: str
    role: str = "customer"
    kitchen_id: Optional[str] = None
    address: Optional[str] = None
    google_location: Optional[Dict[str, float]] = None
    city: Optional[str] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

class KitchenBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    kitchen_id: str = Field(default_factory=lambda: f"kitchen_{uuid.uuid4().hex[:12]}")
    name: str
    city: str
    address: str
    location: Dict[str, float]  # {lat, lng}
    contact_phone: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KitchenCreate(BaseModel):
    name: str
    city: str
    address: str
    location: Dict[str, float]
    contact_phone: str

class MenuItemBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    meal_type: str  # breakfast, lunch, dinner
    diet_type: str  # pure_veg, mixed, non_veg
    calories: int
    protein: float
    carbs: float
    fat: float
    image_url: Optional[str] = None
    day_of_month: int  # 1-30
    month: int
    year: int
    kitchen_id: str
    is_active: bool = True

class MenuItemCreate(BaseModel):
    name: str
    description: str
    meal_type: str
    diet_type: str
    calories: int
    protein: float
    carbs: float
    fat: float
    image_url: Optional[str] = None
    day_of_month: int
    month: int
    year: int
    kitchen_id: str

class SubscriptionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    subscription_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    user_id: str
    kitchen_id: str
    plan_type: str  # monthly, weekly
    diet_type: str  # pure_veg, mixed, non_veg
    meals: List[str]  # ["breakfast", "lunch", "dinner"]
    delivery_days: List[str]  # ["monday", "tuesday", ...] or ["alternate"] or ["daily"]
    custom_days: Optional[List[str]] = None  # For custom day selection
    start_date: datetime
    end_date: datetime
    total_deliveries: int
    remaining_deliveries: int
    status: str = "active"  # active, paused, cancelled, completed
    paused_dates: List[str] = []  # ISO date strings
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionCreate(BaseModel):
    user_id: str
    kitchen_id: str
    plan_type: str
    diet_type: str
    meals: List[str]
    delivery_days: List[str]
    custom_days: Optional[List[str]] = None
    start_date: str

class DeliveryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    delivery_id: str = Field(default_factory=lambda: f"del_{uuid.uuid4().hex[:12]}")
    subscription_id: str
    user_id: str
    kitchen_id: str
    delivery_boy_id: Optional[str] = None
    delivery_date: str  # ISO date string
    meals: List[str]
    menu_items: List[Dict[str, Any]] = []
    status: str = "scheduled"  # scheduled, preparing, ready, dispatched, in_transit, delivered, cancelled
    address: str
    location: Dict[str, float]
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DeliveryAssignmentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    assignment_id: str = Field(default_factory=lambda: f"assign_{uuid.uuid4().hex[:12]}")
    delivery_boy_id: str
    kitchen_id: str
    date: str  # ISO date string
    delivery_ids: List[str] = []
    current_location: Optional[Dict[str, float]] = None
    route_order: List[str] = []  # Ordered list of delivery_ids
    status: str = "pending"  # pending, in_progress, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    message: str
    type: str  # delivery_update, subscription_update, general
    delivery_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> dict:
    # Check cookie first, then Authorization header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def require_roles(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/google-session")
async def process_google_session(request: Request, response: Response):
    """Process session_id from Google OAuth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Fetch user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        user_data = resp.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": user_data["name"], "picture": user_data["picture"]}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data["picture"],
            "role": "customer",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.post("/auth/phone-signup")
async def phone_signup(user_data: UserCreate, response: Response):
    """Sign up with phone number"""
    if not user_data.phone:
        raise HTTPException(status_code=400, detail="Phone number required")
    
    existing = await db.users.find_one({"phone": user_data.phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Hash password (simple for demo)
    import hashlib
    password_hash = hashlib.sha256(user_data.password.encode()).hexdigest() if user_data.password else None
    
    new_user = {
        "user_id": user_id,
        "phone": user_data.phone,
        "name": user_data.name,
        "email": user_data.email,
        "role": user_data.role,
        "kitchen_id": user_data.kitchen_id,
        "address": user_data.address,
        "google_location": user_data.google_location,
        "city": user_data.city,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    await db.users.insert_one(new_user)
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return user

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    """Login with email/phone and password"""
    import hashlib
    
    query = {}
    if credentials.email:
        query["email"] = credentials.email
    elif credentials.phone:
        query["phone"] = credentials.phone
    else:
        raise HTTPException(status_code=400, detail="Email or phone required")
    
    user = await db.users.find_one(query, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    if user.get("password_hash") != password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user.pop("password_hash", None)
    return user

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== KITCHEN ENDPOINTS ====================

@api_router.post("/kitchens", response_model=dict)
async def create_kitchen(kitchen: KitchenCreate, user: dict = Depends(require_roles(["admin"]))):
    """Create a new kitchen (Admin only)"""
    kitchen_obj = KitchenBase(**kitchen.model_dump())
    doc = kitchen_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.kitchens.insert_one(doc)
    return await db.kitchens.find_one({"kitchen_id": kitchen_obj.kitchen_id}, {"_id": 0})

@api_router.get("/kitchens")
async def get_kitchens(city: Optional[str] = None):
    """Get all kitchens, optionally filtered by city"""
    query = {"is_active": True}
    if city:
        query["city"] = city
    kitchens = await db.kitchens.find(query, {"_id": 0}).to_list(100)
    return kitchens

@api_router.get("/kitchens/{kitchen_id}")
async def get_kitchen(kitchen_id: str):
    """Get kitchen by ID"""
    kitchen = await db.kitchens.find_one({"kitchen_id": kitchen_id}, {"_id": 0})
    if not kitchen:
        raise HTTPException(status_code=404, detail="Kitchen not found")
    return kitchen

@api_router.put("/kitchens/{kitchen_id}")
async def update_kitchen(kitchen_id: str, updates: dict, user: dict = Depends(require_roles(["admin"]))):
    """Update kitchen (Admin only)"""
    await db.kitchens.update_one({"kitchen_id": kitchen_id}, {"$set": updates})
    return await db.kitchens.find_one({"kitchen_id": kitchen_id}, {"_id": 0})

# ==================== USER MANAGEMENT ====================

@api_router.get("/users")
async def get_users(role: Optional[str] = None, kitchen_id: Optional[str] = None, user: dict = Depends(require_roles(["admin", "sales_manager"]))):
    """Get users (Admin/Sales Manager)"""
    query = {}
    if role:
        query["role"] = role
    if kitchen_id:
        query["kitchen_id"] = kitchen_id
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_roles(["admin", "sales_manager"]))):
    """Create user (Admin/Sales Manager)"""
    import hashlib
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hashlib.sha256(user_data.password.encode()).hexdigest() if user_data.password else None
    
    new_user = {
        "user_id": user_id,
        **user_data.model_dump(),
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    new_user.pop("password", None)
    await db.users.insert_one(new_user)
    
    result = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return result

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user by ID"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update user"""
    # Users can update themselves, admins/sales can update anyone
    if current_user["user_id"] != user_id and current_user["role"] not in ["admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Cannot update other users")
    
    updates.pop("password_hash", None)
    updates.pop("user_id", None)
    await db.users.update_one({"user_id": user_id}, {"$set": updates})
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

# ==================== MENU ENDPOINTS ====================

@api_router.post("/menu")
async def create_menu_item(item: MenuItemCreate, user: dict = Depends(require_roles(["admin", "kitchen_staff"]))):
    """Create menu item"""
    item_obj = MenuItemBase(**item.model_dump())
    doc = item_obj.model_dump()
    await db.menu_items.insert_one(doc)
    return await db.menu_items.find_one({"item_id": item_obj.item_id}, {"_id": 0})

@api_router.get("/menu")
async def get_menu(kitchen_id: str, month: Optional[int] = None, year: Optional[int] = None, diet_type: Optional[str] = None):
    """Get menu items for a kitchen"""
    now = datetime.now(timezone.utc)
    query = {"kitchen_id": kitchen_id, "is_active": True}
    if month:
        query["month"] = month
    else:
        query["month"] = now.month
    if year:
        query["year"] = year
    else:
        query["year"] = now.year
    if diet_type:
        query["diet_type"] = diet_type
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(500)
    return items

@api_router.get("/menu/today")
async def get_todays_menu(kitchen_id: str, diet_type: Optional[str] = None):
    """Get today's menu items"""
    now = datetime.now(timezone.utc)
    query = {
        "kitchen_id": kitchen_id,
        "is_active": True,
        "day_of_month": now.day,
        "month": now.month,
        "year": now.year
    }
    if diet_type:
        query["diet_type"] = diet_type
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(50)
    return items

@api_router.put("/menu/{item_id}")
async def update_menu_item(item_id: str, updates: dict, user: dict = Depends(require_roles(["admin", "kitchen_staff"]))):
    """Update menu item"""
    await db.menu_items.update_one({"item_id": item_id}, {"$set": updates})
    return await db.menu_items.find_one({"item_id": item_id}, {"_id": 0})

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, user: dict = Depends(require_roles(["admin"]))):
    """Delete menu item"""
    await db.menu_items.update_one({"item_id": item_id}, {"$set": {"is_active": False}})
    return {"message": "Deleted"}

# ==================== SUBSCRIPTION ENDPOINTS ====================

@api_router.post("/subscriptions")
async def create_subscription(sub: SubscriptionCreate, user: dict = Depends(require_roles(["admin", "sales_manager", "customer"]))):
    """Create subscription"""
    start = datetime.fromisoformat(sub.start_date.replace("Z", "+00:00"))
    
    # Calculate end date and deliveries based on plan
    if sub.plan_type == "monthly":
        end_date = start + timedelta(days=30)
        total_deliveries = 24  # Mon-Sat for ~4 weeks
    else:  # weekly
        end_date = start + timedelta(days=7)
        total_deliveries = 6  # Mon-Sat
    
    sub_obj = SubscriptionBase(
        user_id=sub.user_id,
        kitchen_id=sub.kitchen_id,
        plan_type=sub.plan_type,
        diet_type=sub.diet_type,
        meals=sub.meals,
        delivery_days=sub.delivery_days,
        custom_days=sub.custom_days,
        start_date=start,
        end_date=end_date,
        total_deliveries=total_deliveries,
        remaining_deliveries=total_deliveries
    )
    
    doc = sub_obj.model_dump()
    doc["start_date"] = doc["start_date"].isoformat()
    doc["end_date"] = doc["end_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.subscriptions.insert_one(doc)
    
    # Get user for address
    customer = await db.users.find_one({"user_id": sub.user_id}, {"_id": 0})
    
    # Generate deliveries
    await generate_deliveries(sub_obj, customer)
    
    return await db.subscriptions.find_one({"subscription_id": sub_obj.subscription_id}, {"_id": 0})

async def generate_deliveries(subscription: SubscriptionBase, customer: dict):
    """Generate delivery records for subscription"""
    current = subscription.start_date
    delivery_count = 0
    
    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
    }
    
    while current <= subscription.end_date and delivery_count < subscription.total_deliveries:
        weekday = current.weekday()
        weekday_name = list(day_map.keys())[weekday]
        
        # Skip Sunday
        if weekday == 6:
            current += timedelta(days=1)
            continue
        
        # Check delivery days
        should_deliver = False
        if "daily" in subscription.delivery_days:
            should_deliver = True
        elif "alternate" in subscription.delivery_days:
            days_since_start = (current - subscription.start_date).days
            should_deliver = days_since_start % 2 == 0
        elif subscription.custom_days:
            should_deliver = weekday_name in [d.lower() for d in subscription.custom_days]
        else:
            should_deliver = weekday_name in [d.lower() for d in subscription.delivery_days]
        
        if should_deliver:
            delivery = DeliveryBase(
                subscription_id=subscription.subscription_id,
                user_id=subscription.user_id,
                kitchen_id=subscription.kitchen_id,
                delivery_date=current.strftime("%Y-%m-%d"),
                meals=subscription.meals,
                address=customer.get("address", ""),
                location=customer.get("google_location", {"lat": 0, "lng": 0})
            )
            doc = delivery.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.deliveries.insert_one(doc)
            delivery_count += 1
        
        current += timedelta(days=1)

@api_router.get("/subscriptions")
async def get_subscriptions(user_id: Optional[str] = None, kitchen_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get subscriptions"""
    query = {}
    if user["role"] == "customer":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    if kitchen_id:
        query["kitchen_id"] = kitchen_id
    
    subs = await db.subscriptions.find(query, {"_id": 0}).to_list(1000)
    return subs

@api_router.get("/subscriptions/{subscription_id}")
async def get_subscription(subscription_id: str, user: dict = Depends(get_current_user)):
    """Get subscription by ID"""
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub

@api_router.put("/subscriptions/{subscription_id}/pause")
async def pause_subscription(subscription_id: str, dates: List[str], user: dict = Depends(get_current_user)):
    """Pause subscription for specific dates"""
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Cancel deliveries for those dates
    for date in dates:
        await db.deliveries.update_one(
            {"subscription_id": subscription_id, "delivery_date": date},
            {"$set": {"status": "cancelled"}}
        )
    
    # Update paused dates
    paused = sub.get("paused_dates", [])
    paused.extend(dates)
    await db.subscriptions.update_one(
        {"subscription_id": subscription_id},
        {"$set": {"paused_dates": list(set(paused))}}
    )
    
    return {"message": "Deliveries paused", "paused_dates": dates}

@api_router.put("/subscriptions/{subscription_id}/resume")
async def resume_subscription(subscription_id: str, dates: List[str], user: dict = Depends(get_current_user)):
    """Resume subscription for specific dates"""
    for date in dates:
        await db.deliveries.update_one(
            {"subscription_id": subscription_id, "delivery_date": date},
            {"$set": {"status": "scheduled"}}
        )
    
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
    paused = sub.get("paused_dates", [])
    paused = [d for d in paused if d not in dates]
    await db.subscriptions.update_one(
        {"subscription_id": subscription_id},
        {"$set": {"paused_dates": paused}}
    )
    
    return {"message": "Deliveries resumed", "resumed_dates": dates}

# ==================== DELIVERY ENDPOINTS ====================

@api_router.get("/deliveries")
async def get_deliveries(
    user_id: Optional[str] = None,
    kitchen_id: Optional[str] = None,
    delivery_boy_id: Optional[str] = None,
    date: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get deliveries with filters"""
    query = {}
    
    if user["role"] == "customer":
        query["user_id"] = user["user_id"]
    elif user["role"] == "delivery_boy":
        query["delivery_boy_id"] = user["user_id"]
    elif user["role"] == "kitchen_staff":
        query["kitchen_id"] = user.get("kitchen_id")
    else:
        if user_id:
            query["user_id"] = user_id
        if delivery_boy_id:
            query["delivery_boy_id"] = delivery_boy_id
    
    if kitchen_id:
        query["kitchen_id"] = kitchen_id
    if date:
        query["delivery_date"] = date
    if status:
        query["status"] = status
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with user and menu data
    for delivery in deliveries:
        customer = await db.users.find_one({"user_id": delivery["user_id"]}, {"_id": 0, "password_hash": 0})
        delivery["customer"] = customer
        
        # Get menu items for this delivery
        menu_items = []
        for meal in delivery.get("meals", []):
            items = await db.menu_items.find({
                "kitchen_id": delivery["kitchen_id"],
                "meal_type": meal,
                "day_of_month": int(delivery["delivery_date"].split("-")[2]),
                "month": int(delivery["delivery_date"].split("-")[1]),
                "year": int(delivery["delivery_date"].split("-")[0])
            }, {"_id": 0}).to_list(10)
            menu_items.extend(items)
        delivery["menu_items"] = menu_items
    
    return deliveries

@api_router.get("/deliveries/today")
async def get_todays_deliveries(kitchen_id: str, user: dict = Depends(require_roles(["admin", "kitchen_staff", "delivery_boy"]))):
    """Get today's deliveries for a kitchen"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {"kitchen_id": kitchen_id, "delivery_date": today}
    
    if user["role"] == "delivery_boy":
        query["delivery_boy_id"] = user["user_id"]
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(500)
    
    # Enrich data
    for delivery in deliveries:
        customer = await db.users.find_one({"user_id": delivery["user_id"]}, {"_id": 0, "password_hash": 0})
        delivery["customer"] = customer
    
    return deliveries

@api_router.put("/deliveries/{delivery_id}/status")
async def update_delivery_status(delivery_id: str, status: str, user: dict = Depends(require_roles(["admin", "kitchen_staff", "delivery_boy"]))):
    """Update delivery status"""
    updates = {"status": status}
    
    if status == "dispatched":
        updates["dispatched_at"] = datetime.now(timezone.utc).isoformat()
        
        # Send notification to customer
        delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
        if delivery:
            notification = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": delivery["user_id"],
                "title": "Your meal is on the way!",
                "message": "Your food has been prepared and is being delivered. Track your delivery in the app.",
                "type": "delivery_update",
                "delivery_id": delivery_id,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
    
    elif status == "delivered":
        updates["delivered_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update remaining deliveries
        delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
        if delivery:
            await db.subscriptions.update_one(
                {"subscription_id": delivery["subscription_id"]},
                {"$inc": {"remaining_deliveries": -1}}
            )
    
    await db.deliveries.update_one({"delivery_id": delivery_id}, {"$set": updates})
    return await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})

@api_router.put("/deliveries/{delivery_id}/assign")
async def assign_delivery(delivery_id: str, delivery_boy_id: str, user: dict = Depends(require_roles(["admin", "kitchen_staff"]))):
    """Assign delivery to delivery boy"""
    await db.deliveries.update_one(
        {"delivery_id": delivery_id},
        {"$set": {"delivery_boy_id": delivery_boy_id}}
    )
    return await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})

# ==================== DELIVERY ASSIGNMENT (ROUTES) ====================

@api_router.post("/delivery-assignments")
async def create_delivery_assignment(
    delivery_boy_id: str,
    kitchen_id: str,
    date: str,
    delivery_ids: List[str],
    user: dict = Depends(require_roles(["admin", "kitchen_staff"]))
):
    """Create delivery assignment for a delivery boy"""
    assignment = DeliveryAssignmentBase(
        delivery_boy_id=delivery_boy_id,
        kitchen_id=kitchen_id,
        date=date,
        delivery_ids=delivery_ids,
        route_order=delivery_ids
    )
    
    doc = assignment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.delivery_assignments.insert_one(doc)
    
    # Update deliveries with assignment
    for del_id in delivery_ids:
        await db.deliveries.update_one(
            {"delivery_id": del_id},
            {"$set": {"delivery_boy_id": delivery_boy_id}}
        )
    
    return await db.delivery_assignments.find_one({"assignment_id": assignment.assignment_id}, {"_id": 0})

@api_router.get("/delivery-assignments")
async def get_delivery_assignments(
    delivery_boy_id: Optional[str] = None,
    kitchen_id: Optional[str] = None,
    date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get delivery assignments"""
    query = {}
    if user["role"] == "delivery_boy":
        query["delivery_boy_id"] = user["user_id"]
    elif delivery_boy_id:
        query["delivery_boy_id"] = delivery_boy_id
    
    if kitchen_id:
        query["kitchen_id"] = kitchen_id
    if date:
        query["date"] = date
    
    assignments = await db.delivery_assignments.find(query, {"_id": 0}).to_list(100)
    return assignments

@api_router.put("/delivery-assignments/{assignment_id}/location")
async def update_delivery_boy_location(assignment_id: str, location: Dict[str, float], user: dict = Depends(require_roles(["delivery_boy"]))):
    """Update delivery boy's current location"""
    await db.delivery_assignments.update_one(
        {"assignment_id": assignment_id},
        {"$set": {"current_location": location}}
    )
    return {"message": "Location updated"}

# ==================== NOTIFICATION ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "All marked as read"}

# ==================== ANALYTICS ====================

@api_router.get("/analytics/kitchen/{kitchen_id}")
async def get_kitchen_analytics(kitchen_id: str, user: dict = Depends(require_roles(["admin", "kitchen_staff"]))):
    """Get kitchen analytics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    total_today = await db.deliveries.count_documents({"kitchen_id": kitchen_id, "delivery_date": today})
    pending = await db.deliveries.count_documents({"kitchen_id": kitchen_id, "delivery_date": today, "status": {"$in": ["scheduled", "preparing"]}})
    ready = await db.deliveries.count_documents({"kitchen_id": kitchen_id, "delivery_date": today, "status": "ready"})
    dispatched = await db.deliveries.count_documents({"kitchen_id": kitchen_id, "delivery_date": today, "status": {"$in": ["dispatched", "in_transit"]}})
    delivered = await db.deliveries.count_documents({"kitchen_id": kitchen_id, "delivery_date": today, "status": "delivered"})
    
    active_subscriptions = await db.subscriptions.count_documents({"kitchen_id": kitchen_id, "status": "active"})
    
    return {
        "today": {
            "total": total_today,
            "pending": pending,
            "ready": ready,
            "dispatched": dispatched,
            "delivered": delivered
        },
        "active_subscriptions": active_subscriptions
    }

@api_router.get("/analytics/admin")
async def get_admin_analytics(user: dict = Depends(require_roles(["admin"]))):
    """Get admin dashboard analytics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    total_kitchens = await db.kitchens.count_documents({"is_active": True})
    total_customers = await db.users.count_documents({"role": "customer", "is_active": True})
    total_delivery_boys = await db.users.count_documents({"role": "delivery_boy", "is_active": True})
    active_subscriptions = await db.subscriptions.count_documents({"status": "active"})
    today_deliveries = await db.deliveries.count_documents({"delivery_date": today})
    
    return {
        "total_kitchens": total_kitchens,
        "total_customers": total_customers,
        "total_delivery_boys": total_delivery_boys,
        "active_subscriptions": active_subscriptions,
        "today_deliveries": today_deliveries
    }

# ==================== CITIES ====================

@api_router.get("/cities")
async def get_cities():
    """Get list of cities with kitchens"""
    cities = await db.kitchens.distinct("city", {"is_active": True})
    return cities

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "FoodFleet API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
