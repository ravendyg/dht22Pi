# dht22Pi
dht22.cpp - sensor to raspberry
client.js - raspberry to apigee.com (using node.js SDK)

DHT22 temperature/humidity sensor on Raspberry Pi
DHT22 sensor on Raspberry Pi B+
data - GPIO18
debugging - GPIO2 // disabled, but the code remained

program flow:

// dht22.cpp
- disable all interrupts (without that any event can block the CPU in the middle of the sensor response)
- send request to the sensor
- check GPIO periodically (check datasheet)
- enable interrupts
- check the controll summ
- if there is a problem, repeat a few seconds later (make several attempts if necessary)
- output to an external file (I've got two for different purposes: datayear-month-day.txt and tempData.txt)

// client.js
- read previous output (tempData.txt)
- send to apigee.com

http://venomyd2.esy.es/temp.html — result (far from completion, wanna move to D3, but don't have time for any global change)
