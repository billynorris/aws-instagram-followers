from machine import Pin, SPI
import math
import time
import framebuf

# Custom tiny font (3x5 pixels for each number)
TINY_FONT = [
    # 0
    bytearray([
        0b111,
        0b101,
        0b101,
        0b101,
        0b111,
    ]),
    # 1
    bytearray([
        0b010,
        0b110,
        0b010,
        0b010,
        0b111,
    ]),
    # 2
    bytearray([
        0b111,
        0b001,
        0b111,
        0b100,
        0b111,
    ]),
    # 3
    bytearray([
        0b111,
        0b001,
        0b111,
        0b001,
        0b111,
    ]),
    # 4
    bytearray([
        0b101,
        0b101,
        0b111,
        0b001,
        0b001,
    ]),
    # 5
    bytearray([
        0b111,
        0b100,
        0b111,
        0b001,
        0b111,
    ]),
    # 6
    bytearray([
        0b111,
        0b100,
        0b111,
        0b101,
        0b111,
    ]),
    # 7
    bytearray([
        0b111,
        0b001,
        0b010,
        0b010,
        0b010,
    ]),
    # 8
    bytearray([
        0b111,
        0b101,
        0b111,
        0b101,
        0b111,
    ]),
    # 9
    bytearray([
        0b111,
        0b101,
        0b111,
        0b001,
        0b111,
    ])
]

class AnimatedCounter:
    def __init__(self, display, x_offset=8, y_offset=2):  # Adjusted y_offset to 2
        self.display = display
        self.x_offset = x_offset
        self.y_offset = y_offset
        
        # Current state
        self.existing_count = 500  # Starting at 500
        self.new_count = 500      # Starting at 500
        self.digits = self._number_to_digits(500)  # Initialize with 500
        self.digits_offset_perc = [0] * 6  # Changed to 6 digits
        self.animation_speed = 4  # Doubled animation speed
        self.digit_height = 5     # Height of each digit in pixels
        
        # Instagram logo bitmap
        self.instagram_logo = bytearray([
            0b00000000,
            0b01111110,
            0b01000110,
            0b01011010,
            0b01011010,
            0b01000010,
            0b01111110,
            0b00000000
        ])
        
    def draw_logo(self):
        """Draw the Instagram logo on the left side of the display"""
        for y in range(8):
            for x in range(8):
                if self.instagram_logo[y] & (1 << (7 - x)):
                    self.display.pixel(x, y, 1)
        
    def draw_tiny_digit(self, digit, x, y):
        """Draw a single digit using the custom tiny font"""
        digit_data = TINY_FONT[digit]
        for row in range(5):
            for col in range(3):
                if digit_data[row] & (1 << (2 - col)):
                    self.display.pixel(x + col, y + row, 1)
    
    def set_target_count(self, count):
        """Set the target follower count to animate towards"""
        self.new_count = max(0, min(999999, count))  # Increased to 6 digits
        
    def _number_to_digits(self, value):
        """Convert a number to a list of digits, padded to 6 digits"""
        str_value = str(value)
        padding = '0' * (6 - len(str_value))  # Changed to 6 digits
        padded_value = padding + str_value
        return [int(d) for d in padded_value]
    
    def update(self):
        """Update the animation state and render to display"""
        value_same = self.existing_count == self.new_count
        value_increased = not value_same and self.existing_count < self.new_count
        value_decreased = not value_same and self.existing_count > self.new_count
        
        # Check if any animations are currently running
        animation_active = any(offset > 0 for offset in self.digits_offset_perc)
        
        # If no change and no animation, nothing to do
        if value_same and not animation_active:
            return False
            
        # Start new animation if none is running
        if not animation_active:
            self.digits_offset_perc[5] = 2  # Changed to index 5 for 6 digits
            
        # Clear display buffer
        self.display.fill(0)
        
        # Draw the Instagram logo
        self.draw_logo()
        
        # Update and draw each digit
        for i in range(5, -1, -1):  # Changed to 6 digits
            if self.digits_offset_perc[i] > 0:
                # Update animation progress
                self.digits_offset_perc[i] += self.animation_speed
                
                # Handle digit rollover
                if i > 0 and self.digits_offset_perc[i] > 20:
                    if (value_increased and self.digits[i] == 9) or \
                       (value_decreased and self.digits[i] == 0):
                        if self.digits_offset_perc[i-1] == 0:
                            self.digits_offset_perc[i-1] = 2
                
                # Update counter when rightmost digit completes
                if i == 5 and self.digits_offset_perc[i] >= 100:  # Changed to index 5
                    if value_increased:
                        self.existing_count += 1
                    elif value_decreased:
                        self.existing_count -= 1
                
                # Complete digit animation
                if self.digits_offset_perc[i] >= 100:
                    self.digits_offset_perc[i] = 0
                    if value_increased:
                        self.digits[i] = (self.digits[i] + 1) % 10
                    elif value_decreased:
                        self.digits[i] = 9 if self.digits[i] == 0 else self.digits[i] - 1
            
            # Calculate vertical offset using cosine easing
            progress = self.digits_offset_perc[i] / 100.0
            y_offset = round((1 - (math.cos(progress * math.pi) / 2.0 + 0.5)) * self.digit_height)
            
            if value_decreased:
                y_offset *= -1
                
            # Position calculations - adjusted to 1px spacing
            x_pos = self.x_offset + i * 4  # 3 pixels wide + 1 pixel spacing
            
            # Draw current digit and neighbors using tiny font
            self.draw_tiny_digit(self.digits[i], x_pos, self.y_offset - y_offset)
            self.draw_tiny_digit(9 if self.digits[i] == 0 else self.digits[i] - 1, 
                               x_pos, self.y_offset - y_offset - self.digit_height - 1)
            self.draw_tiny_digit((self.digits[i] + 1) % 10, 
                               x_pos, self.y_offset - y_offset + self.digit_height + 1)
        
        # Update display
        self.display.show()
        return True

    def set_brightness(self, value):
        """Set the display brightness (0-15)"""
        self.display.brightness(value)