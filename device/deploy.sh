find *.py | xargs -I {} ampy --port /dev/cu.usbserial-FTB6SPL3 put {}

ampy --port /dev/cu.usbserial-FTB6SPL3 reset