(function () {

    var app = angular.module('myApp', [])
        .controller('tempCtrl', tempCtrl)

    /*** find max and mins 
    no return
    ***/
    var maxMin = function (start, rawData) {
        maxHum = maxTemp = -100;
        minHum = minTemp = 100;
        //console.log('start - ' + start);
        //                     console.log('rawData');
        //                     console.log(rawData);
        for (var count = 0; count < rawData.length; count++) {
            if (rawData[count].created !== undefined) {         // if undefined, then there were no data for that 15 min interval
                maxHum = Math.max(rawData[count].humidity, maxHum);
                minHum = Math.min(rawData[count].humidity, minHum);
                maxTemp = Math.max(rawData[count].temperature, maxTemp);
                minTemp = Math.min(rawData[count].temperature, minTemp);
                //if (isNaN(minTemp)) { console.log(count); console.log(rawData[count] == {});}
                if (start - rawData[count].created > limit) { // now - data created time > graph span
                    console.log('break');
                    break;
                }
            }
        }
        maxHum = Math.ceil(maxHum);
        maxTemp = Math.ceil(maxTemp);
        minHum = Math.floor(minHum);
        minTemp = Math.floor(minTemp);

        //console.log(maxTemp + ' ' + minTemp + ' ' + maxHum + ' ' + minHum);
        //round max and min to the nearest %5
        maxHum += (5 - maxHum % 5);
        minHum -= minHum % 5;
        if (maxTemp > 0) {
            maxTemp += (5 - maxTemp % 5);
        } else { maxTemp -= maxTemp % 5; }
        if (minTemp < 0) {
            minTemp -= (5 + minTemp % 5);
        } else { (minTemp -= minTemp % 5); }

        // control for outliers
        if (maxTemp > 30) maxTemp = 30;
        if (maxHum > 80) maxHum = 80;
        if (minTemp < 0) minTemp = 0;
        if (minHum < 0) minHum = 0;
		// separate temp and hum
        if (minTemp > 10) minTemp = 10;
    };

    /* average
    ignores undefined
    as the first argument gets type of data (temperature, humidity)
    returns '' if there was no number argument
    */
    var avg = function () {
        var sum = 0;
        var argCount = 0;
        for (var i = 1; i < arguments.length; i++) {
            if (arguments[i] !== undefined) {                   // data record itself is fine
                if (arguments[i][arguments[0]] !== undefined) { // temperature or humidity readings are fine
                    sum += parseFloat(arguments[i][arguments[0]]);
                    argCount++;
                }
            }
        }
        if (argCount > 0) { return sum / argCount; }
        else { return '';}
    };
    /* convert temperature into y coordinate
    if coord is outside, returns ''
    max, min - display boundaries, rad - point radius
    */
    var dispCoord = function (coord, max, min, screenHeight, diametr) {
        if (coord < min || coord > max) { return '';}
        return (Math.round((max - coord) / (max - min) * screenHeight - diametr) + 'px');
    };

    var rawData = [];                                   // data storage. every 15 min reading
    var maxTemp = 30, minTemp = 10, maxHum = 60, minHum = 20;   // graph limits
    /*** when just opend display 3.5 days
        limit = 336 - 3.5 d; 336*2=672 - 7 d; 336*8=2688 - 28 d
        ***/
    var limit = 336;

    function tempCtrl($scope, $interval) {
        

        /*** set labels 
        set values for all labels and refreshes the model
        no return
        ***/
        var setLabels = function () {
            $scope.labels[5].textH = minHum + ' %';
            $scope.labels[0].textH = maxHum + ' %';
            $scope.labels[5].textT = minTemp + ' °C';
            $scope.labels[0].textT = maxTemp + ' °C';
            for (var count = 1; count < 5; count++) {
                $scope.labels[count].textH = parseInt(maxHum - (maxHum - minHum) / 5 * count) + ' %';
                $scope.labels[count].textT = parseInt(maxTemp - (maxTemp - minTemp) / 5 * count) + ' °C';
            }
            //                          console.log('dispData');
            //                          console.log($scope.dispData);
            //                          console.log($scope.vertLines);

            $scope.loading = false;
            $scope.$apply();                // refresh the model after asynchronous call
        };

        /*** calculates data point positions on the graph
        ***/
        var setPoints = function () {

            // process raw data into output data
            // shift works this way: if we don't have all data for given last 30 min period (exact period, like *:00-*:30 or *:30-*:00)
            // -1 - max shift; rawData[count].created % 1800000 - how much we have except the first one (0, 1)
            // for averaging period of 1 hour (7 day display) it will be: *%3600000, -3 and (0, 1, 2, 3)
            var countShift;
            for (var erCount = 0; erCount < rawData.length; erCount++) {        // used to calculate it based on the first rawData entry, but it can be undefined
                // search for the first defined
                countShift = Math.round(((rawData[erCount].created / 1800000) - Math.floor(rawData[erCount].created / 1800000)) * 2) - 1;
                if (countShift !== undefined) break;
            }
            //console.log('shift - ' + countShift);

            /*** calculate max and min values
            start - current 15 min interval
            
            ***/
            maxMin(start, rawData);

            $scope.dispData = [];                       // remove data from the graph
  //          console.log('iside setpoints');
   //         console.log(rawData);

            for (var count = 0; count < 168; count++) { // 168 - max number of points on the graph
                // 2 rawData -> 1 $scope.dispData (every 30 min)
                var avgTemp = avg('temperature', rawData[count * 2 + countShift], rawData[count * 2 + 1 + countShift]);
                var avgHum = avg('humidity', rawData[count * 2 + countShift], rawData[count * 2 + 1 + countShift]);
               // console.log(avgTemp + ' ' + avgHum);
                $scope.dispData.push({
                    temp: dispCoord(avgTemp, maxTemp, minTemp, $scope.graphHe, $scope.pointDia),
                    hum: dispCoord(avgHum, maxHum, minHum, $scope.graphHe, $scope.pointDia),
                    dx: (742 - (35 + $scope.pointDia * (count + 1))) + 'px',      // 742 - right edge; left shift - 35 for label,
                    // $scope.pointDia for each point
                    tVis: false,
                    hVis: false,
                    count: count,
                    numTemp: parseFloat(avgTemp).toFixed(1) + ' °C',
                    numHum: parseFloat(avgHum).toFixed(1) + ' %'
                });
                if ($scope.dispData[count].temp === '') { // no temperature data, hide
                    $scope.dispData[count].tVis = true;
                }
                if ($scope.dispData[count].hum === '') { // no temperature data, hide
                    $scope.dispData[count].hVis = true;
                }
            }
 //           console.log('dispdata');
 //           console.log($scope.dispData);
        };

        /*** send a request for data to apigee.comm
        on recieving put them into rawData array of {temperature, humidity, created}
        created is date in parseInt(ms / 900 000) — number of full 15 minutes intervals (readings from the sensor are taken every 15 min)

        add argument: 
        ***/
        var fetchData = function (regime, options) {
            client.login(username, password, function (error, data, user) { // log in
                if (error) {
                    $("#error").append("A log in error occurred!");
                } else {
                    client.createCollection(options, function (error, tempdata) { // get data
                        if (error) {
                            console.error('could not get data from apigee');
                        } else {                                                    // got data
   //                         console.log('temp ' + tempdata._list.length);
                            // reinitialize current time
  //                          date = new Date().getTime();
  //                          start = parseInt((date - new Date(0, 0, 0, 0, 5, 1)) / 900000);  // now in 15 min intervals, 5min - delay before sending data to apigee
                            var errDate = date % 3600000;
                            if ((300000 < errDate && errDate < 315000) || (1200000 < errDate && errDate < 1215000) || (2100000 < errDate && errDate < 2115000) || (3000000 < errDate && errDate < 3015000)) {
                                $scope.errMess = 'There was an error while getting data from apigee, if the graph does not display properly, please reloaad the page';
                            }
                            else {
                                $scope.errMess = '';
                            }

                            var iter = 0;   // position in 15 minutes intervals in rawData
                            var iterData;   // how many 15 minutes intervals ago these data were obtained
                            var tempDataInst;
       //                     console.log('tempdata');
       //                     console.log(tempdata);
                      //      console.log('data length ' + tempdata._list.length);
                            //                           while (tempdata.hasNextEntity()) {
      //                      var rawDataTempor = [];                             // put loaded data into temporary storage, then prepend them into rawData
                            
                            /*** if these are new data or we are downloading the rest of them for the month - append to rawData
                            updating - unshift to the beginning ***/
                            if (regime === 'new' || regime === 'rest') {
                                if (regime === 'rest') {                                // move the counter to the end of rawData for appending
/***!!!!!!***/                      iterData = rawData.length;                          // this part is not tested — there were no data
                                }
                                for (var count = 0; count < tempdata._list.length; count++) {
                                    tempDataInst = tempdata.getNextEntity();                    // get sensor reading
                                    //                      console.log('iterator ' + tempdata._iterator);
                                    if (tempDataInst.get('timeStamp') !== undefined) { // it doesn't exist in some old records
                                        iterData = parseInt((date - tempDataInst.get('timeStamp')) / 900000);
                                    } else { // using of created is not advised since it can be wrong
                                        iterData = parseInt((date - tempDataInst.get('created')) / 900000);
                                    }
                                    //                       console.log('iterData - ' + iterData + ' ite - ' + iter);
                                    //                           console.log(tempDataInst);
                                    //                           console.log(parseInt((date - tempDataInst.get('timeStamp')) / 900000));
                                    // compare iter and iterData trying to match data creation time with their timebased position in rawData
                                
                                    do {    // infinite loop
                                        if (iterData < iter) { // effectively can't happen, means there is a measurement inside 15 minutes interval or some doubled record 
                                            // can happen for records created in another type and then moved into tempdata
                                            // console.log('er1: iterData ' + iterData + ' iter ' + iter);
                                            //        console.log('iterData - ' + iterData);
                                            break;             // skip it
                                            // such data are unreliable
                                        }
                                        if (iterData === iter) { // how it should be
                                            rawData.push({       // put it in rawData
                                                created: parseInt(tempDataInst.get('timeStamp') / 900000) * 900000, // exact start of 15 minutes interval
                                                temperature: tempDataInst.get('temperature'),
                                                humidity: tempDataInst.get('humidity')
                                            });
                                            iter++;                                     // and next position in rawData
                                            break;
                                        } else {                // missing measurment
                                            rawData.push({});   // get to the next position in rawData, but stay with the same data from apigee
                                            iter++;
                                            //         console.log('iter - ' + iter);
                                        }
                                    } while (1 === 1);
                                    
                                }
                                //console.log(rawData);
                            } else {                            // update
                                /*** there should be only one data point
                                rigth now believe it, don't check ***/
                                tempDataInst = tempdata.getNextEntity();
                                rawData.unshift({       // put it in rawData
                                    created: parseInt(tempDataInst.get('timeStamp') / 900000) * 900000, // exact start of 15 minutes interval
                                    temperature: tempDataInst.get('temperature'),
                                    humidity: tempDataInst.get('humidity')
                                });
                            }

                          //  console.log('length: ' + rawData.length);
                            // redraw the graph. don't need to do it if just got the rest of the data for the month
                            if (regime === 'new' || regime === 'update') {
      //                          console.log('test');
                                setPoints();
                                setLabels();
                                
                            }
                          //  console.log('reg: ' + regime + rawData[0].created);
                            
                        }

                        client.logout();                                        // log out
                        //                 console.log(rawData);

                        if (regime === 'new') { // displayed, get the rest
                            quer = "select * where timeStamp<" + (date - (1000 * 60 * 60 * 24) * 3.5) +
                                " and timeStamp>" + (date - (1000 * 60 * 60 * 24) * 28) + " order by created desc"; // take everything. need to leave only created, humidity, temperature
                                opt.qs = { ql: quer, limit: 3000 };                                                    // one data record
                                fetchData('rest', opt);
                        }
                    });

                    

                }
            });
        }

        /*** draw the graph base ***/
        var drawBase = function () {
            // horizontal dimensions: 35px + (168 * 4 = 672px) + 35px
            // for 3.5 days - every 30 min
            // for 7 days - every 1 hour
            // for 28 days - every 4 hours
            // lines 
            $scope.vertLines = [];                          // all vertical lines
            $scope.dateLabels = [];                         // date near veryBoldLines
            var hourDispShift = start % 4;                  // quater of an hour 0 .. 3
            if (hourDispShift < 2) { hourDispShift = $scope.pointDia; }    // first half, move lines to the right by 4px
            else { hourDispShift = 0; }                         // second half, don't move
            var boldLine = Math.ceil(((start / 24) - Math.floor(start / 24)) * 6); //
            // number the hour since last [0,6,12,18] hours; start is in quarters; 6 hours have 24 quarters
            var veryBoldLine = Math.ceil(((start / 96) - Math.floor(start / 96)) * 24); //
            // number the hour since last 0 hours; start is in quarters; 24 hours have 96 quarters
            //console.log(start / 96);
			console.log('hourDispShift: ' + hourDispShift);
            console.log('veryBoldLine: ' + veryBoldLine);
            console.log('boldLine: ' + boldLine);
            for (var count = 0; count < (84 + (hourDispShift + 1) % ($scope.pointDia + 1)) ; count++) {    // 84 hours + last right line
                // if doesn't apply shift need +1 vertical line
                $scope.vertLines.push({                     // create vertical line
                    x: (35 + (4 * 2) * count + hourDispShift) + 'px',   // 35px - left label; line every 2 points (hour)
                    color: '#bdbdbd',
                    width: '1px'
                });
                if (((count + boldLine + 84) % 6) === 0) {   // every 6 - darker
                    $scope.vertLines[count].color = '#939393';
                }
                if (((count + veryBoldLine + 84) % 24) === 0) {   // every 24 - black
                    $scope.vertLines[count].color = '#000000';
                    $scope.dateLabels.push({
                        x: $scope.vertLines[count].x,               // the same x coord, but y will be bigger
                        text: new Date(date - (84 - count - 1) * 3600000) // from current date go back by (number of lines - current line in processing - 1) hours
                    });
                    //              console.log(new Date(date));
                    //               console.log(new Date(date - (84 - count - 1) * 3600000));
                }
            }
            //       console.log($scope.dateLabels);
            // horizontal lines
            $scope.hrLines = [{ y: $scope.graphHe / 5 }, { y: $scope.graphHe / 5 * 2 }, { y: $scope.graphHe / 5 * 3 }, { y: $scope.graphHe / 5 * 4 }];
            // labels
            $scope.labels = [{ y: -16, textT: '', textH: '' }, { y: $scope.graphHe / 5 - 16, textT: '', textH: '' }, { y: $scope.graphHe / 5 * 2 - 16, textT: '', textH: '' },
                { y: $scope.graphHe / 5 * 3 - 16, textT: '', textH: '' }, { y: $scope.graphHe / 5 * 4 - 16, textT: '', textH: '' }, { y: $scope.graphHe - 16, textT: '', textH: '' }]
        };

        /*** end of functions definition ***/
        
        /*** var definition ***/
        $scope.asd = '3 days';
        $scope.pointDia = 4;                            // point diametr
        $scope.graphHe = 500;
        $scope.graphWi = 672;
        $scope.loading = true;
        $scope.dispData = [];                               // processed data storage. averaged

        var date = new Date().getTime();                    // now 
        var start = parseInt((date - new Date(0, 0, 0, 0, 5, 1)) / 900000);                // now in 15 min intervals, 5min - delay before sending data to apigee
                

        var client = new Usergrid.Client({                  // initialize connection to apigee
            orgName: 'venom',
            appName: 'temppi',
        })
        var username = "reader";                            // has only GET permission
        var password = "emptypassworD1";

        var readType = 'days';                              // how much information to load and dispaly: days - 3 last days
        var dataLength = 3000;                              // max amount of measurments we need 28 days * 24 hours * 4p/hour = 2688 + smth just in case

                var quer;

        /*** end of var definition - most of them ***/

        if (readType === 'month') {                          // set up query parameters
            quer = "" + (date - (1000 * 60 * 60 * 24) * 28); // 4 weeks
        } else if (readType === 'week') {
            quer = "" + (date - (1000 * 60 * 60 * 24) * 7); // 1 week
        } else {
            quer = "" + (date - (1000 * 60 * 60 * 24) * 3.5); // 3.5 days
        }
       // console.log('quer ' + quer);

        

        /*** prepare a query ***/
        quer = "select * where timeStamp>" + (date - (1000 * 60 * 60 * 24) * 3.5) + " order by created desc"; // take everything. need to leave only created, humidity, temperature
       // console.log(quer);
        var opt = {                                     // query
            type: "tempdata",
            qs: { ql: quer, limit: dataLength }
        };

        

        /*** request data from apigee ***/
        fetchData('new', opt);
   //     .then(console.log(10));

        /*** draw the graph and then wait for fetchData completion ***/
        drawBase();

        /*** now when the user has got his graph we can download the rest of the data for the month ***/


        /*** set up repeating update of the graph - first to the nearest data update, then every 15 min 
        ***/
        var countInt = $interval(function () {
            date = new Date().getTime();
            start = parseInt((date - new Date(0, 0, 0, 0, 5, 1)) / 900000);
            quer = "select * where timeStamp>" + rawData[0].created + " order by created desc"; // not yet obtained from apigee
            opt.qs = { ql: quer, limit: 1 };                                                    // one data record
            fetchData('update', opt);
            drawBase();

            $interval.cancel(countInt);
            countInt = $interval(function () {
                date = new Date().getTime();
                start = parseInt((date - new Date(0, 0, 0, 0, 5, 1)) / 900000);
                quer = "select * where timeStamp>" + rawData[0].created + " order by created desc"; // not yet obtained from apigee
                opt.qs = { ql: quer, limit: 1 };                                                    // one data record
                fetchData('update', opt);
                drawBase();
            }, 900000);
            // parseInt(tempDataInst.get(date) / 900000) * 900000 + 300000 — time of the last data upload
            // 300000 - 5 min; 900000 - 15 min; 20000 - 20 sec shift
        }, (920000 - date + (parseInt(date / 900000) * 900000 + 300000)) );
        
        $scope.zoom1 = false;
        $scope.zoom2 = false;
        
        /*** when hover over the point, display values in the topleft/rigth area ***/
        $scope.dispDataScreen = function (event) {
            var dispIndex = event.target.attributes[5]['value'];
            if (dispIndex < 84) {           // 168 points / 2
                $scope.zoom1 = true;
            } else {
                $scope.zoom2 = true;
            }
       
            $scope.zoomTemp = $scope.dispData[event.target.attributes[5]['value']].numTemp;
            $scope.zoomHum = $scope.dispData[event.target.attributes[5]['value']].numHum;
        };
        $scope.hideDataScreen = function () {
            $scope.zoom1 = false;
            $scope.zoom2 = false;
        }
    };

    

    

}());
