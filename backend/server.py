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
from datetime import datetime, timezone, timedelta, time
import hashlib
import razorpay

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client (optional - only if keys provided)
razorpay_client = None
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

app = FastAPI(title="FoodFleet API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# ==================== CONSTANTS ====================

ROLES = ["super_admin", "admin", "sales_manager", "sales_executive", "city_manager", "kitchen_manager", "delivery_boy", "customer"]
CITIES = ["Kochi", "Trivandrum"]
ALLERGIES = ["milk", "gluten", "peanuts", "pineapple", "onion", "wheat", "egg"]
LIFESTYLE_DISEASES = ["Diabetes", "Hypertension", "Cholesterol", "Thyroid"]
MEAL_CATEGORIES = ["Salad", "Wrap", "Sandwich", "Multigrain"]
DIET_TYPES = ["veg", "non_veg", "mixed", "breakfast_only"]
PLAN_TYPES = {
    "weekly": {"deliveries": 6, "label": "Weekly"},
    "15_days": {"deliveries": 12, "label": "15 Days"},
    "monthly": {"deliveries": 24, "label": "Monthly"}
}
MEAL_PERIODS = ["breakfast", "lunch", "dinner"]
SUBSCRIPTION_GOALS = ["Weight loss", "Healthy eating", "Lifestyle correction", "Muscle gain"]
JOB_TYPES = ["Sitting", "Field", "Mixed"]
PHYSICAL_ACTIVITY = ["Regular", "Irregular", "None"]
ACCOMMODATION_TYPES = ["Flat", "Independent house"]

# Cancellation cutoff times (as per user requirement)
CANCELLATION_CUTOFFS = {
    "breakfast": time(7, 0),    # Before 7:00 AM
    "lunch": time(9, 30),       # Before 9:30 AM
    "dinner": time(15, 0)       # Before 3:00 PM
}

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: Optional[str] = None
    phone: str
    alternate_phone: Optional[str] = None
    name: str
    picture: Optional[str] = None
    role: str = "customer"
    kitchen_id: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    google_location: Optional[Dict[str, float]] = None
    # Customer profile fields
    emergency_contact: Optional[str] = None
    allergies: List[str] = []
    lifestyle_diseases: List[str] = []
    job_type: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    physical_activity: Optional[str] = None
    smoking_status: Optional[bool] = None
    accommodation_type: Optional[str] = None
    preferred_meals: List[str] = []
    delivery_days: List[str] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    subscription_goal: Optional[str] = None
    # Profile completion
    profile_points: int = 0
    wallet_balance: float = 0.0
    # System fields
    password_hash: Optional[str] = None
    must_change_password: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class UserCreate(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    alternate_phone: Optional[str] = None
    role: str = "customer"
    kitchen_id: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    google_location: Optional[Dict[str, float]] = None
    password: Optional[str] = None

class UserProfileUpdate(BaseModel):
    emergency_contact: Optional[str] = None
    allergies: Optional[List[str]] = None
    other_allergies: Optional[str] = None  # Free text for non-listed allergies
    lifestyle_diseases: Optional[List[str]] = None
    job_type: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    physical_activity: Optional[str] = None
    smoking_status: Optional[bool] = None
    drinking_status: Optional[bool] = None  # New field
    accommodation_type: Optional[str] = None
    preferred_meals: Optional[List[str]] = None
    delivery_days: Optional[List[str]] = None
    delivery_time_window: Optional[str] = None  # e.g., "10:00-11:00", "11:00-12:00"
    subscription_goal: Optional[str] = None
    address: Optional[str] = None
    google_location: Optional[Dict[str, float]] = None  # {lat, lng}
    google_maps_link: Optional[str] = None  # Paste Google Maps URL
    alternate_phone: Optional[str] = None

class KitchenBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    kitchen_id: str = Field(default_factory=lambda: f"kitchen_{uuid.uuid4().hex[:12]}")
    name: str
    city: str
    address: str
    location: Dict[str, float]
    contact_phone: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlanBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:12]}")
    name: str
    delivery_days: int = 24  # 6, 12, or 24 (number of deliveries)
    validity_days: int = 30  # 7, 15, or 30 (calendar days valid)
    diet_type: str = "veg"  # veg, non_veg, mixed
    price: float = 0
    cost: float = 0
    description: Optional[str] = None
    # Selected menu items (up to delivery_days count)
    selected_items: List[str] = []  # List of item_ids
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    category: str  # Salad, Wrap, Sandwich, Multigrain
    diet_type: str  # veg, non_veg
    ingredients: List[str] = []
    allergy_tags: List[str] = []
    # Full nutrition info
    calories: Optional[int] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    sodium: Optional[float] = None  # in mg
    fiber: Optional[float] = None   # in g
    image_url: Optional[str] = None  # 1:1 ratio image
    is_active: bool = True

class MenuTemplateBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    template_id: str = Field(default_factory=lambda: f"template_{uuid.uuid4().hex[:12]}")
    name: str
    plan_type: str  # weekly, 15_days, monthly
    diet_type: str
    total_days: int
    menu_sequence: List[Dict[str, Any]] = []  # [{day: 1, meal_period: "lunch", item_id: "...", category: "Salad"}]
    has_wrap_day: bool = False
    has_sandwich_day: bool = False
    has_multigrain_day: bool = False
    is_published: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    subscription_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    user_id: str
    kitchen_id: str
    plan_id: str
    plan_type: str
    diet_type: str
    meal_periods: List[str]  # ["breakfast", "lunch", "dinner"]
    delivery_days: List[str]  # ["monday", "tuesday", ...]
    start_date: datetime
    current_delivery_day: int = 1  # Tracks menu sequence (not calendar)
    total_deliveries: int
    completed_deliveries: int = 0
    remaining_deliveries: int
    extended_deliveries: int = 0  # Auto-extensions from cancellations
    amount_paid: float
    next_renewal_amount: float = 0
    assigned_delivery_boy_id: Optional[str] = None  # Assigned delivery boy for this customer
    status: str = "active"  # active, paused, expired, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class DeliveryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    delivery_id: str = Field(default_factory=lambda: f"del_{uuid.uuid4().hex[:12]}")
    subscription_id: str
    user_id: str
    kitchen_id: str
    delivery_boy_id: Optional[str] = None
    delivery_date: str  # YYYY-MM-DD
    delivery_day_number: int  # Menu sequence day (1-24)
    meal_period: str  # breakfast, lunch, dinner
    menu_items: List[Dict[str, Any]] = []
    status: str = "scheduled"  # scheduled, preparing, ready, out_for_delivery, delivered, cancelled, skipped
    address: str
    location: Dict[str, float]
    customer_notes: Optional[str] = None
    allergy_notes: Optional[str] = None
    marked_ready_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = None
    cancellation_reason: Optional[str] = None
    auto_extended: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlternativeDeliveryRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    delivery_id: str
    user_id: str
    request_type: str  # skip, reschedule
    original_date: str
    requested_date: Optional[str] = None
    reason: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    message: str
    type: str  # food_ready, delivered, rate_reminder, renewal_reminder, general
    delivery_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_role: str
    action: str
    entity_type: str  # user, subscription, delivery, menu, etc.
    entity_id: str
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BannerBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    banner_id: str = Field(default_factory=lambda: f"banner_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    banner_type: str  # offer, campaign, plan_promo
    is_active: bool = True
    display_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnnouncementBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    announcement_id: str = Field(default_factory=lambda: f"ann_{uuid.uuid4().hex[:12]}")
    message: str
    type: str = "info"  # info, warning, promo
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShopItemBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"shop_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: float
    category: str  # supplements, snacks, beverages, merchandise
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPER FUNCTIONS ====================

def generate_password():
    """Generate a random password"""
    return uuid.uuid4().hex[:8]

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def calculate_profile_points(user: dict) -> int:
    """Calculate profile completion points (max 100)"""
    points = 0
    weights = {
        "name": 10, "phone": 10, "email": 5, "address": 10, "google_location": 10,
        "emergency_contact": 5, "allergies": 10, "lifestyle_diseases": 5,
        "job_type": 5, "height": 5, "weight": 5, "physical_activity": 5,
        "smoking_status": 5, "accommodation_type": 5, "preferred_meals": 5
    }
    for field, weight in weights.items():
        value = user.get(field)
        if value and (not isinstance(value, list) or len(value) > 0):
            points += weight
    return min(points, 100)

async def log_action(user_id: str, user_role: str, action: str, entity_type: str, entity_id: str, details: dict = None, request: Request = None):
    """Log an action to audit logs"""
    log = AuditLog(
        user_id=user_id,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
        ip_address=request.client.host if request else None
    )
    doc = log.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.audit_logs.insert_one(doc)

async def send_notification(user_id: str, title: str, message: str, notif_type: str, delivery_id: str = None):
    """Send in-app notification"""
    notif = NotificationBase(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        delivery_id=delivery_id
    )
    doc = notif.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.notifications.insert_one(doc)

def can_cancel_delivery(meal_period: str) -> bool:
    """Check if delivery can be cancelled based on cutoff time"""
    now = datetime.now(timezone.utc).time()
    cutoff = CANCELLATION_CUTOFFS.get(meal_period)
    if cutoff:
        return now < cutoff
    return False

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> dict:
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

@api_router.post("/auth/signup")
async def signup(user_data: UserCreate, response: Response, request: Request):
    """Sign up new user"""
    existing = await db.users.find_one({"phone": user_data.phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password = user_data.password or generate_password()
    
    new_user = {
        "user_id": user_id,
        "phone": user_data.phone,
        "name": user_data.name,
        "email": user_data.email,
        "alternate_phone": user_data.alternate_phone,
        "role": user_data.role if user_data.role in ROLES else "customer",
        "kitchen_id": user_data.kitchen_id,
        "city": user_data.city,
        "address": user_data.address,
        "google_location": user_data.google_location,
        "password_hash": hash_password(password),
        "must_change_password": user_data.password is None,
        "is_active": True,
        "profile_points": 0,
        "wallet_balance": 0.0,
        "allergies": [],
        "lifestyle_diseases": [],
        "preferred_meals": [],
        "delivery_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        "created_at": datetime.now(timezone.utc).isoformat()
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
    
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)
    
    await log_action(user_id, new_user["role"], "signup", "user", user_id, {"phone": user_data.phone}, request)
    
    result = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if user_data.password is None:
        result["generated_password"] = password
    return result

@api_router.post("/auth/login")
async def login(request: Request, response: Response):
    """Login with phone/email and password"""
    body = await request.json()
    phone = body.get("phone")
    email = body.get("email")
    password = body.get("password")
    
    if not password:
        raise HTTPException(status_code=400, detail="Password required")
    
    query = {}
    if phone:
        query["phone"] = phone
    elif email:
        query["email"] = email
    else:
        raise HTTPException(status_code=400, detail="Phone or email required")
    
    user = await db.users.find_one(query, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("password_hash") != hash_password(password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"session_token": session_token, "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)
    
    await log_action(user["user_id"], user["role"], "login", "user", user["user_id"], {}, request)
    
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/change-password")
async def change_password(request: Request, user: dict = Depends(get_current_user)):
    """Change password"""
    body = await request.json()
    new_password = body.get("new_password")
    
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hash_password(new_password), "must_change_password": False}}
    )
    
    await log_action(user["user_id"], user["role"], "change_password", "user", user["user_id"], {}, request)
    return {"message": "Password changed successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== USER MANAGEMENT ====================

@api_router.get("/users")
async def get_users(role: Optional[str] = None, city: Optional[str] = None, kitchen_id: Optional[str] = None, user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager", "sales_executive", "city_manager"]))):
    query = {}
    if role:
        query["role"] = role
    if city:
        query["city"] = city
    if kitchen_id:
        query["kitchen_id"] = kitchen_id
    
    # City manager can only see their city
    if user["role"] == "city_manager" and user.get("city"):
        query["city"] = user["city"]
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user(user_data: UserCreate, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager", "sales_executive"]))):
    """Create user (staff or customer)"""
    existing = await db.users.find_one({"phone": user_data.phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password = generate_password()
    
    new_user = {
        "user_id": user_id,
        "phone": user_data.phone,
        "name": user_data.name,
        "email": user_data.email,
        "alternate_phone": user_data.alternate_phone,
        "role": user_data.role,
        "kitchen_id": user_data.kitchen_id,
        "city": user_data.city,
        "address": user_data.address,
        "google_location": user_data.google_location,
        "password_hash": hash_password(password),
        "must_change_password": True,
        "is_active": True,
        "profile_points": 0,
        "wallet_balance": 0.0,
        "allergies": [],
        "lifestyle_diseases": [],
        "preferred_meals": [],
        "delivery_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.users.insert_one(new_user)
    
    await log_action(current_user["user_id"], current_user["role"], "create_user", "user", user_id, {"role": user_data.role, "phone": user_data.phone}, request)
    
    result = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    result["generated_password"] = password
    return result

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, request: Request, current_user: dict = Depends(get_current_user)):
    """Update user"""
    # Users can update themselves, admins can update anyone
    if current_user["user_id"] != user_id and current_user["role"] not in ["super_admin", "admin", "sales_manager", "city_manager"]:
        raise HTTPException(status_code=403, detail="Cannot update other users")
    
    # Prevent role changes by non-super-admin
    if "role" in updates and current_user["role"] != "super_admin":
        del updates["role"]
    
    updates.pop("password_hash", None)
    updates.pop("user_id", None)
    
    await db.users.update_one({"user_id": user_id}, {"$set": updates})
    
    # Recalculate profile points
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user and user.get("role") == "customer":
        points = calculate_profile_points(user)
        await db.users.update_one({"user_id": user_id}, {"$set": {"profile_points": points}})
    
    await log_action(current_user["user_id"], current_user["role"], "update_user", "user", user_id, updates, request)
    
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

@api_router.put("/users/{user_id}/profile")
async def update_profile(user_id: str, profile: UserProfileUpdate, request: Request, current_user: dict = Depends(get_current_user)):
    """Update customer profile with health info"""
    if current_user["user_id"] != user_id and current_user["role"] not in ["super_admin", "admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Cannot update other users")
    
    updates = {k: v for k, v in profile.model_dump().items() if v is not None}
    
    if updates:
        await db.users.update_one({"user_id": user_id}, {"$set": updates})
        
        # Recalculate profile points
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        points = calculate_profile_points(user)
        wallet_value = points  # ₹1 per point
        await db.users.update_one({"user_id": user_id}, {"$set": {"profile_points": points, "wallet_balance": wallet_value}})
    
    await log_action(current_user["user_id"], current_user["role"], "update_profile", "user", user_id, updates, request)
    
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Soft delete user - Admin only"""
    # Prevent deleting yourself
    if current_user["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    await db.users.update_one({"user_id": user_id}, {"$set": {"is_active": False}})
    await log_action(current_user["user_id"], current_user["role"], "delete_user", "user", user_id, {}, request)
    return {"message": "User deleted"}

@api_router.get("/users/{user_id}/history")
async def get_user_history(user_id: str, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager", "city_manager"]))):
    """Get customer history (subscriptions, renewals, revenue)"""
    subscriptions = await db.subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    deliveries = await db.deliveries.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    total_revenue = sum(s.get("amount_paid", 0) for s in subscriptions)
    total_deliveries = len([d for d in deliveries if d.get("status") == "delivered"])
    
    return {
        "subscriptions": subscriptions,
        "total_revenue": total_revenue,
        "total_deliveries": total_deliveries,
        "renewal_count": len(subscriptions)
    }


# ==================== KITCHEN ENDPOINTS ====================

@api_router.post("/kitchens")
async def create_kitchen(request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    body = await request.json()
    kitchen = KitchenBase(**body)
    doc = kitchen.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.kitchens.insert_one(doc)
    
    await log_action(current_user["user_id"], current_user["role"], "create_kitchen", "kitchen", kitchen.kitchen_id, {"city": body.get("city")}, request)
    
    return await db.kitchens.find_one({"kitchen_id": kitchen.kitchen_id}, {"_id": 0})

@api_router.get("/kitchens")
async def get_kitchens(city: Optional[str] = None, include_inactive: bool = False):
    query = {}
    if not include_inactive:
        query["is_active"] = True
    if city:
        query["city"] = city
    return await db.kitchens.find(query, {"_id": 0}).to_list(100)

@api_router.get("/kitchens/{kitchen_id}")
async def get_kitchen(kitchen_id: str):
    kitchen = await db.kitchens.find_one({"kitchen_id": kitchen_id}, {"_id": 0})
    if not kitchen:
        raise HTTPException(status_code=404, detail="Kitchen not found")
    return kitchen

@api_router.put("/kitchens/{kitchen_id}")
async def update_kitchen(kitchen_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Update kitchen - Admin only"""
    body = await request.json()
    body.pop("kitchen_id", None)  # Prevent ID change
    
    await db.kitchens.update_one({"kitchen_id": kitchen_id}, {"$set": body})
    await log_action(current_user["user_id"], current_user["role"], "update_kitchen", "kitchen", kitchen_id, body, request)
    
    return await db.kitchens.find_one({"kitchen_id": kitchen_id}, {"_id": 0})

@api_router.delete("/kitchens/{kitchen_id}")
async def delete_kitchen(kitchen_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Soft delete kitchen - Admin only"""
    await db.kitchens.update_one({"kitchen_id": kitchen_id}, {"$set": {"is_active": False}})
    await log_action(current_user["user_id"], current_user["role"], "delete_kitchen", "kitchen", kitchen_id, {}, request)
    return {"message": "Kitchen deleted"}

# ==================== PLAN ENDPOINTS ====================

@api_router.post("/plans")
async def create_plan(request: Request, current_user: dict = Depends(require_roles(["super_admin"]))):
    body = await request.json()
    
    delivery_days = body.get("delivery_days", 24)
    if delivery_days not in [6, 12, 24]:
        raise HTTPException(status_code=400, detail="Delivery days must be 6, 12, or 24")
    
    # Auto-set validity days based on delivery days
    validity_map = {6: 7, 12: 15, 24: 30}
    validity_days = body.get("validity_days", validity_map.get(delivery_days, 30))
    
    plan = PlanBase(
        name=body.get("name"),
        delivery_days=delivery_days,
        validity_days=validity_days,
        diet_type=body.get("diet_type", "veg"),
        price=body.get("price", 0),
        cost=body.get("cost", 0),
        description=body.get("description"),
        selected_items=body.get("selected_items", [])
    )
    
    # Validate selected items count - can't exceed delivery days
    if len(plan.selected_items) > plan.delivery_days:
        raise HTTPException(status_code=400, detail=f"Cannot select more than {plan.delivery_days} menu items for this plan")
    
    doc = plan.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.plans.insert_one(doc)
    
    await log_action(current_user["user_id"], current_user["role"], "create_plan", "plan", plan.plan_id, body, request)
    
    return await db.plans.find_one({"plan_id": plan.plan_id}, {"_id": 0})

@api_router.get("/plans")
async def get_plans(diet_type: Optional[str] = None, include_inactive: bool = False):
    query = {}
    if not include_inactive:
        query["is_active"] = True
    if diet_type:
        query["diet_type"] = diet_type
    return await db.plans.find(query, {"_id": 0}).to_list(100)

@api_router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    """Get plan by ID with menu items details"""
    plan = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Enrich with menu item details
    if plan.get("selected_items"):
        items_details = []
        for item_id in plan["selected_items"]:
            menu_item = await db.menu_items.find_one({"item_id": item_id}, {"_id": 0})
            if menu_item:
                items_details.append(menu_item)
        plan["items_details"] = items_details
    
    return plan

@api_router.put("/plans/{plan_id}")
async def update_plan(plan_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Update plan - Super Admin and Admin only"""
    body = await request.json()
    body.pop("plan_id", None)  # Prevent ID change
    
    # Validate selected items if provided
    if "selected_items" in body:
        plan = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
        delivery_days = body.get("delivery_days", plan.get("delivery_days", 24))
        if len(body["selected_items"]) > delivery_days:
            raise HTTPException(status_code=400, detail=f"Cannot select more than {delivery_days} items")
        
        # Validate all items exist
        for item_id in body["selected_items"]:
            menu_item = await db.menu_items.find_one({"item_id": item_id}, {"_id": 0})
            if not menu_item:
                raise HTTPException(status_code=400, detail=f"Menu item {item_id} not found")
    
    await db.plans.update_one({"plan_id": plan_id}, {"$set": body})
    await log_action(current_user["user_id"], current_user["role"], "update_plan", "plan", plan_id, body, request)
    return await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})

@api_router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Soft delete plan - Super Admin and Admin only"""
    await db.plans.update_one({"plan_id": plan_id}, {"$set": {"is_active": False}})
    await log_action(current_user["user_id"], current_user["role"], "delete_plan", "plan", plan_id, {}, request)
    return {"message": "Plan deleted"}

# ==================== MENU MANAGEMENT ====================

@api_router.post("/menu-items")
async def create_menu_item(request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "kitchen_manager"]))):
    body = await request.json()
    item = MenuItemBase(**body)
    await db.menu_items.insert_one(item.model_dump())
    await log_action(current_user["user_id"], current_user["role"], "create_menu_item", "menu_item", item.item_id, body, request)
    return await db.menu_items.find_one({"item_id": item.item_id}, {"_id": 0})

@api_router.get("/menu-items")
async def get_menu_items(category: Optional[str] = None, diet_type: Optional[str] = None, include_inactive: bool = False):
    query = {}
    if not include_inactive:
        query["is_active"] = True
    if category:
        query["category"] = category
    if diet_type:
        query["diet_type"] = diet_type
    return await db.menu_items.find(query, {"_id": 0}).to_list(500)

@api_router.get("/menu-items/{item_id}")
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item

@api_router.put("/menu-items/{item_id}")
async def update_menu_item(item_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Update menu item - Super Admin and Admin only"""
    body = await request.json()
    body.pop("item_id", None)  # Prevent ID change
    
    await db.menu_items.update_one({"item_id": item_id}, {"$set": body})
    await log_action(current_user["user_id"], current_user["role"], "update_menu_item", "menu_item", item_id, body, request)
    
    return await db.menu_items.find_one({"item_id": item_id}, {"_id": 0})

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Soft delete menu item - Super Admin and Admin only"""
    await db.menu_items.update_one({"item_id": item_id}, {"$set": {"is_active": False}})
    await log_action(current_user["user_id"], current_user["role"], "delete_menu_item", "menu_item", item_id, {}, request)
    return {"message": "Menu item deleted"}

@api_router.post("/menu-templates")
async def create_menu_template(request: Request, current_user: dict = Depends(require_roles(["super_admin"]))):
    body = await request.json()
    plan_type = body.get("plan_type")
    if plan_type not in PLAN_TYPES:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    template = MenuTemplateBase(
        name=body.get("name"),
        plan_type=plan_type,
        diet_type=body.get("diet_type"),
        total_days=PLAN_TYPES[plan_type]["deliveries"],
        menu_sequence=body.get("menu_sequence", [])
    )
    
    # Check mandatory rules
    categories = [item.get("category") for item in template.menu_sequence]
    template.has_wrap_day = "Wrap" in categories
    template.has_sandwich_day = "Sandwich" in categories
    template.has_multigrain_day = "Multigrain" in categories
    
    doc = template.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.menu_templates.insert_one(doc)
    
    await log_action(current_user["user_id"], current_user["role"], "create_menu_template", "menu_template", template.template_id, body, request)
    
    return await db.menu_templates.find_one({"template_id": template.template_id}, {"_id": 0})

@api_router.put("/menu-templates/{template_id}/publish")
async def publish_menu_template(template_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin"]))):
    template = await db.menu_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Validate mandatory rules
    if not (template.get("has_wrap_day") and template.get("has_sandwich_day") and template.get("has_multigrain_day")):
        raise HTTPException(status_code=400, detail="Menu must include at least 1 Wrap day, 1 Sandwich day, and 1 Multigrain day")
    
    await db.menu_templates.update_one({"template_id": template_id}, {"$set": {"is_published": True}})
    await log_action(current_user["user_id"], current_user["role"], "publish_menu_template", "menu_template", template_id, {}, request)
    
    return {"message": "Menu template published"}

@api_router.get("/menu-templates")
async def get_menu_templates(plan_type: Optional[str] = None, diet_type: Optional[str] = None):
    query = {}
    if plan_type:
        query["plan_type"] = plan_type
    if diet_type:
        query["diet_type"] = diet_type
    return await db.menu_templates.find(query, {"_id": 0}).to_list(100)

# ==================== SUBSCRIPTION ENDPOINTS ====================

@api_router.post("/subscriptions")
async def create_subscription(request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager", "sales_executive"]))):
    body = await request.json()
    
    plan = await db.plans.find_one({"plan_id": body.get("plan_id")}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    user = await db.users.find_one({"user_id": body.get("user_id")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    start_date = datetime.fromisoformat(body.get("start_date").replace("Z", "+00:00"))
    
    subscription = SubscriptionBase(
        user_id=body.get("user_id"),
        kitchen_id=body.get("kitchen_id"),
        plan_id=body.get("plan_id"),
        plan_type=body.get("plan_type", plan.get("plan_type", "monthly")),
        diet_type=body.get("diet_type", plan.get("diet_type", "veg")),
        meal_periods=body.get("meal_periods", ["lunch"]),
        delivery_days=body.get("delivery_days", user.get("delivery_days", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"])),
        start_date=start_date,
        total_deliveries=body.get("total_deliveries", plan.get("delivery_days", plan.get("total_deliveries", 24))),
        remaining_deliveries=body.get("remaining_deliveries", plan.get("delivery_days", plan.get("total_deliveries", 24))),
        amount_paid=body.get("amount_paid", plan.get("price", 0)),
        next_renewal_amount=plan.get("price", 0),
        created_by=current_user["user_id"]
    )
    
    doc = subscription.model_dump()
    doc["start_date"] = doc["start_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.subscriptions.insert_one(doc)
    
    # Generate deliveries
    await generate_subscription_deliveries(subscription, user)
    
    # Create notification for admins/sales managers to assign delivery boy
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": None,  # Will be sent to admins/sales managers
        "target_roles": ["super_admin", "admin", "sales_manager", "city_manager"],
        "title": "New Subscription - Assign Delivery Boy",
        "message": f"New subscription created for {user.get('name', 'Customer')}. Please assign a delivery boy.",
        "type": "action_required",
        "action_type": "assign_delivery_boy",
        "reference_id": subscription.subscription_id,
        "reference_type": "subscription",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    await log_action(current_user["user_id"], current_user["role"], "create_subscription", "subscription", subscription.subscription_id, body, request)
    
    return await db.subscriptions.find_one({"subscription_id": subscription.subscription_id}, {"_id": 0})

async def generate_subscription_deliveries(subscription: SubscriptionBase, customer: dict):
    """Generate delivery records following menu sequence (not calendar)"""
    current_date = subscription.start_date
    delivery_day = 1
    
    day_map = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    allowed_weekdays = [day_map[d.lower()] for d in subscription.delivery_days if d.lower() in day_map]
    
    while delivery_day <= subscription.total_deliveries:
        weekday = current_date.weekday()
        
        # Skip Sunday (holiday)
        if weekday == 6:
            current_date += timedelta(days=1)
            continue
        
        # Check if this weekday is in customer's delivery days
        if weekday not in allowed_weekdays:
            current_date += timedelta(days=1)
            continue
        
        # Create delivery for each meal period
        for meal_period in subscription.meal_periods:
            delivery = DeliveryBase(
                subscription_id=subscription.subscription_id,
                user_id=subscription.user_id,
                kitchen_id=subscription.kitchen_id,
                delivery_date=current_date.strftime("%Y-%m-%d"),
                delivery_day_number=delivery_day,
                meal_period=meal_period,
                address=customer.get("address", ""),
                location=customer.get("google_location", {"lat": 0, "lng": 0}),
                allergy_notes=", ".join(customer.get("allergies", []))
            )
            doc = delivery.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.deliveries.insert_one(doc)
        
        delivery_day += 1
        current_date += timedelta(days=1)

@api_router.get("/subscriptions")
async def get_subscriptions(user_id: Optional[str] = None, kitchen_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    if current_user["role"] == "customer":
        query["user_id"] = current_user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if kitchen_id:
        query["kitchen_id"] = kitchen_id
    if status:
        query["status"] = status
    
    return await db.subscriptions.find(query, {"_id": 0}).to_list(1000)

@api_router.get("/subscriptions/{subscription_id}")
async def get_subscription(subscription_id: str, current_user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub

@api_router.put("/subscriptions/{subscription_id}")
async def update_subscription(subscription_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager"]))):
    """Update subscription - change diet type, delivery boy, etc."""
    body = await request.json()
    
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Fields that can be updated
    update_fields = {}
    if "diet_type" in body:
        update_fields["diet_type"] = body["diet_type"]
    if "meal_periods" in body:
        update_fields["meal_periods"] = body["meal_periods"]
    if "delivery_days" in body:
        update_fields["delivery_days"] = body["delivery_days"]
    if "assigned_delivery_boy_id" in body:
        update_fields["assigned_delivery_boy_id"] = body["assigned_delivery_boy_id"]
        # Also update all pending deliveries with this delivery boy
        await db.deliveries.update_many(
            {"subscription_id": subscription_id, "status": "scheduled"},
            {"$set": {"delivery_boy_id": body["assigned_delivery_boy_id"]}}
        )
    if "kitchen_id" in body:
        update_fields["kitchen_id"] = body["kitchen_id"]
    if "status" in body:
        update_fields["status"] = body["status"]
    
    if update_fields:
        await db.subscriptions.update_one({"subscription_id": subscription_id}, {"$set": update_fields})
        await log_action(current_user["user_id"], current_user["role"], "update_subscription", "subscription", subscription_id, body, request)
    
    return await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})

@api_router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(subscription_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager"]))):
    """Cancel/Delete subscription"""
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Soft delete - mark as cancelled
    await db.subscriptions.update_one(
        {"subscription_id": subscription_id}, 
        {"$set": {"status": "cancelled"}}
    )
    
    # Cancel all pending deliveries
    await db.deliveries.update_many(
        {"subscription_id": subscription_id, "status": "scheduled"},
        {"$set": {"status": "cancelled", "cancellation_reason": "Subscription cancelled"}}
    )
    
    await log_action(current_user["user_id"], current_user["role"], "delete_subscription", "subscription", subscription_id, {}, request)
    
    return {"message": "Subscription cancelled"}

@api_router.put("/subscriptions/{subscription_id}/assign-delivery-boy")
async def assign_delivery_boy_to_subscription(subscription_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager", "city_manager"]))):
    """Assign delivery boy to a customer's subscription"""
    body = await request.json()
    delivery_boy_id = body.get("delivery_boy_id")
    
    if not delivery_boy_id:
        raise HTTPException(status_code=400, detail="delivery_boy_id is required")
    
    # Verify delivery boy exists
    delivery_boy = await db.users.find_one({"user_id": delivery_boy_id, "role": "delivery_boy"}, {"_id": 0})
    if not delivery_boy:
        raise HTTPException(status_code=404, detail="Delivery boy not found")
    
    # Update subscription
    await db.subscriptions.update_one(
        {"subscription_id": subscription_id},
        {"$set": {"assigned_delivery_boy_id": delivery_boy_id}}
    )
    
    # Update all pending deliveries
    await db.deliveries.update_many(
        {"subscription_id": subscription_id, "status": "scheduled"},
        {"$set": {"delivery_boy_id": delivery_boy_id}}
    )
    
    await log_action(current_user["user_id"], current_user["role"], "assign_delivery_boy", "subscription", subscription_id, body, request)
    
    return {"message": f"Delivery boy assigned successfully", "delivery_boy": delivery_boy.get("name")}

# ==================== DELIVERY ENDPOINTS ====================

@api_router.get("/deliveries")
async def get_deliveries(
    user_id: Optional[str] = None,
    kitchen_id: Optional[str] = None,
    delivery_boy_id: Optional[str] = None,
    date: Optional[str] = None,
    meal_period: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == "customer":
        query["user_id"] = current_user["user_id"]
    elif current_user["role"] == "delivery_boy":
        query["delivery_boy_id"] = current_user["user_id"]
        if not date:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    elif current_user["role"] == "kitchen_manager":
        query["kitchen_id"] = current_user.get("kitchen_id")
    else:
        if user_id:
            query["user_id"] = user_id
        if delivery_boy_id:
            query["delivery_boy_id"] = delivery_boy_id
    
    if kitchen_id:
        query["kitchen_id"] = kitchen_id
    if date:
        query["delivery_date"] = date
    if meal_period:
        query["meal_period"] = meal_period
    if status:
        query["status"] = status
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with customer data
    for d in deliveries:
        customer = await db.users.find_one({"user_id": d["user_id"]}, {"_id": 0, "password_hash": 0})
        if customer:
            d["customer"] = {
                "name": customer.get("name"),
                "phone": customer.get("phone"),
                "alternate_phone": customer.get("alternate_phone"),
                "address": customer.get("address"),
                "allergies": customer.get("allergies", [])
            }
    
    return deliveries

@api_router.post("/deliveries")
async def create_delivery(request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager", "city_manager"]))):
    """Create a delivery for a customer subscription"""
    body = await request.json()
    
    delivery = DeliveryBase(
        subscription_id=body.get("subscription_id"),
        user_id=body.get("user_id"),
        kitchen_id=body.get("kitchen_id"),
        delivery_boy_id=body.get("delivery_boy_id"),
        delivery_date=body.get("delivery_date"),
        delivery_day_number=body.get("delivery_day_number", 1),
        meal_period=body.get("meal_period", "lunch"),
        menu_items=body.get("menu_items", []),
        status=body.get("status", "scheduled"),
        address=body.get("address", ""),
        location=body.get("location", {"lat": 0, "lng": 0})
    )
    
    doc = delivery.model_dump()
    await db.deliveries.insert_one(doc)
    
    await log_action(current_user["user_id"], current_user["role"], "create_delivery", "delivery", delivery.delivery_id, body, request)
    
    return await db.deliveries.find_one({"delivery_id": delivery.delivery_id}, {"_id": 0})

@api_router.get("/deliveries/today")
async def get_todays_deliveries(kitchen_id: str, current_user: dict = Depends(require_roles(["super_admin", "admin", "city_manager", "kitchen_manager", "delivery_boy"]))):
    """Get all today's deliveries for kitchen - shows all meal periods"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {"kitchen_id": kitchen_id, "delivery_date": today}
    
    if current_user["role"] == "delivery_boy":
        query["delivery_boy_id"] = current_user["user_id"]
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(500)
    
    # Enrich and group by meal period
    result = {"breakfast": [], "lunch": [], "dinner": []}
    for d in deliveries:
        customer = await db.users.find_one({"user_id": d["user_id"]}, {"_id": 0, "password_hash": 0})
        d["customer"] = customer
        result[d["meal_period"]].append(d)
    
    return result

@api_router.put("/deliveries/{delivery_id}/status")
async def update_delivery_status(delivery_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "city_manager", "kitchen_manager", "delivery_boy"]))):
    body = await request.json()
    new_status = body.get("status")
    
    delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    updates = {"status": new_status}
    
    if new_status == "ready":
        updates["marked_ready_at"] = datetime.now(timezone.utc).isoformat()
        # Send notification
        await send_notification(delivery["user_id"], "Food Ready!", f"Your {delivery['meal_period']} is ready and will be delivered soon.", "food_ready", delivery_id)
    
    elif new_status == "out_for_delivery":
        updates["dispatched_at"] = datetime.now(timezone.utc).isoformat()
        await send_notification(delivery["user_id"], "Out for Delivery", f"Your {delivery['meal_period']} is on the way!", "delivery_update", delivery_id)
    
    elif new_status == "delivered":
        updates["delivered_at"] = datetime.now(timezone.utc).isoformat()
        await send_notification(delivery["user_id"], "Delivered!", f"Your {delivery['meal_period']} has been delivered. Enjoy!", "delivered", delivery_id)
        
        # Update subscription
        await db.subscriptions.update_one(
            {"subscription_id": delivery["subscription_id"]},
            {"$inc": {"completed_deliveries": 1, "remaining_deliveries": -1}}
        )
        
        # Check if renewal reminder needed
        sub = await db.subscriptions.find_one({"subscription_id": delivery["subscription_id"]}, {"_id": 0})
        if sub and sub.get("remaining_deliveries", 0) == 3:
            await send_notification(delivery["user_id"], "Renewal Reminder", "You have only 3 deliveries left! Renew now to continue enjoying healthy meals.", "renewal_reminder")
    
    await db.deliveries.update_one({"delivery_id": delivery_id}, {"$set": updates})
    await log_action(current_user["user_id"], current_user["role"], "update_delivery_status", "delivery", delivery_id, {"status": new_status}, request)
    
    return await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})

@api_router.put("/deliveries/{delivery_id}/cancel")
async def cancel_delivery(delivery_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Cancel delivery - auto extends subscription"""
    body = await request.json()
    
    delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Check cancellation cutoff
    if current_user["role"] == "customer" and not can_cancel_delivery(delivery["meal_period"]):
        raise HTTPException(status_code=400, detail=f"Cannot cancel {delivery['meal_period']} after cutoff time")
    
    updates = {
        "status": "cancelled",
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancelled_by": current_user["user_id"],
        "cancellation_reason": body.get("reason"),
        "auto_extended": True
    }
    
    await db.deliveries.update_one({"delivery_id": delivery_id}, {"$set": updates})
    
    # Auto-extend subscription
    await db.subscriptions.update_one(
        {"subscription_id": delivery["subscription_id"]},
        {"$inc": {"extended_deliveries": 1, "total_deliveries": 1}}
    )
    
    await log_action(current_user["user_id"], current_user["role"], "cancel_delivery", "delivery", delivery_id, body, request)
    
    return {"message": "Delivery cancelled and subscription extended"}

@api_router.put("/deliveries/{delivery_id}/request-reschedule")
async def request_reschedule_delivery(delivery_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Request alternate delivery time for same day"""
    body = await request.json()
    new_time_window = body.get("time_window")  # e.g., "14:00-15:00"
    
    delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Check if request is for same day
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if delivery["delivery_date"] != today:
        raise HTTPException(status_code=400, detail="Reschedule only available for today's deliveries")
    
    # Validate time window - must be at least 1 hour from now
    if new_time_window:
        start_hour = int(new_time_window.split(":")[0])
        current_hour = datetime.now(timezone.utc).hour
        if start_hour <= current_hour + 1:
            raise HTTPException(status_code=400, detail="New delivery time must be at least 1 hour from now")
    
    # Create alternate request (needs admin approval)
    alt_request = {
        "request_id": f"req_{uuid.uuid4().hex[:12]}",
        "user_id": current_user["user_id"],
        "delivery_id": delivery_id,
        "request_type": "reschedule",
        "original_date": delivery["delivery_date"],
        "new_time_window": new_time_window,
        "reason": body.get("reason", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alternate_requests.insert_one(alt_request)
    
    # Update delivery with pending reschedule
    await db.deliveries.update_one(
        {"delivery_id": delivery_id}, 
        {"$set": {"reschedule_requested": True, "requested_time_window": new_time_window}}
    )
    
    await log_action(current_user["user_id"], current_user["role"], "request_reschedule", "delivery", delivery_id, body, request)
    
    return {"message": "Reschedule request submitted for approval", "request_id": alt_request["request_id"]}

@api_router.put("/deliveries/{delivery_id}/assign")
async def assign_delivery(delivery_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "city_manager", "kitchen_manager"]))):
    body = await request.json()
    delivery_boy_id = body.get("delivery_boy_id")
    
    await db.deliveries.update_one({"delivery_id": delivery_id}, {"$set": {"delivery_boy_id": delivery_boy_id}})
    await log_action(current_user["user_id"], current_user["role"], "assign_delivery", "delivery", delivery_id, body, request)
    
    return await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})

# ==================== ALTERNATIVE DELIVERY REQUESTS ====================

@api_router.post("/delivery-requests")
async def create_delivery_request(request: Request, current_user: dict = Depends(get_current_user)):
    """Customer requests to skip or reschedule delivery"""
    body = await request.json()
    
    req = AlternativeDeliveryRequest(
        delivery_id=body.get("delivery_id"),
        user_id=current_user["user_id"],
        request_type=body.get("request_type"),
        original_date=body.get("original_date"),
        requested_date=body.get("requested_date"),
        reason=body.get("reason")
    )
    
    doc = req.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.delivery_requests.insert_one(doc)
    
    await log_action(current_user["user_id"], current_user["role"], "create_delivery_request", "delivery_request", req.request_id, body, request)
    
    return await db.delivery_requests.find_one({"request_id": req.request_id}, {"_id": 0})

@api_router.get("/delivery-requests")
async def get_delivery_requests(status: Optional[str] = None, current_user: dict = Depends(require_roles(["super_admin", "admin", "city_manager"]))):
    query = {}
    if status:
        query["status"] = status
    return await db.delivery_requests.find(query, {"_id": 0}).to_list(500)

@api_router.put("/delivery-requests/{request_id}")
async def review_delivery_request(request_id: str, request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "city_manager"]))):
    """Approve or reject delivery request"""
    body = await request.json()
    action = body.get("action")  # approve, reject
    
    req = await db.delivery_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    updates = {
        "status": "approved" if action == "approve" else "rejected",
        "reviewed_by": current_user["user_id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.delivery_requests.update_one({"request_id": request_id}, {"$set": updates})
    
    if action == "approve":
        if req["request_type"] == "skip":
            # Cancel the delivery and auto-extend
            await db.deliveries.update_one(
                {"delivery_id": req["delivery_id"]},
                {"$set": {"status": "skipped", "auto_extended": True}}
            )
            # Get subscription and extend
            delivery = await db.deliveries.find_one({"delivery_id": req["delivery_id"]}, {"_id": 0})
            if delivery:
                await db.subscriptions.update_one(
                    {"subscription_id": delivery["subscription_id"]},
                    {"$inc": {"extended_deliveries": 1, "total_deliveries": 1}}
                )
    
    await log_action(current_user["user_id"], current_user["role"], "review_delivery_request", "delivery_request", request_id, body, request)
    
    return await db.delivery_requests.find_one({"request_id": request_id}, {"_id": 0})

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    # Get notifications for this user OR for their role
    query = {
        "$or": [
            {"user_id": current_user["user_id"]},
            {"target_roles": current_user["role"]}
        ]
    }
    return await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"notification_id": notification_id}, 
        {"$set": {"is_read": True, f"read_by.{current_user['user_id']}": True}}
    )
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    query = {
        "$or": [
            {"user_id": current_user["user_id"]},
            {"target_roles": current_user["role"]}
        ]
    }
    await db.notifications.update_many(query, {"$set": {"is_read": True}})
    return {"message": "All marked as read"}

# ==================== BANNERS ====================

@api_router.post("/banners")
async def create_banner(request: Request, current_user: dict = Depends(require_roles(["super_admin"]))):
    body = await request.json()
    banner = BannerBase(**body)
    doc = banner.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.banners.insert_one(doc)
    return await db.banners.find_one({"banner_id": banner.banner_id}, {"_id": 0})

@api_router.get("/banners")
async def get_banners():
    return await db.banners.find({"is_active": True}, {"_id": 0}).sort("display_order", 1).to_list(10)

# ==================== REPORTS & ANALYTICS ====================

@api_router.get("/reports/subscriptions")
async def get_subscription_report(status: Optional[str] = None, city: Optional[str] = None, current_user: dict = Depends(require_roles(["super_admin", "admin", "city_manager"]))):
    """Get subscription reports - live, paused, expired"""
    pipeline = []
    
    match = {}
    if status:
        match["status"] = status
    if match:
        pipeline.append({"$match": match})
    
    # Join with users to get city
    pipeline.append({"$lookup": {"from": "users", "localField": "user_id", "foreignField": "user_id", "as": "user"}})
    pipeline.append({"$unwind": "$user"})
    
    if city:
        pipeline.append({"$match": {"user.city": city}})
    
    pipeline.append({"$project": {"_id": 0}})
    
    results = await db.subscriptions.aggregate(pipeline).to_list(1000)
    
    summary = {
        "total": len(results),
        "active": len([r for r in results if r.get("status") == "active"]),
        "paused": len([r for r in results if r.get("status") == "paused"]),
        "expired": len([r for r in results if r.get("status") == "expired"]),
        "subscriptions": results
    }
    return summary

@api_router.get("/reports/expiring")
async def get_expiring_subscriptions(days: int = 3, current_user: dict = Depends(require_roles(["super_admin", "admin", "sales_manager"]))):
    """Get subscriptions expiring in next N days (based on remaining deliveries)"""
    # Subscriptions with 3 or fewer remaining deliveries
    subs = await db.subscriptions.find(
        {"status": "active", "remaining_deliveries": {"$lte": days}},
        {"_id": 0}
    ).to_list(500)
    
    # Enrich with user data
    for s in subs:
        user = await db.users.find_one({"user_id": s["user_id"]}, {"_id": 0, "password_hash": 0, "name": 1, "phone": 1})
        s["user"] = user
    
    return subs

@api_router.get("/reports/revenue")
async def get_revenue_report(period: str = "daily", current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    """Get revenue report - daily, weekly, monthly"""
    subs = await db.subscriptions.find({}, {"_id": 0, "amount_paid": 1, "created_at": 1}).to_list(10000)
    
    total_revenue = sum(s.get("amount_paid", 0) for s in subs)
    
    return {
        "period": period,
        "total_revenue": total_revenue,
        "subscription_count": len(subs)
    }

@api_router.get("/reports/delivery-boys")
async def get_delivery_boy_report(date: Optional[str] = None, current_user: dict = Depends(require_roles(["super_admin", "admin", "city_manager"]))):
    """Get delivery boy activity - logged in, deliveries completed"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    delivery_boys = await db.users.find({"role": "delivery_boy", "is_active": True}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    for db_user in delivery_boys:
        # Get today's deliveries
        deliveries = await db.deliveries.find(
            {"delivery_boy_id": db_user["user_id"], "delivery_date": date},
            {"_id": 0}
        ).to_list(100)
        
        db_user["total_deliveries"] = len(deliveries)
        db_user["completed"] = len([d for d in deliveries if d.get("status") == "delivered"])
        db_user["pending"] = len([d for d in deliveries if d.get("status") not in ["delivered", "cancelled"]])
    
    return delivery_boys

# ==================== AUDIT LOGS ====================

@api_router.get("/audit-logs")
async def get_audit_logs(entity_type: Optional[str] = None, user_id: Optional[str] = None, limit: int = 100, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if user_id:
        query["user_id"] = user_id
    
    return await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)

# ==================== RAZORPAY PAYMENT ====================

@api_router.post("/payments/create-order")
async def create_payment_order(request: Request, current_user: dict = Depends(get_current_user)):
    """Create Razorpay payment order"""
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    
    body = await request.json()
    amount = body.get("amount")  # In paise
    subscription_id = body.get("subscription_id")
    
    order = razorpay_client.order.create({
        "amount": amount,
        "currency": "INR",
        "payment_capture": 1,
        "notes": {"subscription_id": subscription_id, "user_id": current_user["user_id"]}
    })
    
    # Store order
    await db.payment_orders.insert_one({
        "order_id": order["id"],
        "user_id": current_user["user_id"],
        "subscription_id": subscription_id,
        "amount": amount,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return order

@api_router.post("/payments/verify")
async def verify_payment(request: Request):
    """Verify Razorpay payment"""
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    
    body = await request.json()
    
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": body.get("razorpay_order_id"),
            "razorpay_payment_id": body.get("razorpay_payment_id"),
            "razorpay_signature": body.get("razorpay_signature")
        })
        
        # Update order status
        await db.payment_orders.update_one(
            {"order_id": body.get("razorpay_order_id")},
            {"$set": {"status": "paid", "payment_id": body.get("razorpay_payment_id")}}
        )
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")

# ==================== IMAGE UPLOAD ====================

import base64

@api_router.post("/upload-image")
async def upload_image(request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin", "kitchen_manager"]))):
    """Upload image and return URL (stores as base64 data URL)"""
    body = await request.json()
    image_data = body.get("image_data")  # Base64 encoded image
    
    if not image_data:
        raise HTTPException(status_code=400, detail="No image data provided")
    
    # Store as data URL (in production, use cloud storage)
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    
    # Save to database
    await db.images.insert_one({
        "image_id": image_id,
        "data": image_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    })
    
    # Return URL that can be used to fetch the image
    return {"image_url": f"/api/images/{image_id}", "image_id": image_id}

@api_router.get("/images/{image_id}")
async def get_image(image_id: str):
    """Get image by ID"""
    image = await db.images.find_one({"image_id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Return base64 data
    return {"image_data": image.get("data")}

# ==================== CONSTANTS ENDPOINTS ====================

@api_router.get("/constants")
async def get_constants():
    """Get all system constants for dropdowns"""
    return {
        "roles": ROLES,
        "cities": CITIES,
        "allergies": ALLERGIES,
        "lifestyle_diseases": LIFESTYLE_DISEASES,
        "meal_categories": MEAL_CATEGORIES,
        "diet_types": DIET_TYPES,
        "plan_types": PLAN_TYPES,
        "meal_periods": MEAL_PERIODS,
        "subscription_goals": SUBSCRIPTION_GOALS,
        "job_types": JOB_TYPES,
        "physical_activity": PHYSICAL_ACTIVITY,
        "accommodation_types": ACCOMMODATION_TYPES,
        "cancellation_cutoffs": {k: v.isoformat() for k, v in CANCELLATION_CUTOFFS.items()},
        "delivery_time_windows": [
            "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", 
            "13:00-14:00", "14:00-15:00", "18:00-19:00", "19:00-20:00", "20:00-21:00"
        ]
    }

@api_router.get("/announcements")
async def get_announcements():
    """Get active announcements"""
    return await db.announcements.find({"is_active": True}, {"_id": 0}).sort("created_at", -1).to_list(10)

@api_router.post("/announcements")
async def create_announcement(request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    body = await request.json()
    announcement = AnnouncementBase(**body)
    doc = announcement.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.announcements.insert_one(doc)
    return await db.announcements.find_one({"announcement_id": announcement.announcement_id}, {"_id": 0})

@api_router.get("/shop-items")
async def get_shop_items():
    """Get shop items for customers"""
    return await db.shop_items.find({"is_active": True}, {"_id": 0}).to_list(100)

@api_router.post("/shop-items")
async def create_shop_item(request: Request, current_user: dict = Depends(require_roles(["super_admin", "admin"]))):
    body = await request.json()
    item = ShopItemBase(**body)
    doc = item.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.shop_items.insert_one(doc)
    return await db.shop_items.find_one({"item_id": item.item_id}, {"_id": 0})

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "FoodFleet API v2.0", "status": "running"}

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
