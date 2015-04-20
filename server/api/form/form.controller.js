'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Form = mongoose.model('Form');

// Get list of forms
exports.index = function(req, res) {
  Form.find(function (err, forms) {
    if(err) { return handleError(res, err); }
    return res.json(200, forms);
  });
};

// Get a single form
exports.show = function(req, res) {
  Form.findById(req.params.id, function (err, form) {
    if(err) { return handleError(res, err); }
    if(!form) { return res.send(404); }
    return res.json(form);
  });
};

// Creates a new form in the DB.
exports.create = function(req, res) {
  Form.create(req.body, function(err, form) {
    if(err) { return handleError(res, err); }
    return res.json(201, form);
  });
};

// Updates an existing form in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Form.findById(req.params.id, function (err, form) {
    if (err) { return handleError(res, err); }
    if(!form) { return res.send(404); }
    var updated = _.merge(form, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, form);
    });
  });
};

// Deletes a form from the DB.
exports.destroy = function(req, res) {
  Form.findById(req.params.id, function (err, form) {
    if(err) { return handleError(res, err); }
    if(!form) { return res.send(404); }
    form.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}


exports.createOrUpdate = function (req, res) {
    req.body.owner = req.user.owner;
    if (req.body._id) {
        var id = req.body._id;
        delete req.body._id;
        Form.update({_id: id}, req.body, { upsert: true }, function (err, form) {
            if (err) return res.json(400, err);
            return res.send('updated: '+form);
        });
    } else {
        var project = new Form(req.body);
        project.save(function (err, form) {
            if (err) return res.json(400, err);
            return res.send(form);
        });
    }
};

exports.deleteForm = function(req, res){
    Form.findByIdAndRemove(req.params.id, function(err){
        if (err) return res.json(400, err);
        return res.send({message:'deleted with success'});
    });
};

exports.getFormsForModule = function (req,res){
    if(req.user){
      var query = {owner:req.user.owner,module:req.params.module};
      Form.find({}, function(err,projects){
        if(err) res.json(400,err);
        return res.send(projects);
      });
    }else{
      return res.send({message:'there is no user in the request'});
    }
};

exports.addField = function (req,res){
    if(req.user){
        var field = req.body;
        var target = req.params.target;
        var query = {
            owner: req.user.owner,
            _id:req.params.id
        };
        var setValue= {};
        setValue.$push = {};
        setValue.$push[target] = field;

        Form.update(
            query,
            setValue,
           function(err,updateCount){
                if(err) return res.json(400,err);
                Form.findById(req.params.id, function (err, form) {
                    return res.send(form);
                });
            });
    }
};

exports.updateField = function (req,res){
    if(req.user){
        var field = req.body;
        var target = req.params.target;
        var query ={};
        query[target+'._id'] = req.params.targetId;
        var setValue= {};
        setValue.$set = {};
        setValue.$set[target + '.$'] = field;
        Form.update(
            query,
            setValue,
           function(err,updateCount){
                console.log('error', err);
                console.log('updated', updateCount);
                if(err) return res.json(400,err);
                Form.findById(req.params.id, function (err, form) {
                    return res.send(form);
                });
            });
    }
};

exports.deleteField = function (req, res){
    Form.findOneAndUpdate({
        owner: req.user.owner,
        _id: req.params.id
    }, {
        $pull: {'fields': {_id: req.params.fieldId}}
    }, { safe: true }, function(err, form){
        if(err) res.json(err);
        return res.send(form);
    });
};
