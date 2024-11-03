from machine import Pin, SPI, WDT
import network
import time
from display import Display
from instagram_api import InstagramAPI
from config import Config
from web_server import WebServer

class FollowerCounter:
    def __init__(self):
        # Initialize hardware
        self.wdt = WDT()
        spi = SPI(1, baudrate=10000000)
        cs_pin = Pin(15)
        
        # Initialize components
        self.display = Display(spi, cs_pin)
        self.api = InstagramAPI()
        self.config = Config()
        self.server = WebServer(self.config, self.display)

        self.frame_sleep = 0.035
    
    def connect_wifi(self, ssid, password):
        """Connect to WiFi"""
        wifi = network.WLAN(network.STA_IF)
        wifi.active(True)
        
        try:
            wifi.connect(ssid, password)
            for _ in range(20):
                self.wdt.feed()
                if wifi.isconnected():
                    print(f"[WIFI] Connected: {wifi.ifconfig()[0]}")
                    return True
                time.sleep(1)
            return False
        except Exception as e:
            print(f"[WIFI] Error: {e}")
            return False
    
    def start_ap_mode(self):
        """Start Access Point mode"""
        ap = network.WLAN(network.AP_IF)
        ap.active(True)
        ap.config(essid='FollowerCounter', password='configure123')
        print("[WIFI] AP Mode started")
        self.server.start()
    
    def run(self):
        """Main program loop"""
        config = self.config.load()
        
        if config and self.connect_wifi(config['ssid'], config['password']):
            self._monitor_followers(config['username'])
        else:
            self.start_ap_mode()
    
    def _monitor_followers(self, username):
        """Monitor follower count with animated initialization"""
        try:
            # Get initial count
            initial_count = self.api.get_follower_count(username)
            if initial_count is None:
                print("[MAIN] Failed to get initial count")
                return
                
            # Start animation from slightly lower number
            start_from = max(0, initial_count - 55)  # Prevent negative numbers
            self.display.counter.current_value = start_from  # Set initial value directly
            self.display.show_count(initial_count)  # Set target to actual count
            
            # Wait for initial animation to complete
            while self.display.update_animation():
                self.wdt.feed()
                time.sleep(self.frame_sleep)
            
            previous_count = initial_count
            error_count = 0
            
            # Continue with normal monitoring
            while True:
                try:
                    self.wdt.feed()
                    count = self.api.get_follower_count(username)
                    
                    if count is not None:
                        error_count = 0
                        if count != previous_count:
                            self.display.show_count(count)
                            while self.display.update_animation():
                                self.wdt.feed()
                                time.sleep(self.frame_sleep)
                            previous_count = count
                    else:
                        error_count += 1
                        if error_count >= 3:
                            error_count = 0
                    
                    for _ in range(300):  # 30 second delay
                        self.wdt.feed()
                        time.sleep(0.1)
                        
                except Exception as e:
                    print(f"[MAIN] Error: {e}")
                    time.sleep(5)
                    
        except Exception as e:
            print(f"[MAIN] Fatal error: {e}")

if __name__ == "__main__":
    counter = FollowerCounter()
    counter.run()