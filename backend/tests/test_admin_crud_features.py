"""
Test Admin Dashboard CRUD Features:
- Kitchen CRUD with coordinates (lat/lng)
- Staff CRUD with kitchen assignment for delivery boys
- Customer CRUD with kitchen and city assignment
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "9000000002"
ADMIN_PASSWORD = "admin123"

class TestAdminLogin:
    """Test Admin authentication"""
    
    def test_admin_login(self):
        """Test admin login with phone and password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["role"] in ["admin", "super_admin"]
        print(f"✓ Admin login successful - Role: {data['user']['role']}")


class TestKitchenCRUD:
    """Test Kitchen CRUD operations with coordinates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        # Store cookies for subsequent requests
        self.cookies = login_response.cookies
        yield
        # Cleanup - delete test kitchens
        kitchens = self.session.get(f"{BASE_URL}/api/kitchens?include_inactive=true", cookies=self.cookies).json()
        for k in kitchens:
            if k.get("name", "").startswith("TEST_"):
                self.session.delete(f"{BASE_URL}/api/kitchens/{k['kitchen_id']}", cookies=self.cookies)
    
    def test_create_kitchen_with_coordinates(self):
        """Test creating kitchen with lat/lng coordinates"""
        kitchen_data = {
            "name": f"TEST_Kitchen_{uuid.uuid4().hex[:6]}",
            "city": "Kochi",
            "address": "123 Test Street, Kochi",
            "contact_phone": "9876543210",
            "location": {
                "lat": 9.9312,
                "lng": 76.2673
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/kitchens", json=kitchen_data, cookies=self.cookies)
        assert response.status_code == 200, f"Create kitchen failed: {response.text}"
        
        data = response.json()
        assert data["name"] == kitchen_data["name"]
        assert data["city"] == kitchen_data["city"]
        assert "location" in data
        assert data["location"]["lat"] == kitchen_data["location"]["lat"]
        assert data["location"]["lng"] == kitchen_data["location"]["lng"]
        print(f"✓ Kitchen created with coordinates: lat={data['location']['lat']}, lng={data['location']['lng']}")
        
        return data["kitchen_id"]
    
    def test_update_kitchen(self):
        """Test updating kitchen including coordinates"""
        # First create a kitchen
        kitchen_data = {
            "name": f"TEST_Kitchen_Update_{uuid.uuid4().hex[:6]}",
            "city": "Kochi",
            "address": "Original Address",
            "contact_phone": "9876543210",
            "location": {"lat": 9.9312, "lng": 76.2673}
        }
        create_response = self.session.post(f"{BASE_URL}/api/kitchens", json=kitchen_data, cookies=self.cookies)
        assert create_response.status_code == 200
        kitchen_id = create_response.json()["kitchen_id"]
        
        # Update the kitchen
        update_data = {
            "name": f"TEST_Kitchen_Updated_{uuid.uuid4().hex[:6]}",
            "address": "Updated Address",
            "location": {"lat": 10.0123, "lng": 77.1234}
        }
        update_response = self.session.put(f"{BASE_URL}/api/kitchens/{kitchen_id}", json=update_data, cookies=self.cookies)
        assert update_response.status_code == 200, f"Update kitchen failed: {update_response.text}"
        
        updated = update_response.json()
        assert updated["address"] == "Updated Address"
        assert updated["location"]["lat"] == 10.0123
        assert updated["location"]["lng"] == 77.1234
        print(f"✓ Kitchen updated successfully with new coordinates")
    
    def test_delete_kitchen(self):
        """Test soft deleting kitchen"""
        # First create a kitchen
        kitchen_data = {
            "name": f"TEST_Kitchen_Delete_{uuid.uuid4().hex[:6]}",
            "city": "Trivandrum",
            "address": "Delete Test Address",
            "contact_phone": "9876543210",
            "location": {"lat": 8.5241, "lng": 76.9366}
        }
        create_response = self.session.post(f"{BASE_URL}/api/kitchens", json=kitchen_data, cookies=self.cookies)
        assert create_response.status_code == 200
        kitchen_id = create_response.json()["kitchen_id"]
        
        # Delete the kitchen
        delete_response = self.session.delete(f"{BASE_URL}/api/kitchens/{kitchen_id}", cookies=self.cookies)
        assert delete_response.status_code == 200, f"Delete kitchen failed: {delete_response.text}"
        
        # Verify soft delete
        get_response = self.session.get(f"{BASE_URL}/api/kitchens/{kitchen_id}", cookies=self.cookies)
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] == False
        print(f"✓ Kitchen soft deleted successfully")


class TestStaffCRUD:
    """Test Staff CRUD with kitchen assignment for delivery boys"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        self.cookies = login_response.cookies
        
        # Get existing kitchens for assignment
        kitchens_response = self.session.get(f"{BASE_URL}/api/kitchens", cookies=self.cookies)
        self.kitchens = kitchens_response.json()
        yield
        # Cleanup - delete test users
        users = self.session.get(f"{BASE_URL}/api/users", cookies=self.cookies).json()
        for u in users:
            if u.get("name", "").startswith("TEST_"):
                self.session.delete(f"{BASE_URL}/api/users/{u['user_id']}", cookies=self.cookies)
    
    def test_create_delivery_boy_with_kitchen(self):
        """Test creating delivery boy with kitchen assignment"""
        if not self.kitchens:
            pytest.skip("No kitchens available for assignment")
        
        kitchen_id = self.kitchens[0]["kitchen_id"]
        staff_data = {
            "name": f"TEST_DeliveryBoy_{uuid.uuid4().hex[:6]}",
            "phone": f"98765{uuid.uuid4().hex[:5]}",
            "role": "delivery_boy",
            "kitchen_id": kitchen_id
        }
        
        response = self.session.post(f"{BASE_URL}/api/users", json=staff_data, cookies=self.cookies)
        assert response.status_code == 200, f"Create delivery boy failed: {response.text}"
        
        data = response.json()
        assert data["name"] == staff_data["name"]
        assert data["role"] == "delivery_boy"
        assert data["kitchen_id"] == kitchen_id
        assert "generated_password" in data
        print(f"✓ Delivery boy created with kitchen assignment: {kitchen_id}")
        
        return data["user_id"]
    
    def test_create_kitchen_manager_with_kitchen(self):
        """Test creating kitchen manager with kitchen assignment"""
        if not self.kitchens:
            pytest.skip("No kitchens available for assignment")
        
        kitchen_id = self.kitchens[0]["kitchen_id"]
        staff_data = {
            "name": f"TEST_KitchenManager_{uuid.uuid4().hex[:6]}",
            "phone": f"98764{uuid.uuid4().hex[:5]}",
            "role": "kitchen_manager",
            "kitchen_id": kitchen_id
        }
        
        response = self.session.post(f"{BASE_URL}/api/users", json=staff_data, cookies=self.cookies)
        assert response.status_code == 200, f"Create kitchen manager failed: {response.text}"
        
        data = response.json()
        assert data["role"] == "kitchen_manager"
        assert data["kitchen_id"] == kitchen_id
        print(f"✓ Kitchen manager created with kitchen assignment")
    
    def test_update_staff(self):
        """Test updating staff member"""
        if not self.kitchens:
            pytest.skip("No kitchens available for assignment")
        
        # Create staff first
        staff_data = {
            "name": f"TEST_Staff_Update_{uuid.uuid4().hex[:6]}",
            "phone": f"98763{uuid.uuid4().hex[:5]}",
            "role": "delivery_boy",
            "kitchen_id": self.kitchens[0]["kitchen_id"]
        }
        create_response = self.session.post(f"{BASE_URL}/api/users", json=staff_data, cookies=self.cookies)
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Update staff
        update_data = {"name": f"TEST_Staff_Updated_{uuid.uuid4().hex[:6]}"}
        update_response = self.session.put(f"{BASE_URL}/api/users/{user_id}", json=update_data, cookies=self.cookies)
        assert update_response.status_code == 200, f"Update staff failed: {update_response.text}"
        
        updated = update_response.json()
        assert updated["name"] == update_data["name"]
        print(f"✓ Staff updated successfully")
    
    def test_delete_staff(self):
        """Test soft deleting staff member"""
        # Create staff first
        staff_data = {
            "name": f"TEST_Staff_Delete_{uuid.uuid4().hex[:6]}",
            "phone": f"98762{uuid.uuid4().hex[:5]}",
            "role": "delivery_boy"
        }
        create_response = self.session.post(f"{BASE_URL}/api/users", json=staff_data, cookies=self.cookies)
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Delete staff
        delete_response = self.session.delete(f"{BASE_URL}/api/users/{user_id}", cookies=self.cookies)
        assert delete_response.status_code == 200, f"Delete staff failed: {delete_response.text}"
        
        # Verify soft delete
        get_response = self.session.get(f"{BASE_URL}/api/users/{user_id}", cookies=self.cookies)
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] == False
        print(f"✓ Staff soft deleted successfully")


