'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TimeoffSchema = new Schema({
  detail: String,
  type: String,
  from: Date,
  to: Date,
  approved: { type:Boolean, default: false },
  createdBy: {
      user_id: {type: Schema.Types.ObjectId, ref: 'User'},
      name: String,
      email: String
  }
});

module.exports = mongoose.model('Timeoff', TimeoffSchema);
