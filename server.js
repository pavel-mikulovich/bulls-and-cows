var _ = require('lodash');
var express = require('express');
var api = require('./api/api');
var app = express();

var http = require('http').createServer(app);
var io = require('socket.io').listen(http);

app.use(express.static('public'));
app.use(express.json());
app.use('/api', api);

http.listen(process.env.PORT || 3000);

app.get('/users', function (req, res) {
    res.send({active: _.values((io.nsps['/' + req.query.room] || {}).sockets).length});
});

app.post('/create-room', function (req, res) {
    var roomName = req.body.room;
    if (io.nsps['/' + roomName]) return res.json('ok');

    var room = io.of('/' + roomName);
    room.on('connection', function (socket) {
        broadcastOthers('connected')();
        socket.on('competitor-number', broadcastOthers('competitor-number'));
        socket.on('competitor-guess', broadcastOthers('competitor-guess'));
        socket.on('guess-checked', broadcastAll('guess-checked'));
        socket.on('disconnect', broadcastOthers('disconnected'));

        function broadcastAll(eventName) {
            return function (params) {
                room.emit(eventName, params || {});
            }
        }

        function broadcastOthers(eventName) {
            return function (params) {
                socket.broadcast.emit(eventName, params || {});
            }
        }
    });

    res.json('ok');
});