class TestCustomerCRUD:
    """Test Customer CRUD with kitchen and city assignment"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        self.cookies = login_response.cookies
        
        # Get existing kitchens for assignment
        kitchens_response = self.session.get(f"{BASE_URL}/api/kitchens", cookies=self.cookies)
        self.kitchens = kitchens_response.json()
        yield
        # Cleanup - delete test users
        users = self.session.get(f"{BASE_URL}/api/users", cookies=self.cookies).json()
        for u in users:
            if u.get("name", "").startswith("TEST_"):
                self.session.delete(f"{BASE_URL}/api/users/{u['user_id']}", cookies=self.cookies)
    
    def test_create_customer_with_kitchen_and_city(self):
        """Test creating customer with kitchen and city assignment"""
        if not self.kitchens:
            pytest.skip("No kitchens available for assignment")
        
        kitchen_id = self.kitchens[0]["kitchen_id"]
        customer_data = {
            "name": f"TEST_Customer_{uuid.uuid4().hex[:6]}",
            "phone": f"98761{uuid.uuid4().hex[:5]}",
            "role": "customer",
            "kitchen_id": kitchen_id,
            "city": "Kochi",
            "address": "123 Customer Street, Kochi"
        }
        
        response = self.session.post(f"{BASE_URL}/api/users", json=customer_data, cookies=self.cookies)
        assert response.status_code == 200, f"Create customer failed: {response.text}"
        
        data = response.json()
        assert data["name"] == customer_data["name"]
        assert data["role"] == "customer"
        assert data["kitchen_id"] == kitchen_id
        assert data["city"] == "Kochi"
        assert data["address"] == customer_data["address"]
        print(f"✓ Customer created with kitchen ({kitchen_id}) and city (Kochi) assignment")
        
        return data["user_id"]
    
    def test_update_customer(self):
        """Test updating customer"""
        if not self.kitchens:
            pytest.skip("No kitchens available for assignment")
        
        # Create customer first
        customer_data = {
            "name": f"TEST_Customer_Update_{uuid.uuid4().hex[:6]}",
            "phone": f"98760{uuid.uuid4().hex[:5]}",
            "role": "customer",
            "city": "Kochi"
        }
        create_response = self.session.post(f"{BASE_URL}/api/users", json=customer_data, cookies=self.cookies)
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Update customer
        update_data = {
            "name": f"TEST_Customer_Updated_{uuid.uuid4().hex[:6]}",
            "city": "Trivandrum",
            "address": "Updated Address"
        }
        update_response = self.session.put(f"{BASE_URL}/api/users/{user_id}", json=update_data, cookies=self.cookies)
        assert update_response.status_code == 200, f"Update customer failed: {update_response.text}"
        
        updated = update_response.json()
        assert updated["city"] == "Trivandrum"
        assert updated["address"] == "Updated Address"
        print(f"✓ Customer updated successfully")
    
    def test_delete_customer(self):
        """Test soft deleting customer"""
        # Create customer first
        customer_data = {
            "name": f"TEST_Customer_Delete_{uuid.uuid4().hex[:6]}",
            "phone": f"98759{uuid.uuid4().hex[:5]}",
            "role": "customer"
        }
        create_response = self.session.post(f"{BASE_URL}/api/users", json=customer_data, cookies=self.cookies)
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Delete customer
        delete_response = self.session.delete(f"{BASE_URL}/api/users/{user_id}", cookies=self.cookies)
        assert delete_response.status_code == 200, f"Delete customer failed: {delete_response.text}"
        
        # Verify soft delete
        get_response = self.session.get(f"{BASE_URL}/api/users/{user_id}", cookies=self.cookies)
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] == False
        print(f"✓ Customer soft deleted successfully")


class TestKitchenEndpoints:
    """Test Kitchen PUT and DELETE endpoints exist and work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        self.cookies = login_response.cookies
        yield
    
    def test_kitchen_put_endpoint_exists(self):
        """Verify PUT /api/kitchens/{kitchen_id} endpoint exists"""
        # Get existing kitchen
        kitchens = self.session.get(f"{BASE_URL}/api/kitchens", cookies=self.cookies).json()
        if not kitchens:
            pytest.skip("No kitchens to test PUT endpoint")
        
        kitchen_id = kitchens[0]["kitchen_id"]
        # Try PUT with minimal update
        response = self.session.put(f"{BASE_URL}/api/kitchens/{kitchen_id}", 
                                    json={"contact_phone": kitchens[0]["contact_phone"]}, 
                                    cookies=self.cookies)
        assert response.status_code == 200, f"PUT endpoint failed: {response.text}"
        print(f"✓ PUT /api/kitchens/{kitchen_id} endpoint works")
    
    def test_kitchen_delete_endpoint_exists(self):
        """Verify DELETE /api/kitchens/{kitchen_id} endpoint exists"""
        # Create a test kitchen to delete
        kitchen_data = {
            "name": f"TEST_Kitchen_Endpoint_{uuid.uuid4().hex[:6]}",
            "city": "Kochi",
            "address": "Test Address",
            "contact_phone": "9876543210",
            "location": {"lat": 9.9312, "lng": 76.2673}
        }
        create_response = self.session.post(f"{BASE_URL}/api/kitchens", json=kitchen_data, cookies=self.cookies)
        assert create_response.status_code == 200
        kitchen_id = create_response.json()["kitchen_id"]
        
        # Test DELETE endpoint
        response = self.session.delete(f"{BASE_URL}/api/kitchens/{kitchen_id}", cookies=self.cookies)
        assert response.status_code == 200, f"DELETE endpoint failed: {response.text}"
        print(f"✓ DELETE /api/kitchens/{kitchen_id} endpoint works")


class TestUserDeleteEndpoint:
    """Test User DELETE endpoint exists and works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        self.cookies = login_response.cookies
        yield
    
    def test_user_delete_endpoint_exists(self):
        """Verify DELETE /api/users/{user_id} endpoint exists"""
        # Create a test user to delete
        user_data = {
            "name": f"TEST_User_Endpoint_{uuid.uuid4().hex[:6]}",
            "phone": f"98758{uuid.uuid4().hex[:5]}",
            "role": "customer"
        }
        create_response = self.session.post(f"{BASE_URL}/api/users", json=user_data, cookies=self.cookies)
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Test DELETE endpoint
        response = self.session.delete(f"{BASE_URL}/api/users/{user_id}", cookies=self.cookies)
        assert response.status_code == 200, f"DELETE endpoint failed: {response.text}"
        print(f"✓ DELETE /api/users/{user_id} endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
