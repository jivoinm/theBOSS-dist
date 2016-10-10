/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var UserGroup = require('./user_group.model');

exports.register = function(socket) {
  UserGroup.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  UserGroup.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('user_group:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('user_group:remove', doc);
}