'use strict';

var _ = require('lodash');
var Note = require('./note.model');

// Get list of notes
exports.index = function(req, res) {
  if (req.user) {
    var query = {owner: req.user.owner};
    if(req.query.resolved){
        query.resolved = req.query.resolved;
    }

    if(req.query.orderid){
        query.order = req.query.orderid;
    }
    Note.find(query)
    .populate({path:'order', select:'_id po_number'})
    .populate({path:'from', select:'_id name email'})
    .sort({posted_on: 1})
    .exec(function (err, notes) {
        if(err) return res.json(400,err);
        return res.send(notes);
    });
  }else{
    return res.send({message: 'No user is found'});
  }
};

// Get a single note
exports.show = function(req, res) {
  Note.findById(req.params.id, function (err, note) {
    if(err) { return handleError(res, err); }
    if(!note) { return res.send(404); }
    return res.json(note);
  });
};

// Creates a new note in the DB.
exports.create = function(req, res) {
  if (req.user) {
    var note = req.body;
    note.from = req.user._id;
    note.owner = req.user.owner;
    note.posted_on = new Date();
    Note.create(note, function (err, note) {
        if(err) return res.json(400,err);
        return res.send(note);
    });
  }else{
    return res.send({message: 'No user is found'});
  }
};

// Updates an existing note in the DB.
exports.update = function(req, res) {
  var note = req.body;
  note.from = note.from._id;
  note.order = note.order._id;
  note.resolved_by = req.user._id;
  note.resolved_on = new Date();
  delete note._id;
  Note.update({_id:req.params.id},note, {upsert:true}, function (err, count) {
      if(err) return res.json(400,err);
      Note.findById(req.params.id, function (err, msg){
          if(err) return res.json(400,err);
          return res.send(msg);
      });
  });
};

// Deletes a note from the DB.
exports.destroy = function(req, res) {
  Note.findById(req.params.id, function (err, note) {
    if(err) { return handleError(res, err); }
    if(!note) { return res.send(404); }
    note.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
