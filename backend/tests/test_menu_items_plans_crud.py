#!/usr/bin/env python3
"""
Test Suite for Menu Items and Plans CRUD Operations
Tests Super Admin functionality for managing menu items and plans
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://foodfleet-admin.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN_PHONE = "9000000001"
SUPER_ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_session():
    """Create a session for API requests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def authenticated_session(api_session):
    """Login as super admin and return authenticated session"""
    login_response = api_session.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": SUPER_ADMIN_PHONE, "password": SUPER_ADMIN_PASSWORD}
    )
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    user_data = login_response.json()
    assert user_data.get("role") == "super_admin", f"Expected super_admin role, got {user_data.get('role')}"
    return api_session


class TestSuperAdminLogin:
    """Test Super Admin authentication"""
    
    def test_super_admin_login_success(self, api_session):
        """Test super admin can login with correct credentials"""
        response = api_session.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": SUPER_ADMIN_PHONE, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "super_admin"
        assert data.get("user_id") is not None
        assert data.get("phone") == SUPER_ADMIN_PHONE
        print(f"✅ Super Admin login successful - user_id: {data.get('user_id')}")
    
    def test_super_admin_login_wrong_password(self, api_session):
        """Test login fails with wrong password"""
        response = api_session.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": SUPER_ADMIN_PHONE, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✅ Login correctly rejected with wrong password")


