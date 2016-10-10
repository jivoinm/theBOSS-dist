'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var UserGroupSchema = new Schema({
  name: String,
  info: String
});

module.exports = mongoose.model('UserGroup', UserGroupSchema);