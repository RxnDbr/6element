'use strict';

var React = require('react');
var io = require('socket.io-client');

var Application = React.createFactory(require('./Components/Application.js'));
var makeMap = require('../../_common/js/makeMap.js');
var resetUpdate = require('../../_common/js/resetUpdate.js');
var serverAPI = require('./serverAPI.js');

var socket = io();

var errlog = console.error.bind(console);

function render(){
    React.render(new Application(topLevelStore), document.body);
}

function updateDB(data){
    // send request to server according to the desired table

    var delta = {};
    delta[data.field] = data.value;

    var obj = {
        id: data.id,
        delta: delta
    };
    
    switch (data.table){
        case 'place':
            serverAPI.updatePlace(obj)
            .then(function(res){
                console.log('Places database updated successfully');
                var ant = topLevelStore.antsByPlace.get(res.id);
                Object.assign(ant, res);
                updateLocal(ant);
            })
            .catch(function(){
                console.log('Places database didn\'t update correctly');
                refreshView();
            });
            break;

        case 'sensor':
            serverAPI.updateSensor(obj)
            .then()
            ;
            break;

        default:
            console.log('No such table as ', data.table);
            break;
    }        

}

function updateLocal(ant){
    topLevelStore.antsByPlace.set(ant.installed_at, ant);
    topLevelStore.antsByPlace.set(ant.id, ant);

    render();
}

function refreshView(){
    serverAPI.getAllSensors()
    .then(function(sensors){

        topLevelStore.ants = makeMap(sensors, 'id');
        topLevelStore.antsByPlace = makeMap(sensors, 'installed_at');
        resetUpdate(topLevelStore.ants);

        console.log('store', topLevelStore.ants);
        
        render();
    })
    .catch(errlog);
}

var topLevelStore = {
    ants: undefined,
    antsByPlace: undefined,
    onChange: updateDB
};

// Initial rendering
refreshView();

// THIS WILL BE NEEDED WHEN QUIPU SIGNAL IS INCORPORATED INTO DATA MSGS
// socket.on('data', function (msg){
//     var id = msg.socketMessage.sensor_id;
//     var signal = msg.socketMessage.quipu.signal;

//     var updatingAnt = topLevelStore.ants.get(id);
//     updatingAnt.signal = signal;

//     render();
// });

socket.on('status', function (msg) {

    // GET DATA
    var id = msg.sensorId;
    var status = msg.socketMessage;

    resetUpdate(topLevelStore.ants);

    var updatingAnt = topLevelStore.ants.get(id);
    updatingAnt.quipu_status = status.quipu.state;
    updatingAnt.signal = status.quipu.signal;
    updatingAnt.sense_status = status.sense;
    updatingAnt.latest_input = status.info.command;
    updatingAnt.latest_output = status.info.result;
    updatingAnt.isUpdating = true;
    
    // console.log('ant', updatingAnt);

    render();

    setTimeout(function(){
        resetUpdate(topLevelStore.ants);
        render();
    }, 200);

});



// // USE TO SIMULATE A STATUS SENDING TO SERVER FROM SENSOR

// var quipu = require('quipu/parser.js');
// var sendReq = require('../../_common/js/sendReq.js');

// setInterval(function(){

// 	var id = Math.floor(Math.random() * 28);

// 	quipu.encode({
// 		info: {
// 			command: 'connect3G',
// 			result: 'OK'
// 		},
// 		quipu: '3G_connected',
// 		sense: 'recording'
// 	})
// 	.then(function(msg){
// 		var toSend = {
// 			From: 'xxx' + id,
// 			Body: '2' + msg
// 		};

// 		console.log('Sending', toSend);
// 		sendReq('POST', '/twilio', toSend);
// 	})
// 	.catch(function(err){
// 		console.log(err);
// 	});

// }, 3000);

