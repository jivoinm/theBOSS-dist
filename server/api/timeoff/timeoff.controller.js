'use strict';

var _ = require('lodash');
var Timeoff = require('./timeoff.model');

// Get list of timeoffs
exports.index = function(req, res) {
  var query = {};
  if(req.query.dateFrom && req.query.dateTo){
    query.from = {
      $gte: req.query.dateFrom
    };
    query.to = {
      $lte: req.query.dateTo
    };
  }

  if(req.query.approved){
    query.approved = req.query.approved;
  }

  if(req.user.role !== "admin"){
    query['createdBy.user_id'] = req.user._id;
  }

  Timeoff.find(query, function (err, timeoffs) {
    if(err) { return handleError(res, err); }
    return res.json(200, timeoffs);
  });
};

exports.totalNewTimeoffs = function(req, res) {
  var query = { approved: false};

  Timeoff.count(query, function (err, count) {
    if(err) { return handleError(res, err); }
    return res.json(200, {total: count});
  });
};
//check if something on the selected date
exports.checkDate = function(req, res) {
  var query = {};
  if(req.query.date){
    query.from = {
      $lte: req.query.date
    };
    query.to = {
      $gte: req.query.date
    };
  }

  query.approved = true;

  Timeoff.find(query, function (err, timeoffs) {
    if(err) { return handleError(res, err); }
    return res.json(200, timeoffs);
  });
};

// Get a single timeoff
exports.show = function(req, res) {
  Timeoff.findById(req.params.id, function (err, timeoff) {
    if(err) { return handleError(res, err); }
    if(!timeoff) { return res.send(404); }
    return res.json(timeoff);
  });
};

// Creates a new timeoff in the DB.
exports.create = function(req, res) {
  Timeoff.create(req.body, function(err, timeoff) {
    if(err) { return handleError(res, err); }
    return res.json(201, timeoff);
  });
};

// Updates an existing timeoff in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Timeoff.findById(req.params.id, function (err, timeoff) {
    if (err) { return handleError(res, err); }
    if(!timeoff) { return res.send(404); }
    var updated = _.merge(timeoff, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, timeoff);
    });
  });
};

// Deletes a timeoff from the DB.
exports.destroy = function(req, res) {
  Timeoff.findById(req.params.id, function (err, timeoff) {
    if(err) { return handleError(res, err); }
    if(!timeoff) { return res.send(404); }
    timeoff.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
