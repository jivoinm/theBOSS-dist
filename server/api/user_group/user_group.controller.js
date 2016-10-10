'use strict';

var _ = require('lodash');
var UserGroup = require('./user_group.model');

// Get list of user_groups
exports.index = function(req, res) {
  UserGroup.find(function (err, user_groups) {
    if(err) { return handleError(res, err); }
    return res.status(200).json(user_groups);
  });
};

// Get a single user_group
exports.show = function(req, res) {
  UserGroup.findById(req.params.id, function (err, user_group) {
    if(err) { return handleError(res, err); }
    if(!user_group) { return res.status(404).send('Not Found'); }
    return res.json(user_group);
  });
};

// Creates a new user_group in the DB.
exports.create = function(req, res) {
  UserGroup.create(req.body, function(err, user_group) {
    if(err) { return handleError(res, err); }
    return res.status(201).json(user_group);
  });
};

// Updates an existing user_group in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  UserGroup.findById(req.params.id, function (err, user_group) {
    if (err) { return handleError(res, err); }
    if(!user_group) { return res.status(404).send('Not Found'); }
    var updated = _.merge(user_group, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.status(200).json(user_group);
    });
  });
};

// Deletes a user_group from the DB.
exports.destroy = function(req, res) {
  UserGroup.findById(req.params.id, function (err, user_group) {
    if(err) { return handleError(res, err); }
    if(!user_group) { return res.status(404).send('Not Found'); }
    user_group.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.status(204).send('No Content');
    });
  });
};

function handleError(res, err) {
  return res.status(500).send(err);
}