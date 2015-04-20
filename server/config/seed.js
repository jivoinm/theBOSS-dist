/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var User = require('../api/user/user.model');
var Form = require('../api/form/form.model');

User.find({}).remove(function() {
  User.create({
    provider: 'local',
    name: 'Test User',
    email: 'test@test.com',
    password: 'test',
    owner: 'Owner1'
  }, {
    provider: 'local',
    role: 'admin',
    name: 'Admin',
    email: 'admin@admin.com',
    password: 'admin',
    owner: 'Owner1'
  }, {
    provider: 'local',
    role: 'admin',
    name: 'Admin',
    email: 'admin@admin.com',
    password: 'admin',
    owner: 'Owner2'
  }, function() {
      console.log('finished populating users');
    }
  );
});

Form.find({}).remove(function() {
  Form.create({name:'Form1', owner:'Owner1'}, function() {
      console.log('finished populating forms');
    }
  );
});
