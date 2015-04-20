/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Timeoff = require('./timeoff.model');

exports.register = function(socket) {
  Timeoff.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  Timeoff.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('timeoff:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('timeoff:remove', doc);
}