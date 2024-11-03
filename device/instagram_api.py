import urequests

class InstagramAPI:
    def __init__(self):
        self.base_url = "https://8nfv7haml9.execute-api.eu-west-2.amazonaws.com/prod/api/v1/users"
    
    def get_follower_count(self, username):
        """Get follower count for a user"""
        response = None
        try:
            url = f"{self.base_url}/{username}/followers"
            response = urequests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                count = data.get('followerCount', 0)
                return count
                
            print(f"[API] Error: {response.status_code}")
            return None
            
        except Exception as e:
            print(f"[API] Error: {e}")
            return None
            
        finally:
            if response:
                response.close()