class TestMenuItemsCRUD:
    """Test Menu Items CRUD operations"""
    
    created_item_id = None
    
    def test_get_menu_items(self, authenticated_session):
        """Test fetching all menu items"""
        response = authenticated_session.get(f"{BASE_URL}/api/menu-items?include_inactive=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET menu items - found {len(data)} items")
        
        # Verify menu item structure if items exist
        if len(data) > 0:
            item = data[0]
            assert "item_id" in item
            assert "name" in item
            assert "category" in item
            assert "diet_type" in item
            print(f"✅ Menu item structure verified - first item: {item.get('name')}")
    
    def test_create_menu_item(self, authenticated_session):
        """Test creating a new menu item with nutrition info"""
        test_item = {
            "name": f"TEST_Grilled Chicken Salad_{uuid.uuid4().hex[:6]}",
            "description": "Fresh grilled chicken with mixed greens",
            "category": "Salad",
            "diet_type": "non_veg",
            "ingredients": ["chicken", "lettuce", "tomato", "cucumber"],
            "allergy_tags": ["Gluten"],
            "calories": 350,
            "protein": 28,
            "carbs": 15,
            "fat": 18,
            "sodium": 450,
            "fiber": 5,
            "image_url": ""
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/menu-items",
            json=test_item
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify created item
        assert data.get("name") == test_item["name"]
        assert data.get("category") == test_item["category"]
        assert data.get("diet_type") == test_item["diet_type"]
        assert data.get("calories") == test_item["calories"]
        assert data.get("protein") == test_item["protein"]
        assert data.get("carbs") == test_item["carbs"]
        assert data.get("item_id") is not None
        
        TestMenuItemsCRUD.created_item_id = data.get("item_id")
        print(f"✅ Created menu item - item_id: {TestMenuItemsCRUD.created_item_id}")
        
        # Verify persistence with GET
        get_response = authenticated_session.get(f"{BASE_URL}/api/menu-items/{TestMenuItemsCRUD.created_item_id}")
        assert get_response.status_code == 200
        fetched_item = get_response.json()
        assert fetched_item.get("name") == test_item["name"]
        print("✅ Menu item persisted and verified via GET")
    
    def test_update_menu_item(self, authenticated_session):
        """Test updating an existing menu item"""
        if not TestMenuItemsCRUD.created_item_id:
            pytest.skip("No menu item created to update")
        
        update_data = {
            "name": f"TEST_Updated Chicken Salad_{uuid.uuid4().hex[:6]}",
            "calories": 400,
            "protein": 32
        }
        
        response = authenticated_session.put(
            f"{BASE_URL}/api/menu-items/{TestMenuItemsCRUD.created_item_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        # Verify update
        assert data.get("calories") == 400
        assert data.get("protein") == 32
        print(f"✅ Updated menu item - new name: {data.get('name')}")
        
        # Verify persistence with GET
        get_response = authenticated_session.get(f"{BASE_URL}/api/menu-items/{TestMenuItemsCRUD.created_item_id}")
        assert get_response.status_code == 200
        fetched_item = get_response.json()
        assert fetched_item.get("calories") == 400
        print("✅ Menu item update persisted and verified via GET")
    
    def test_delete_menu_item(self, authenticated_session):
        """Test soft deleting a menu item"""
        if not TestMenuItemsCRUD.created_item_id:
            pytest.skip("No menu item created to delete")
        
        response = authenticated_session.delete(
            f"{BASE_URL}/api/menu-items/{TestMenuItemsCRUD.created_item_id}"
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify soft delete - item should still exist but be inactive
        get_response = authenticated_session.get(f"{BASE_URL}/api/menu-items/{TestMenuItemsCRUD.created_item_id}")
        assert get_response.status_code == 200
        fetched_item = get_response.json()
        assert fetched_item.get("is_active") == False
        print(f"✅ Soft deleted menu item - is_active: {fetched_item.get('is_active')}")


class TestPlansCRUD:
    """Test Plans CRUD operations"""
    
    created_plan_id = None
    test_menu_item_ids = []
    
    def test_get_plans(self, authenticated_session):
        """Test fetching all plans"""
        response = authenticated_session.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET plans - found {len(data)} plans")
        
        # Verify plan structure if plans exist
        if len(data) > 0:
            plan = data[0]
            assert "plan_id" in plan
            assert "name" in plan
            # Check for new fields
            if "delivery_days" in plan:
                print(f"✅ Plan has delivery_days: {plan.get('delivery_days')}")
            if "validity_days" in plan:
                print(f"✅ Plan has validity_days: {plan.get('validity_days')}")
            if "selected_items" in plan:
                print(f"✅ Plan has selected_items: {len(plan.get('selected_items', []))} items")
    
    def test_create_plan_with_delivery_days(self, authenticated_session):
        """Test creating a new plan with delivery_days and selected_items"""
        # First, get some menu items to select
        menu_response = authenticated_session.get(f"{BASE_URL}/api/menu-items")
        assert menu_response.status_code == 200
        menu_items = menu_response.json()
        
        # Select up to 3 menu items for the plan
        selected_items = [item["item_id"] for item in menu_items[:3] if item.get("is_active", True)]
        TestPlansCRUD.test_menu_item_ids = selected_items
        
        test_plan = {
            "name": f"TEST_Weekly Veg Plan_{uuid.uuid4().hex[:6]}",
            "delivery_days": 6,
            "validity_days": 7,
            "diet_type": "veg",
            "price": 1500,
            "cost": 1000,
            "description": "Test weekly vegetarian plan",
            "selected_items": selected_items
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/plans",
            json=test_plan
        )
        assert response.status_code == 200, f"Create plan failed: {response.text}"
        data = response.json()
        
        # Verify created plan
        assert data.get("name") == test_plan["name"]
        assert data.get("delivery_days") == 6
        assert data.get("validity_days") == 7
        assert data.get("diet_type") == "veg"
        assert data.get("price") == 1500
        assert data.get("plan_id") is not None
        
        TestPlansCRUD.created_plan_id = data.get("plan_id")
        print(f"✅ Created plan - plan_id: {TestPlansCRUD.created_plan_id}")
        print(f"   delivery_days: {data.get('delivery_days')}, validity_days: {data.get('validity_days')}")
        print(f"   selected_items: {len(data.get('selected_items', []))} items")
        
        # Verify persistence with GET
        get_response = authenticated_session.get(f"{BASE_URL}/api/plans/{TestPlansCRUD.created_plan_id}")
        assert get_response.status_code == 200
        fetched_plan = get_response.json()
        assert fetched_plan.get("name") == test_plan["name"]
        assert fetched_plan.get("delivery_days") == 6
        print("✅ Plan persisted and verified via GET")
    
    def test_create_plan_12_deliveries(self, authenticated_session):
        """Test creating a plan with 12 delivery days"""
        test_plan = {
            "name": f"TEST_Bi-Weekly Plan_{uuid.uuid4().hex[:6]}",
            "delivery_days": 12,
            "validity_days": 15,
            "diet_type": "non_veg",
            "price": 2800,
            "cost": 2000,
            "description": "Test bi-weekly non-veg plan",
            "selected_items": []
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/plans",
            json=test_plan
        )
        assert response.status_code == 200, f"Create plan failed: {response.text}"
        data = response.json()
        
        assert data.get("delivery_days") == 12
        assert data.get("validity_days") == 15
        print(f"✅ Created 12-delivery plan - plan_id: {data.get('plan_id')}")
        
        # Clean up - delete this test plan
        authenticated_session.delete(f"{BASE_URL}/api/plans/{data.get('plan_id')}")
    
    def test_create_plan_24_deliveries(self, authenticated_session):
        """Test creating a plan with 24 delivery days (monthly)"""
        test_plan = {
            "name": f"TEST_Monthly Plan_{uuid.uuid4().hex[:6]}",
            "delivery_days": 24,
            "validity_days": 30,
            "diet_type": "mixed",
            "price": 5000,
            "cost": 3500,
            "description": "Test monthly mixed plan",
            "selected_items": []
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/plans",
            json=test_plan
        )
        assert response.status_code == 200, f"Create plan failed: {response.text}"
        data = response.json()
        
        assert data.get("delivery_days") == 24
        assert data.get("validity_days") == 30
        print(f"✅ Created 24-delivery plan - plan_id: {data.get('plan_id')}")
        
        # Clean up - delete this test plan
        authenticated_session.delete(f"{BASE_URL}/api/plans/{data.get('plan_id')}")
    
    def test_update_plan(self, authenticated_session):
        """Test updating an existing plan"""
        if not TestPlansCRUD.created_plan_id:
            pytest.skip("No plan created to update")
        
        update_data = {
            "price": 1800,
            "description": "Updated test plan description"
        }
        
        response = authenticated_session.put(
            f"{BASE_URL}/api/plans/{TestPlansCRUD.created_plan_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        # Verify update
        assert data.get("price") == 1800
        assert data.get("description") == "Updated test plan description"
        print(f"✅ Updated plan - new price: {data.get('price')}")
        
        # Verify persistence with GET
        get_response = authenticated_session.get(f"{BASE_URL}/api/plans/{TestPlansCRUD.created_plan_id}")
        assert get_response.status_code == 200
        fetched_plan = get_response.json()
        assert fetched_plan.get("price") == 1800
        print("✅ Plan update persisted and verified via GET")
    
    def test_update_plan_selected_items(self, authenticated_session):
        """Test updating plan's selected menu items"""
        if not TestPlansCRUD.created_plan_id:
            pytest.skip("No plan created to update")
        
        # Get menu items
        menu_response = authenticated_session.get(f"{BASE_URL}/api/menu-items")
        menu_items = menu_response.json()
        
        # Select different items (up to 5 for a 6-delivery plan)
        new_selected_items = [item["item_id"] for item in menu_items[:5] if item.get("is_active", True)]
        
        update_data = {
            "selected_items": new_selected_items
        }
        
        response = authenticated_session.put(
            f"{BASE_URL}/api/plans/{TestPlansCRUD.created_plan_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Update selected items failed: {response.text}"
        data = response.json()
        
        print(f"✅ Updated plan selected_items - now has {len(data.get('selected_items', []))} items")
    
    def test_delete_plan(self, authenticated_session):
        """Test soft deleting a plan"""
        if not TestPlansCRUD.created_plan_id:
            pytest.skip("No plan created to delete")
        
        response = authenticated_session.delete(
            f"{BASE_URL}/api/plans/{TestPlansCRUD.created_plan_id}"
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify soft delete - plan should still exist but be inactive
        get_response = authenticated_session.get(f"{BASE_URL}/api/plans/{TestPlansCRUD.created_plan_id}")
        assert get_response.status_code == 200
        fetched_plan = get_response.json()
        assert fetched_plan.get("is_active") == False
        print(f"✅ Soft deleted plan - is_active: {fetched_plan.get('is_active')}")


class TestPlanValidation:
    """Test plan validation rules"""
    
    def test_invalid_delivery_days(self, authenticated_session):
        """Test that invalid delivery_days values are rejected"""
        test_plan = {
            "name": "TEST_Invalid Plan",
            "delivery_days": 10,  # Invalid - should be 6, 12, or 24
            "validity_days": 15,
            "diet_type": "veg",
            "price": 1000
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/plans",
            json=test_plan
        )
        # Should return 400 for invalid delivery_days
        assert response.status_code == 400, f"Expected 400 for invalid delivery_days, got {response.status_code}"
        print("✅ Invalid delivery_days correctly rejected")
    
    def test_too_many_selected_items(self, authenticated_session):
        """Test that selecting more items than delivery_days is rejected"""
        # Get menu items
        menu_response = authenticated_session.get(f"{BASE_URL}/api/menu-items")
        menu_items = menu_response.json()
        
        # Try to select 10 items for a 6-delivery plan
        selected_items = [item["item_id"] for item in menu_items[:10] if item.get("is_active", True)]
        
        if len(selected_items) < 7:
            pytest.skip("Not enough menu items to test this validation")
        
        test_plan = {
            "name": "TEST_Too Many Items Plan",
            "delivery_days": 6,
            "validity_days": 7,
            "diet_type": "veg",
            "price": 1000,
            "selected_items": selected_items[:7]  # 7 items for 6 deliveries
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/plans",
            json=test_plan
        )
        # Should return 400 for too many selected items
        assert response.status_code == 400, f"Expected 400 for too many items, got {response.status_code}"
        print("✅ Too many selected_items correctly rejected")


class TestMenuItemNutrition:
    """Test menu item nutrition fields"""
    
    def test_menu_item_has_nutrition_fields(self, authenticated_session):
        """Verify menu items have nutrition information"""
        response = authenticated_session.get(f"{BASE_URL}/api/menu-items")
        assert response.status_code == 200
        items = response.json()
        
        if len(items) == 0:
            pytest.skip("No menu items to verify")
        
        # Check first active item for nutrition fields
        for item in items:
            if item.get("is_active", True):
                nutrition_fields = ["calories", "protein", "carbs", "fat", "sodium", "fiber"]
                for field in nutrition_fields:
                    assert field in item, f"Missing nutrition field: {field}"
                print(f"✅ Menu item '{item.get('name')}' has all nutrition fields")
                print(f"   Calories: {item.get('calories')}, Protein: {item.get('protein')}g, Carbs: {item.get('carbs')}g")
                break


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
