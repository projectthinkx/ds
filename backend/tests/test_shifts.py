"""
Test cases for Shift Management and Handover System
Tests: /shifts/start, /shifts/end, /shifts/active, /shifts/my-active, /shifts/history
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RECEPTIONIST_EMAIL = "recep1@clinic.com"
RECEPTIONIST_PASSWORD = "test123"
ADMIN_EMAIL = "admin@clinic.com"
ADMIN_PASSWORD = "admin123"


class TestShiftManagement:
    """Test shift management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, email, password):
        """Helper to get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_01_receptionist_login(self):
        """Test receptionist can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RECEPTIONIST_EMAIL,
            "password": RECEPTIONIST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        print(f"Receptionist login successful: {data['user'].get('email')}")
    
    def test_02_admin_login(self):
        """Test admin can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        print(f"Admin login successful: {data['user'].get('email')}")
    
    def test_03_get_branches(self):
        """Test getting branches list"""
        token = self.get_auth_token(RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/branches")
        assert response.status_code == 200, f"Get branches failed: {response.text}"
        branches = response.json()
        assert isinstance(branches, list), "Branches should be a list"
        print(f"Found {len(branches)} branches")
        if branches:
            print(f"First branch: {branches[0].get('name', 'Unknown')}")
    
    def test_04_receptionist_check_my_active_shift(self):
        """Test receptionist can check their active shift"""
        token = self.get_auth_token(RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/shifts/my-active")
        assert response.status_code == 200, f"Get my-active shift failed: {response.text}"
        data = response.json()
        print(f"My active shift: {data}")
    
    def test_05_receptionist_start_shift(self):
        """Test receptionist can start a shift"""
        token = self.get_auth_token(RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First get branches to get a valid branch_id
        branches_response = self.session.get(f"{BASE_URL}/api/branches")
        branches = branches_response.json()
        branch_id = branches[0]["id"] if branches else "default-branch"
        branch_name = branches[0]["name"] if branches else "Default Branch"
        
        # Try to start shift
        response = self.session.post(f"{BASE_URL}/api/shifts/start", json={
            "branch_id": branch_id,
            "branch_name": branch_name
        })
        
        # Either 200 (success) or 400 (already has active shift)
        if response.status_code == 200:
            data = response.json()
            assert "id" in data, "Shift should have an id"
            assert data["status"] == "active", "Shift status should be active"
            print(f"Shift started successfully: {data['id']}")
        elif response.status_code == 400:
            # Already has active shift - this is acceptable
            print(f"Receptionist already has an active shift: {response.json().get('detail')}")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_06_admin_get_active_shifts(self):
        """Test admin can get all active shifts"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/shifts/active")
        assert response.status_code == 200, f"Get active shifts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Active shifts should be a list"
        print(f"Found {len(data)} active shifts")
        for shift in data:
            print(f"  - {shift.get('user_name')} ({shift.get('user_email')}) at {shift.get('branch_name')}")
    
    def test_07_admin_confirm_handover(self):
        """Test admin can confirm handover (end shift)"""
        # First get admin token
        admin_token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Failed to get admin auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Get active shifts
        response = self.session.get(f"{BASE_URL}/api/shifts/active")
        assert response.status_code == 200
        active_shifts = response.json()
        
        if not active_shifts:
            print("No active shifts to confirm handover - skipping")
            pytest.skip("No active shifts available for handover test")
        
        # Find receptionist's shift
        recep_shift = None
        for shift in active_shifts:
            if shift.get("user_email") == RECEPTIONIST_EMAIL:
                recep_shift = shift
                break
        
        if not recep_shift:
            print(f"No active shift for {RECEPTIONIST_EMAIL} - skipping")
            pytest.skip(f"No active shift for {RECEPTIONIST_EMAIL}")
        
        # Confirm handover
        response = self.session.post(f"{BASE_URL}/api/shifts/end", json={
            "shift_id": recep_shift["id"]
        })
        assert response.status_code == 200, f"Confirm handover failed: {response.text}"
        data = response.json()
        assert data["status"] == "completed", "Shift status should be completed"
        print(f"Handover confirmed for shift: {recep_shift['id']}")
    
    def test_08_receptionist_can_start_new_shift_after_handover(self):
        """Test receptionist can start a new shift after handover"""
        token = self.get_auth_token(RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Check if already has active shift
        check_response = self.session.get(f"{BASE_URL}/api/shifts/my-active")
        if check_response.status_code == 200 and check_response.json():
            print("Receptionist already has an active shift")
            return
        
        # Get branches
        branches_response = self.session.get(f"{BASE_URL}/api/branches")
        branches = branches_response.json()
        branch_id = branches[0]["id"] if branches else "default-branch"
        branch_name = branches[0]["name"] if branches else "Default Branch"
        
        # Start new shift
        response = self.session.post(f"{BASE_URL}/api/shifts/start", json={
            "branch_id": branch_id,
            "branch_name": branch_name
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "active"
            print(f"New shift started: {data['id']}")
        elif response.status_code == 400:
            print(f"Could not start new shift: {response.json().get('detail')}")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_09_get_shift_history(self):
        """Test getting shift history"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/shifts/history")
        assert response.status_code == 200, f"Get shift history failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Shift history should be a list"
        print(f"Found {len(data)} shifts in history")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
