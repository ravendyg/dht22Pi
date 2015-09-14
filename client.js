(function () {

    var usergrid = require('usergrid');					// apigee sdk

    var client = new usergrid.client({              // initializing SDK
        orgName: "venom",
        appName: "sandbox"
    });

    // list of variables
    var tempData;                                   // raw data from the file
    var hum;                                        // humidity
    var temr;                                       // temperature
    var time = {                                    // time & date
        raw: '',
        year: '',
        month: '',
        day: '',
        hour: '',
        min: ''
    };                                       

    fs = require('fs');				// read data from HD

    fs.readFile('/home/pi/temp/tempData.txt', 'utf8', function (err, tempData) {
		if (err) {
			return console.error(err);
		}
		console.log(tempData);
                tempData = tempData.split('\t');
                hum = tempData[0];
                temr = tempData[1];
                time.raw = tempData[2].split('\n')[0];

                time.year = time.raw.split(' ');
                time.hour = time.year[1].split(':')[0];
                time.min = time.year[1].split(':')[1];
                time.day = time.year[0].split('-')[2];
                time.month = time.year[0].split('-')[1];
                time.year = time.year[0].split('-')[0];

                var options = {				// will be sent to apigee
                    type: "tempData",
                    year: time.year,
                    month: time.month,
                    day: time.day,
                    hour: time.hour,
                    minute: time.min,
                    temperature: temr,
                    humidity: hum
                }

                client.createEntity(options, function (error, tempDat) {    // send new data record to apigee
                    if (error) {
                        console.log('problem sending data');
                    } else {
                        console.log('data saved successfully');
                    }
                })
    });
}())
