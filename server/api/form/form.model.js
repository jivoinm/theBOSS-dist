'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var FieldSchema = new Schema({
    order: Number,
    title: String,
    type: String,
    value: String,
    require: Boolean,
    show_options: String,
    show_when: String
});


var FormSchema = new Schema({
    owner: String,
    formName: String,
    module: String,
    required: Boolean,
    fields: [FieldSchema],
    tasks: [
        {
            priority: Number,
            title: String,
            duration: String,
            statusOptions: String
        }
    ]
    },
    { autoIndex: false }
);

FormSchema
    .path('formName')
    .validate(function (form_name, respond) {
        return form_name.length ? respond(true) : respond(false);
    }, 'The specified project name cannot be blank.');

//validate name not already exists
FormSchema
    .path('formName')
    .validate(function (value, respond) {
        var self = this;
        var test = {formName: value, owner: self.owner};
        this.constructor.findOne(test, function (err, form) {
            if (err) throw err;
            if (form) {
                if (self._id === form._id) return respond(true);
                return respond(false);
            }
            return respond(true);
        });
    }, 'The specified project name is already exist on the same owner.');

/**
 * Methods
 */
FormSchema.statics.findOwnerForms = function (ownerName, cb) {
    this.find({owner: ownerName}, cb);
};

module.exports = mongoose.model('Form', FormSchema);
module.exports = mongoose.model('Field', FieldSchema);
