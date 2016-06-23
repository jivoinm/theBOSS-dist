'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var OrderSchema = new Schema({
    owner: {type: String, required: 'Owner is required on order'},
    group: String,
    createdBy: {
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        name: String,
        email: String,
        role: String,
        groups: [String]
    },
    doors: String,
    created_on: {type: Date, default: Date.now},
    last_updated_by: {
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        name: String,
        email: String
    },
    last_updated_on: {type: Date, default: Date.now},
    customer: {
        name: {type: String, required: 'Customer name is required'},
        bill_to: String,
        ship_to: {type: String, required: 'Customer ship to address is required'},
        email: String,
        phone: {type: String, required: 'Customer phone number is required'},
        cell: String,
        is_private: { type:Boolean, default:true }
    },
    status: String,
    po_number: {type: String, required: 'PO number is required'},
    date_required: {type: Date, required: 'Order date is required'},
    installation_date: Date,
    installation_by: {
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        name: String,
        email: String
    },
    shipped_date: Date,

    forms: [
        {
            formName: String,
            fields: {type: Array, default: []},
            tasks: {type: Array, default: []}
        }
    ],
    ordered_accessories:[{
        from_manufacturer: String,
        description: String,
        quantity: Number,
        items_received: Number,
        received: {type: Boolean, default: false},
        date_received: Date,
        received_by: {
            user_id: {type: Schema.Types.ObjectId, ref: 'User'},
            name: String,
            email: String
        },
    }],
    services:[{
        title: String,
        date: Date,
        details: String,
        done_by: {
            user_id: {type: Schema.Types.ObjectId, ref: 'User'},
            name: String,
            email: String
        },
        completed: {type: Boolean, default: false},
        approved: {type: Boolean, default: false}
    }],

    uploaded_files: {type: Array, default: []}
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});


/**
 * Methods
 */

OrderSchema.statics.queryOrders = function (query, sort, populate,limit) {

    var findExec = this.find(query).lean();
    if(populate)
        findExec.populate(populate);
    if(limit)
        findExec.limit(limit);
    if(sort)
        findExec.sort(sort);
    findExec.select('customer.name po_number createdBy.name created_on date_required status');
    return findExec.exec();
};

OrderSchema.virtual('doorsSelection').get( function(){
  return this.doors ? this.doors :
        (this.forms &&
        this.forms.length>0 &&
        this.forms[0].fields &&
        this.forms[0].fields.length > 0 ? this.forms[0].fields[0].value : '');
});

module.exports = mongoose.model('Order', OrderSchema);
