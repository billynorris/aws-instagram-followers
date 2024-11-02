from machine import Pin, SPI
import framebuf

# Tiny font (3x5 pixels)
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

# Instagram logo (8x8 pixels)
LOGO = bytearray([
    0b00000000,
    0b01111110,
    0b01000110,
    0b01011010,
    0b01011010,
    0b01000010,
    0b01111110,
    0b00000000
])

from machine import Pin, SPI
import framebuf

# [Previous TINY_FONT and LOGO definitions remain the same]

class Counter:
    def __init__(self, display, initial_value=0):
        self.display = display
        self.current_value = initial_value
        self.target_value = initial_value
        self.is_animating = False
        self.stepping_up = False
        self.digit_positions = [(8 + i * 4, 2) for i in range(6)]  # (x, y) for each digit
        # Track animation for each digit separately
        self.digit_frames = [0] * 6  # 0 means no animation
        
    def _draw_logo(self):
        """Draw the Instagram logo"""
        for y in range(8):
            for x in range(8):
                if LOGO[y] & (1 << (7 - x)):
                    self.display.pixel(x, y, 1)
    
    def _draw_digit(self, digit, x, y):
        """Draw a single digit using the tiny font"""
        if y > -5 and y < 8:  # Only draw if potentially visible
            pattern = TINY_FONT[digit]
            for row in range(5):
                if 0 <= y + row < 8:
                    for col in range(3):
                        if pattern[row] & (1 << (2 - col)):
                            self.display.pixel(x + col, y + row, 1)
    
    def _number_to_digits(self, value):
        digits = []
        value = max(0, min(999999, value))
        for _ in range(6):
            digits.append(value % 10)
            value //= 10
        return digits[::-1]
    
    def set_value(self, new_value):
        if new_value != self.current_value:
            self.target_value = new_value
            self.stepping_up = new_value > self.current_value
            self.is_animating = True
            # Start animation with rightmost digit
            self.digit_frames = [0] * 6
            self.digit_frames[5] = 1  # Start first digit
    
    def update(self):
        if not self.is_animating:
            return False

        self.display.fill(0)
        self._draw_logo()
        
        current_digits = self._number_to_digits(self.current_value)
        next_digits = self._number_to_digits(self.current_value + (1 if self.stepping_up else -1))
        
        # Track if any digit is still animating
        any_animation = False
        total_frames = 8  # Increased for smoother animation
        
        # Find rightmost animating digit
        rightmost_animating = None
        for i in range(5, -1, -1):
            if self.digit_frames[i] > 0:
                rightmost_animating = i
                break
        
        # Draw all digits
        for i in range(6):
            x, base_y = self.digit_positions[i]
            frame = self.digit_frames[i]
            
            if frame > 0:  # Digit is animating
                any_animation = True
                # Calculate offset for smooth slide
                offset = (frame * 6) // total_frames
                if not self.stepping_up:
                    offset = -offset
                
                # Draw current digit sliding out
                self._draw_digit(current_digits[i], x, base_y - offset)
                
                # Draw next digit sliding in
                if self.stepping_up:
                    self._draw_digit(next_digits[i], x, base_y + 6 - offset)
                else:
                    self._draw_digit(next_digits[i], x, base_y - 6 - offset)
                
                # Update frame counter
                self.digit_frames[i] += 1
                
                # Trigger next digit's animation when this one is halfway
                if frame == total_frames // 2 and i > 0:
                    # Check if next digit needs to change
                    if current_digits[i-1] != next_digits[i-1]:
                        self.digit_frames[i-1] = 1
                
                # Check if digit animation is complete
                if frame >= total_frames:
                    self.digit_frames[i] = 0
                    # Update value if rightmost changing digit
                    if rightmost_animating is not None and i == rightmost_animating:
                        self.current_value += 1 if self.stepping_up else -1
                        # Start new animation if needed
                        if self.current_value != self.target_value:
                            self.digit_frames[5] = 1
            else:
                # Draw static digit - use next_digits if all digits to the right are done
                all_right_done = all(self.digit_frames[j] == 0 for j in range(i + 1, 6))
                digit_to_show = next_digits[i] if all_right_done else current_digits[i]
                self._draw_digit(digit_to_show, x, base_y)
        
        self.display.show()
        
        # Check if animation is complete
        if not any_animation and self.current_value == self.target_value:
            self.is_animating = False
        
        return True
    
    def set_brightness(self, value):
        """Set display brightness (0-15)"""
        self.display.brightness(value)