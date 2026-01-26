#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class FoodFleetAPITester:
    def __init__(self, base_url="https://foodfleet-10.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.customer_token = None
        self.kitchen_staff_token = None
        self.delivery_boy_token = None
        self.test_data = {}

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        return success

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make API request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            result = {}
            
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    result = response.json()
                except:
                    result = {}
            
            return success, response.status_code, result
            
        except Exception as e:
            return False, 0, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, status, result = self.make_request('GET', '')
        return self.log_test(
            "Root API endpoint", 
            success and result.get('message') == 'FoodFleet API',
            f"Status: {status}, Response: {result}"
        )

    def test_cities_endpoint(self):
        """Test cities endpoint"""
        success, status, result = self.make_request('GET', 'cities')
        return self.log_test(
            "Get cities", 
            success and isinstance(result, list),
            f"Status: {status}, Cities: {len(result) if isinstance(result, list) else 0}"
        )

    def test_phone_signup(self):
        """Test phone signup for customer"""
        timestamp = datetime.now().strftime("%H%M%S")
        signup_data = {
            "name": f"Test Customer {timestamp}",
            "phone": f"+91987654{timestamp[-4:]}",
            "email": f"customer{timestamp}@test.com",
            "password": "TestPass123!",
            "role": "customer",
            "address": "123 Test Street, Test City",
            "city": "Mumbai",
            "google_location": {"lat": 19.0760, "lng": 72.8777}
        }
        
        success, status, result = self.make_request('POST', 'auth/phone-signup', signup_data, expected_status=200)
        
        if success and result.get('user_id'):
            self.test_data['customer'] = result
            # Extract session token from cookies if available
            if 'session_token' in self.session.cookies:
                self.customer_token = self.session.cookies['session_token']
        
        return self.log_test(
            "Customer phone signup", 
            success and result.get('user_id'),
            f"Status: {status}, User ID: {result.get('user_id', 'None')}"
        )

    def test_login(self):
        """Test login with phone/password"""
        if not self.test_data.get('customer'):
            return self.log_test("Customer login", False, "No customer data from signup")
        
        customer = self.test_data['customer']
        login_data = {
            "phone": customer.get('phone'),
            "password": "TestPass123!"
        }
        
        success, status, result = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and result.get('user_id'):
            # Extract session token from cookies
            if 'session_token' in self.session.cookies:
                self.customer_token = self.session.cookies['session_token']
        
        return self.log_test(
            "Customer login", 
            success and result.get('user_id') == customer.get('user_id'),
            f"Status: {status}, Logged in: {result.get('name', 'Unknown')}"
        )

    def test_get_me(self):
        """Test get current user info"""
        success, status, result = self.make_request('GET', 'auth/me', token=self.customer_token)
        
        return self.log_test(
            "Get current user (/auth/me)", 
            success and result.get('user_id'),
            f"Status: {status}, User: {result.get('name', 'Unknown')}"
        )

    def create_admin_user(self):
        """Create admin user for testing admin endpoints"""
        timestamp = datetime.now().strftime("%H%M%S")
        admin_data = {
            "name": f"Test Admin {timestamp}",
            "phone": f"+91876543{timestamp[-4:]}",
            "email": f"admin{timestamp}@test.com",
            "password": "AdminPass123!",
            "role": "admin"
        }
        
        success, status, result = self.make_request('POST', 'auth/phone-signup', admin_data, expected_status=200)
        
        if success and result.get('user_id'):
            self.test_data['admin'] = result
            # Login as admin to get token
            login_data = {
                "phone": admin_data['phone'],
                "password": "AdminPass123!"
            }
            login_success, login_status, login_result = self.make_request('POST', 'auth/login', login_data)
            if login_success and 'session_token' in self.session.cookies:
                self.admin_token = self.session.cookies['session_token']
        
        return self.log_test(
            "Create admin user", 
            success and result.get('user_id'),
            f"Status: {status}, Admin ID: {result.get('user_id', 'None')}"
        )

    def test_create_kitchen(self):
        """Test kitchen creation (admin only)"""
        if not self.admin_token:
            return self.log_test("Create kitchen", False, "No admin token available")
        
        kitchen_data = {
            "name": "Test Kitchen Mumbai",
            "city": "Mumbai",
            "address": "456 Kitchen Street, Mumbai",
            "location": {"lat": 19.0760, "lng": 72.8777},
            "contact_phone": "+91987654321"
        }
        
        success, status, result = self.make_request('POST', 'kitchens', kitchen_data, token=self.admin_token, expected_status=200)
        
        if success and result.get('kitchen_id'):
            self.test_data['kitchen'] = result
        
        return self.log_test(
            "Create kitchen (admin)", 
            success and result.get('kitchen_id'),
            f"Status: {status}, Kitchen ID: {result.get('kitchen_id', 'None')}"
        )

    def test_get_kitchens(self):
        """Test get all kitchens"""
        success, status, result = self.make_request('GET', 'kitchens')
        
        return self.log_test(
            "Get all kitchens", 
            success and isinstance(result, list),
            f"Status: {status}, Kitchens found: {len(result) if isinstance(result, list) else 0}"
        )

    def test_create_staff_user(self):
        """Test creating staff users (kitchen_staff, delivery_boy)"""
        if not self.admin_token or not self.test_data.get('kitchen'):
            return self.log_test("Create staff users", False, "Missing admin token or kitchen")
        
        timestamp = datetime.now().strftime("%H%M%S")
        kitchen_id = self.test_data['kitchen']['kitchen_id']
        
        # Create kitchen staff
        kitchen_staff_data = {
            "name": f"Test Kitchen Staff {timestamp}",
            "phone": f"+91765432{timestamp[-4:]}",
            "email": f"kitchen{timestamp}@test.com",
            "password": "StaffPass123!",
            "role": "kitchen_staff",
            "kitchen_id": kitchen_id
        }
        
        success1, status1, result1 = self.make_request('POST', 'users', kitchen_staff_data, token=self.admin_token)
        
        # Create delivery boy
        delivery_boy_data = {
            "name": f"Test Delivery Boy {timestamp}",
            "phone": f"+91654321{timestamp[-4:]}",
            "email": f"delivery{timestamp}@test.com",
            "password": "DeliveryPass123!",
            "role": "delivery_boy",
            "kitchen_id": kitchen_id
        }
        
        success2, status2, result2 = self.make_request('POST', 'users', delivery_boy_data, token=self.admin_token)
        
        if success1 and result1.get('user_id'):
            self.test_data['kitchen_staff'] = result1
        if success2 and result2.get('user_id'):
            self.test_data['delivery_boy'] = result2
        
        return self.log_test(
            "Create staff users", 
            success1 and success2,
            f"Kitchen Staff: {status1}, Delivery Boy: {status2}"
        )

    def test_create_subscription(self):
        """Test creating subscription"""
        if not self.customer_token or not self.test_data.get('customer') or not self.test_data.get('kitchen'):
            return self.log_test("Create subscription", False, "Missing customer token, customer data, or kitchen")
        
        subscription_data = {
            "user_id": self.test_data['customer']['user_id'],
            "kitchen_id": self.test_data['kitchen']['kitchen_id'],
            "plan_type": "weekly",
            "diet_type": "mixed",
            "meals": ["breakfast", "lunch"],
            "delivery_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
            "start_date": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        success, status, result = self.make_request('POST', 'subscriptions', subscription_data, token=self.customer_token)
        
        if success and result.get('subscription_id'):
            self.test_data['subscription'] = result
        
        return self.log_test(
            "Create subscription", 
            success and result.get('subscription_id'),
            f"Status: {status}, Subscription ID: {result.get('subscription_id', 'None')}"
        )

    def test_get_subscriptions(self):
        """Test get user subscriptions"""
        success, status, result = self.make_request('GET', 'subscriptions', token=self.customer_token)
        
        return self.log_test(
            "Get user subscriptions", 
            success and isinstance(result, list),
            f"Status: {status}, Subscriptions: {len(result) if isinstance(result, list) else 0}"
        )

    def test_pause_subscription(self):
        """Test pausing subscription deliveries"""
        if not self.test_data.get('subscription'):
            return self.log_test("Pause subscription", False, "No subscription available")
        
        subscription_id = self.test_data['subscription']['subscription_id']
        pause_dates = [(datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")]
        
        success, status, result = self.make_request(
            'PUT', 
            f'subscriptions/{subscription_id}/pause', 
            pause_dates, 
            token=self.customer_token
        )
        
        return self.log_test(
            "Pause subscription deliveries", 
            success and result.get('message'),
            f"Status: {status}, Message: {result.get('message', 'None')}"
        )

    def test_get_deliveries(self):
        """Test get user deliveries"""
        success, status, result = self.make_request('GET', 'deliveries', token=self.customer_token)
        
        return self.log_test(
            "Get user deliveries", 
            success and isinstance(result, list),
            f"Status: {status}, Deliveries: {len(result) if isinstance(result, list) else 0}"
        )

    def test_get_notifications(self):
        """Test get user notifications"""
        success, status, result = self.make_request('GET', 'notifications', token=self.customer_token)
        
        return self.log_test(
            "Get user notifications", 
            success and isinstance(result, list),
            f"Status: {status}, Notifications: {len(result) if isinstance(result, list) else 0}"
        )

    def test_kitchen_endpoints_with_staff(self):
        """Test kitchen-specific endpoints"""
        if not self.test_data.get('kitchen_staff'):
            return self.log_test("Kitchen staff endpoints", False, "No kitchen staff user")
        
        # Login as kitchen staff
        kitchen_staff = self.test_data['kitchen_staff']
        login_data = {
            "phone": kitchen_staff.get('phone'),
            "password": "StaffPass123!"
        }
        
        login_success, login_status, login_result = self.make_request('POST', 'auth/login', login_data)
        if not login_success or 'session_token' not in self.session.cookies:
            return self.log_test("Kitchen staff login", False, f"Login failed: {login_status}")
        
        kitchen_token = self.session.cookies['session_token']
        
        # Test today's deliveries
        kitchen_id = self.test_data['kitchen']['kitchen_id']
        success, status, result = self.make_request('GET', f'deliveries/today?kitchen_id={kitchen_id}', token=kitchen_token)
        
        return self.log_test(
            "Kitchen staff - today's deliveries", 
            success and isinstance(result, list),
            f"Status: {status}, Today's deliveries: {len(result) if isinstance(result, list) else 0}"
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting FoodFleet API Tests...")
        print("=" * 50)
        
        # Basic endpoints
        self.test_root_endpoint()
        self.test_cities_endpoint()
        
        # Authentication flow
        self.test_phone_signup()
        self.test_login()
        self.test_get_me()
        
        # Admin operations
        self.create_admin_user()
        self.test_create_kitchen()
        self.test_get_kitchens()
        self.test_create_staff_user()
        
        # Customer operations
        self.test_create_subscription()
        self.test_get_subscriptions()
        self.test_pause_subscription()
        self.test_get_deliveries()
        self.test_get_notifications()
        
        # Kitchen operations
        self.test_kitchen_endpoints_with_staff()
        
        # Summary
        print("=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the logs above.")
            return 1

def main():
    tester = FoodFleetAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())