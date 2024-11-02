from machine import Pin, SPI, WDT
from animate import Counter
import time
import max7219

# Initialize hardware components
spi = SPI(1, baudrate=10000000)
screen = max7219.Max7219(32, 8, spi, Pin(15))

# Initialize the watchdog timer with a timeout of 2 seconds
wdt = WDT()

    # Create counter with initial value
counter = Counter(screen, initial_value=97998)
counter.set_brightness(2)

while True:
    # Feed the watchdog to prevent reset in the main loop
    wdt.feed()
    
    print("\nStarting increment animation")
    counter.set_value(98005)
    while counter.update():
        # Feed the watchdog during the animation updates
        wdt.feed()

        time.sleep(0.06)  # Slow down for debugging
    
    time.sleep(1)  # Pause between animations, keeping it short to avoid watchdog timeout

    print("\nStarting decrement animation")
    counter.set_value(97995)
    while counter.update():
        # Feed the watchdog during the animation updates
        wdt.feed()
        time.sleep(0.06)  # Slow down for debugging
    
    time.sleep(1)  # Pause between animations, keeping it short to avoid watchdog timeout
