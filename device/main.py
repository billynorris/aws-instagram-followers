from machine import Pin, SPI
from animate import Counter
import time
import max7219

spi = SPI(1, baudrate=10000000)
screen = max7219.Max7219(32, 8, spi, Pin(15))


    # Create counter with initial value
counter = Counter(screen, initial_value=498)
counter.set_brightness(2)

while True:
    print("\nStarting increment animation")
    counter.set_value(505)
    while counter.update():
        time.sleep(0.05)  # Slowed down for debugging
        
    time.sleep(1)  # Pause between animations
    
    print("\nStarting decrement animation")
    counter.set_value(495)
    while counter.update():
        time.sleep(0.05)  # Slowed down for debugging
        
    time.sleep(1)  # Pause between animations