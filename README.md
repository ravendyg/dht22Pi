# dht22Pi
DHT22 temperature/humidity sensor on Raspberry Pi
DHT22 sensor on Raspberry Pi B+
data - GPIO18
debugging - GPIO2 // disabled, but the code remained

program flow:
- disable all interrupts (without that any event can block the CPU in the middle of the sensor response)
- send request to sensor
- check GPIO periodically (check datasheet)
- enable interrupts
- check the controll summ
- if there is a problem repeat a few seconds later (make several attempts if necessary)
- output to an external file (I've got two for different purposes)
