from machine import Pin, SPI
import framebuf

# Tiny font (3x5 pixels) - each digit is represented as a 5-element bytearray
TINY_FONT = [
    # 0 - 9 font bitmaps
    bytearray([0b111, 0b101, 0b101, 0b101, 0b111]),  # 0
    bytearray([0b010, 0b110, 0b010, 0b010, 0b111]),  # 1
    bytearray([0b111, 0b001, 0b111, 0b100, 0b111]),  # 2
    bytearray([0b111, 0b001, 0b111, 0b001, 0b111]),  # 3
    bytearray([0b101, 0b101, 0b111, 0b001, 0b001]),  # 4
    bytearray([0b111, 0b100, 0b111, 0b001, 0b111]),  # 5
    bytearray([0b111, 0b100, 0b111, 0b101, 0b111]),  # 6
    bytearray([0b111, 0b001, 0b010, 0b010, 0b010]),  # 7
    bytearray([0b111, 0b101, 0b111, 0b101, 0b111]),  # 8
    bytearray([0b111, 0b101, 0b111, 0b001, 0b111])   # 9
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

class Counter:
    def __init__(self, display, initial_value=0):
        self.display = display
        self.current_value = initial_value
        self.target_value = initial_value
        self.is_animating = False
        self.stepping_up = False
        self.digit_positions = [(8 + i * 4, 2) for i in range(6)]  # (x, y) for each digit
        self.digit_frames = [0] * 6  # Animation frame counter for each digit
        
        print(f"Initialized Counter with initial value: {initial_value}")

    def _draw_logo(self):
        """Draw the Instagram logo"""
        print("Drawing logo")
        for y in range(8):
            for x in range(8):
                if LOGO[y] & (1 << (7 - x)):
                    self.display.pixel(x, y, 1)

    def _draw_static_number(self, number):
        """Draw a static number on the display"""
        self.display.fill(0)
        self._draw_logo()
        digits = self._number_to_digits(number)
        for i, digit in enumerate(digits):
            x, y = self.digit_positions[i]
            self._draw_digit(digit, x, y)
        self.display.show()
    
    def _draw_digit(self, digit, x, y):
        """Draw a single digit using the tiny font"""
        print(f"Drawing digit {digit} at position ({x}, {y})")
        if y > -5 and y < 8:  # Only draw if potentially visible
            pattern = TINY_FONT[digit]
            for row in range(5):
                if 0 <= y + row < 8:
                    for col in range(3):
                        if pattern[row] & (1 << (2 - col)):
                            self.display.pixel(x + col, y + row, 1)
    
    def _number_to_digits(self, value):
        """Convert number to list of digits (0-padded to 6 places)"""
        digits = []
        value = max(0, min(999999, value))  # Clamp to 6-digit max
        for _ in range(6):
            digits.append(value % 10)
            value //= 10
        print(f"Converted {value} to digits {digits[::-1]}")
        return digits[::-1]
    
    def set_value(self, new_value):
        """Set a new target value and initiate animation if changed"""
        print(f"Setting value to {new_value} (current: {self.current_value})")
        if new_value != self.current_value:
            self.target_value = new_value
            self.stepping_up = new_value > self.current_value
            self.is_animating = True
            self.digit_frames = [0] * 6
            self.digit_frames[5] = 1  # Start animation on rightmost digit
    
    def update(self):
        """Update display with current animation frame or static value"""
        if not self.is_animating:
            return False

        self.display.fill(0)

        if self.current_value == self.target_value:
            self._draw_static_number(self.current_value)
            self.is_animating = False
            print("No animation required.")
            return False
        
        self._draw_logo()
        
        # Digits for current and next value
        current_digits = self._number_to_digits(self.current_value)
        next_digits = self._number_to_digits(self.current_value + (1 if self.stepping_up else -1))
        
        any_animation = False
        total_frames = 8  # Adjust for smoother animation
        
        # Find the rightmost digit still animating
        rightmost_animating = None
        for i in range(5, -1, -1):
            if self.digit_frames[i] > 0:
                rightmost_animating = i
                break
        
        for i in range(6):
            x, base_y = self.digit_positions[i]
            frame = self.digit_frames[i]
            
            if frame > 0:
                any_animation = True
                offset = (frame * 6) // total_frames
                if not self.stepping_up:
                    offset = -offset

                # Draw current and next digits with sliding effect
                self._draw_digit(current_digits[i], x, base_y - offset)
                self._draw_digit(next_digits[i], x, base_y + (6 if self.stepping_up else -6) - offset)
                
                self.digit_frames[i] += 1
                
                if frame == total_frames // 2 and i > 0 and current_digits[i-1] != next_digits[i-1]:
                    self.digit_frames[i-1] = 1
                
                if frame >= total_frames:
                    self.digit_frames[i] = 0
                    if rightmost_animating is not None and i == rightmost_animating:
                        self.current_value += 1 if self.stepping_up else -1
                        print(f"Updated current value to {self.current_value}")
                        if self.current_value != self.target_value:
                            self.digit_frames[5] = 1
            else:
                all_right_done = all(self.digit_frames[j] == 0 for j in range(i + 1, 6))
                digit_to_show = next_digits[i] if all_right_done else current_digits[i]
                self._draw_digit(digit_to_show, x, base_y)
        
        self.display.show()
        
        if not any_animation and self.current_value == self.target_value:
            self.is_animating = False
            print("Animation complete")
        
        return True
    
    def set_brightness(self, value):
        """Set display brightness (0-15)"""
        print(f"Setting brightness to {value}")
        self.display.brightness(value)
