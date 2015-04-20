'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var OrderSchema = new Schema({
    owner: String,
    createdBy: {
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        name: String,
        email: String
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
        name: String,
        bill_to: String,
        ship_to: String,
        email: String,
        phone: String,
        cell: String,
        is_private: { type:Boolean, default:true }
    },
    status: String,
    po_number: String,
    date_required: Date,
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

module.exports = mongoose.model('Order', OrderSchema);
