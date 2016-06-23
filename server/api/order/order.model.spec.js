'use strict';

var should = require('should');
var app = require('../../app');
var Order = require('./order.model');

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var order = new Order({
  owner: 'Owner1',
  customer: {
    name: 'Customer1',
    ship_to: 'Ship to',
    phone: '12312312'
  },
  po_number: 'asd',
  date_required: new Date()
});

describe('Order Model', function() {
  before(function(done) {
    // Clear orders before testing
    Order.remove().exec().then(function() {
      done();
    });
  });

  afterEach(function(done) {
    Order.remove().exec().then(function() {
      done();
    });
  });

  it('should should save createdBy groups', function(done) {
    order.createdBy = {
      //user_id: req.user._id,
      name: 'req.user.name',
      email: 'req.user.email',
      role: 'req.user.role',
      groups: 'Group1", "Group2'
    };
    
    order.save(function (err, orderSaved) {
        should.exist(orderSaved.createdBy.groups);
        done();
    });
    
  });
});
