import ujson

class Config:
    def __init__(self):
        self.filename = 'config.json'
    
    def save(self, ssid, password, username):
        """Save configuration"""
        try:
            config = {
                'ssid': ssid,
                'password': password,
                'username': username
            }
            with open(self.filename, 'w') as f:
                ujson.dump(config, f)
            return True
        except Exception as e:
            print(f"[CONFIG] Save error: {e}")
            return False
    
    def load(self):
        """Load configuration"""
        try:
            with open(self.filename, 'r') as f:
                return ujson.load(f)
        except:
            return None