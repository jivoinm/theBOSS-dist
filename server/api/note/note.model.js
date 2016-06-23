'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var NoteSchema = new Schema({
    owner: String,
    createdBy: {
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        name: String,
        email: String,
        role: String,
        groups: String
    },
    order: {type: Schema.Types.ObjectId, ref: 'Order'},
    resolved: {type:Boolean, default:false},
    resolved_by: {type: Schema.Types.ObjectId, ref: 'User'},
    resolved_on: Date,
    from: {type: Schema.Types.ObjectId, ref: 'User'},
    content: String,
    posted_on: Date
});

module.exports = mongoose.model('Note', NoteSchema);
