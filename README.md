## App that fetches data from DHT22 sensor and sends it to some server

data - GPIO18

debugging - GPIO2 // disabled, but the code remained

program flow:

- disable all interrupts (without that any event can block the CPU in the middle of the sensor response)
- send request to the sensor
- check GPIO periodically (check datasheet)
- enable interrupts
- check the controll summ
- if there is a problem, repeat a few seconds later (make several attempts if necessary)
- send to the server


## Reference
Most of the code was shamelessly copied from around the Internet and smashed together.

CPU torturing
raspberrypi.org/forums/viewtopic.php?t=52393

tcp requests
http://coding.debuntu.org/c-linux-socket-programming-tcp-simple-http-client