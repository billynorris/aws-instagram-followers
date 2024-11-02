from machine import Pin, SPI
from animate import AnimatedCounter
import time
import max7219

spi = SPI(1, baudrate=10000000)
screen = max7219.Max7219(32, 8, spi, Pin(15))

# Create the animated counter (logo will appear on the left)
counter = AnimatedCounter(screen)

# Set initial brightness
counter.set_brightness(8)

# Main loop example
while True:
    # Set new target count when it changes
    new_follower_count = 550  # Your function to get the count
    counter.set_target_count(new_follower_count)
    
    # Update animation
    animation_active = counter.update()
    
    # Small delay to control animation speed
    time.sleep(0.02)  # 50fps