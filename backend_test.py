#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class DietMealAPITester:
    def __init__(self, base_url="https://foodfleet-admin.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.current_user = None
        self.session_token = None
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

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use session cookies for authentication
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
            success and 'FoodFleet API' in result.get('message', ''),
            f"Status: {status}, Response: {result}"
        )

    def test_constants_endpoint(self):
        """Test constants endpoint - critical for system"""
        success, status, result = self.make_request('GET', 'constants')
        
        if success:
            required_keys = ['roles', 'cities', 'allergies', 'lifestyle_diseases', 'meal_categories', 'plan_types']
            missing_keys = [key for key in required_keys if key not in result]
            if missing_keys:
                return self.log_test(
                    "Get system constants", 
                    False,
                    f"Missing keys: {missing_keys}"
                )
        
        return self.log_test(
            "Get system constants", 
            success and isinstance(result, dict),
            f"Status: {status}, Keys: {list(result.keys()) if isinstance(result, dict) else 'None'}"
        )

    def test_plans_endpoint(self):
        """Test plans endpoint"""
        success, status, result = self.make_request('GET', 'plans')
        return self.log_test(
            "Get plans", 
            success and isinstance(result, list),
            f"Status: {status}, Plans found: {len(result) if isinstance(result, list) else 0}"
        )

    def test_menu_items_endpoint(self):
        """Test menu items endpoint"""
        success, status, result = self.make_request('GET', 'menu-items')
        return self.log_test(
            "Get menu items", 
            success and isinstance(result, list),
            f"Status: {status}, Menu items found: {len(result) if isinstance(result, list) else 0}"
        )

    def test_login(self, phone, password, expected_role):
        """Test login with specific credentials"""
        login_data = {"phone": phone, "password": password}
        
        success, status, result = self.make_request('POST', 'auth/login', login_data)
        
        if success and result.get('user_id'):
            self.current_user = result
            role_match = result.get('role') == expected_role
            return self.log_test(
                f"Login as {expected_role} ({phone})", 
                success and role_match,
                f"Status: {status}, Role: {result.get('role')}, Expected: {expected_role}"
            )
        
        return self.log_test(
            f"Login as {expected_role} ({phone})", 
            False,
            f"Status: {status}, Response: {result}"
        )

    def test_auth_me(self):
        """Test auth/me endpoint"""
        success, status, result = self.make_request('GET', 'auth/me')
        
        if success and self.current_user:
            role_match = result.get('role') == self.current_user.get('role')
            return self.log_test(
                "Get current user (/auth/me)", 
                success and role_match,
                f"Status: {status}, Role: {result.get('role')}"
            )
        
        return self.log_test(
            "Get current user (/auth/me)", 
            False,
            f"Status: {status}, Current user: {bool(self.current_user)}"
        )

    def test_role_specific_access(self):
        """Test role-specific endpoints based on current user"""
        if not self.current_user:
            return self.log_test("Role-specific access", False, "No user logged in")
            
        role = self.current_user.get('role')
        
        if role == 'super_admin':
            # Test super admin endpoints
            success1, status1, result1 = self.make_request('GET', 'users')
            success2, status2, result2 = self.make_request('GET', 'audit-logs?limit=10')
            
            return self.log_test(
                "Super Admin access (users & audit logs)", 
                success1 and success2,
                f"Users: {status1}, Audit: {status2}"
            )
            
        elif role == 'kitchen_manager':
            # Test kitchen manager endpoints - need kitchen_id
            kitchen_id = self.current_user.get('kitchen_id', 'test_kitchen')
            success, status, result = self.make_request('GET', f'deliveries/today?kitchen_id={kitchen_id}')
            
            return self.log_test(
                "Kitchen Manager access (today's deliveries)", 
                success,
                f"Status: {status}, Kitchen ID: {kitchen_id}"
            )
            
        elif role == 'customer':
            # Test customer endpoints
            success1, status1, result1 = self.make_request('GET', 'subscriptions')
            success2, status2, result2 = self.make_request('GET', 'notifications')
            
            return self.log_test(
                "Customer access (subscriptions & notifications)", 
                success1 and success2,
                f"Subscriptions: {status1}, Notifications: {status2}"
            )
            
        elif role == 'delivery_boy':
            # Test delivery boy endpoints
            success, status, result = self.make_request('GET', 'deliveries')
            
            return self.log_test(
                "Delivery Boy access (deliveries)", 
                success,
                f"Status: {status}"
            )
        
        return self.log_test(f"Role access for {role}", True, "No specific tests for this role")

    def test_logout(self):
        """Test logout"""
        success, status, result = self.make_request('POST', 'auth/logout')
        self.current_user = None
        
        return self.log_test(
            "Logout", 
            success,
            f"Status: {status}"
        )

    def run_all_tests(self):
        """Run all API tests based on review request"""
        print("🚀 Starting Diet Meal Subscription API Tests")
        print("=" * 60)
        
        # Test basic endpoints first
        print("\n📋 Testing Basic Endpoints...")
        self.test_root_endpoint()
        self.test_constants_endpoint()
        self.test_plans_endpoint()
        self.test_menu_items_endpoint()
        
        # Test authentication for each role from review request
        print("\n🔐 Testing Authentication & Role-based Access...")
        
        test_credentials = [
            ("9000000001", "admin123", "super_admin"),
            ("9000000007", "admin123", "kitchen_manager"), 
            ("9000000009", "admin123", "delivery_boy"),
            ("9000000011", "admin123", "customer")
        ]
        
        for phone, password, expected_role in test_credentials:
            print(f"\n--- Testing {expected_role.replace('_', ' ').title()} ({phone}) ---")
            
            if self.test_login(phone, password, expected_role):
                self.test_auth_me()
                self.test_role_specific_access()
                self.test_logout()
            else:
                print(f"❌ Failed to login as {expected_role}")
        
        # Print final results
        print("\n" + "=" * 60)
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
    tester = DietMealAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())