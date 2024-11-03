from machine import Pin, SPI
import max7219
from animate import Counter

class Display:
    def __init__(self, spi, cs_pin):
        """Initialize display with both counter animation and scrolling capabilities"""
        self.matrix = max7219.Max7219(32, 8, spi, cs_pin)
        self.counter = Counter(self.matrix)
        self.counter.set_brightness(12)
        self._setup_scroll()
    
    def _setup_scroll(self):
        """Setup scrolling variables"""
        self.scroll_timer = None
        self.scroll_text = ""
        self.scroll_pos = 0
    
    def show_count(self, count):
        """Show animated follower count"""
        self.counter.set_value(count)
        
    def update_animation(self):
        """Update any ongoing animation"""
        return self.counter.update()
    
    def scroll_message(self, text):
        """Scroll a message across the display"""
        from machine import Timer
        
        def scroll_handler(timer):
            width = self.matrix.width
            text_length = len(self.scroll_text) * 8
            
            self.matrix.fill(0)
            self.matrix.text(self.scroll_text, width - self.scroll_pos, 0, 1)
            self.matrix.show()
            
            self.scroll_pos += 1
            if self.scroll_pos > width + text_length:
                self.stop_scroll()
        
        self.stop_scroll()
        self.scroll_text = text
        self.scroll_pos = 0
        
        self.scroll_timer = Timer(-1)
        self.scroll_timer.init(period=2, mode=Timer.PERIODIC, callback=scroll_handler)
    
    def stop_scroll(self):
        """Stop any ongoing scroll"""
        if self.scroll_timer:
            self.scroll_timer.deinit()
            self.scroll_timer = None
        self.scroll_pos = 0
    
    def wait_scroll_complete(self, timeout=5):
        """Wait for scroll to complete with timeout"""
        import time
        start = time.time()
        while self.scroll_timer and time.time() - start < timeout:
            time.sleep(0.1)
        self.stop_scroll()