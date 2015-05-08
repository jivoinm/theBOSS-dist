'use strict';

var _ = require('lodash');
var Order = require('./order.model');
var fs = require('fs');
var moment = require('moment');
var Project = require('../form/form.model');
var User = require('../user/user.model');
var util = require('util');



function QueryOrders(queryOrders, sort, page, limit, res) {
  var query = Order.find(queryOrders)
      .select('customer.name po_number createdBy forms last_updated_by created_on last_updated_on date_required installation_date installation_by.name shipped_date status services doors')
      .sort(sort);
  if(page){
      query.skip((page * limit) - limit);
  }

  if(limit){
      query.limit(limit);
  }

  query.exec(function(err, orders){
      if(err) return res.json(400,err);
      Order.count(queryOrders).exec(function (err, count) {
          return res.json({
              orders: orders,
              page: page,
              totalOrders: count
          });
      });
  });
}

function FindOrder(req, callout){
  Order.findOne({
          _id: req.params.id,
          owner: req.user.owner
      }, function (err, order) {
          callout(err,order);
      });
}

function updateOrder(req, res, order){
  order.last_updated_by = {
      user_id: req.user._id,
      name: req.user.name,
      email: req.user.email
  };
  order.last_updated_on = new Date();
  var finished = _.all(order.forms, function (form) {
      var isFinished = _.all(form.tasks, function (task){
          return (task.status && task.status === 'done');
      });
      return isFinished;
  });

  var inProgress = _.any(order.forms, function (form) {
      var status = _.any(form.tasks, function (task){
          return (task.status && task.status !== 'done');
      });
      return status;
  });

  order.status = finished ? 'finished' : inProgress ? 'in progress' : order.status;
  Order.update({_id: req.params.id}, order, {upsert: true}, function (err, nrRecords, rawRecord) {
      if(err) return res.json(400,err);
      new FindOrder(req, function (err, order) {
          if (err) res.json(400, err);
          if(!order) res.json({error: 'This order does not exists'});
          return res.json(order);
      });
  });
}

exports.delete = function (req, res, next) {
  new FindOrder(req, function (err, order) {
      if (err) res.send(err);
      order.remove(function (){
          if (err) next(err);
          return res.json({message: 'deleted order'});
      });
  });
};

exports.loadOrder = function (req, res) {
  if(req.user && req.params.id){
      new FindOrder(req, function (err, order) {
          if (err) res.send(err);
          if(!order) res.json({error: 'This order does not exists'});
          return res.send(order);
      });
  }
};

exports.loadOrderProjectFields = function(req,res){
  if(req.user && req.params.id){
      new FindOrder(req, function (err, order) {
          if (err) res.send(err);
          if(!order) res.json({error: 'This order does not exists'});
          return res.json(order.projects);
      });
  }
};


exports.toDoTasks = function(req,res){
  var page, limit;
  if(req.query){
      page = req.query.page;
      limit = req.query.limit;
  }

  var queryOrders = {
          owner: req.user.owner,
          '$or': [{status: 'approved'}, {status: 'in progress'}],
          'forms.tasks': {$elemMatch: {$or: [{status: {$exists:false}}, {status:'in progress'}]}}
      };
  new QueryOrders(queryOrders, {date_required:-1},page,limit, res);
};

exports.shippingList = function(req,res){
  var page, limit;
  if(req.query){
      page = req.query.page;
      limit = req.query.limit;
  }

  var queryOrders = {
          owner: req.user.owner,
          shipped_date:{$exists: false},
          status: 'finished'
      };
  new QueryOrders(queryOrders, {date_required:-1},page,limit, res);
};

exports.accessories = function(req,res){
  var load_all = req.query.all || false;
  var query = {owner: req.user.owner};
  if(!load_all){
      query['ordered_accessories.received'] = false;
  }

  Order.find(query)
      .select('customer po_number createdBy ordered_accessories')
      .sort({date_required: -1})
      .exec(function(err, orders){
          if(err) return res.json(400,err);
          return res.send(orders);
      });
};

exports.comments = function(req,res){

  Order.aggregate({$match: {owner: req.user.owner}},
      {$unwind: "$comments"},
      {$sort: {"comments.created_on":1}},
      {$group: {_id: "$_id",po_number:{$first: "$po_number"}, comments: {$push: "$comments"}}})
      .exec(function(err, orders){
          if(err) return res.json(400,err);
          return res.send(orders);
      });
};


exports.loadUserLatest  = function (req, res) {
  if (req.user) {
      var queryOrders = {
          owner: req.user.owner,
          'createdBy.user_id': req.params.id
      };
      new QueryOrders(queryOrders, {date_required: -1},null,10, res);
  }
};

exports.loadLatest = function (req, res) {
  if (req.user) {
      var queryOrders = {
          owner: req.user.owner
      };

      var page, limit;
      if(req.query){
          if(req.query.text){
              var queryText = new RegExp(req.query.text,"i");
              queryOrders.$or = [{"customer.name": queryText},
              {"forms.fields": {$elemMatch: {"value": queryText}}},
              {po_number: queryText},
              {'createdBy.name': queryText},
              ];
          }
          if(req.query.status){
              queryOrders.status = new RegExp(req.query.status,"i");
          }
          page = req.query.page;
          limit = req.query.limit;
      }

      new QueryOrders(queryOrders, {date_required:-1},page,limit, res);
  }
};

exports.services = function (req, res) {
  if (req.user) {
      var queryOrders = {
          owner: req.user.owner
      };

      var page, limit;
      if(req.query){
          if(req.query.text){
              var queryText = new RegExp(req.query.text,"i");
              queryOrders.$or = [{"customer.name": queryText},
              {"forms.fields": {$elemMatch: {"value": queryText}}},
              {po_number: queryText},
              {'createdBy.name': queryText},
              ];
          }
          if(req.query.status){
              queryOrders.services = {
                $elemMatch: {
                  completed: req.query.status === 'finished'
                }
              };
          }else{
            if(req.query.approved){
              queryOrders.services = {
                $elemMatch: {
                  approved: true,
                  completed: false
                }
              };
            }else{
              queryOrders.services = {
                $exists: true
              };
              queryOrders.$where = 'this.services.length > 0';
            }
          }

          page = req.query.page;
          limit = req.query.limit;
      }
      new QueryOrders(queryOrders, {po_number: 1, customer: 1,services: 1}, page,limit, res);
    }
}

exports.newAndNotCompletedServices = function (req, res) {
 Order.aggregate([
   { $match: {$or: [
     { services: { $elemMatch: { approved: false, completed: false }}},
     { services: { $elemMatch: { approved: true, completed: false }}}
     ]
     }
  },
  { $unwind: '$services'},
  { $match: { $or: [{'services.approved': true, 'services.completed': false}, {'services.approved': false, 'services.completed': false}] }},
  { $group: {_id: '$_id', po_number: { '$first': '$po_number' }, customer: {'$first': '$customer'} , services: {$push: '$services'}}}
  ],
  function(err, orders){
        if (err) res.json(400, err);
        return res.json(orders);
  });
};

exports.loadOrdersByStatusAndPeriod = function (req, res){
  var queryOrders = {
      owner: req.user.owner,
  };
  queryOrders.$or = [];
  queryOrders.$or.push({ date_required: {"$gte": moment(req.params.from).format(), "$lt": moment(req.params.to).format()} });
  queryOrders.$or.push({ installation_date: {"$gte": moment(req.params.from).format(), "$lt": moment(req.params.to).format()} });
  queryOrders.$or.push({ shipped_date: {"$gte": moment(req.params.from).format(), "$lt": moment(req.params.to).format()} });

  if(req.params.status){

    queryOrders.status = new RegExp(req.params.status,"i");
  } else {
    if(req.params.approved !=null && req.params.completed !=null){
      queryOrders.$and = [];
      queryOrders.$and.push({ services: { $elemMatch: { date: {"$gte": moment(req.params.from).format(), "$lt": moment(req.params.to).format()}}} });
      queryOrders.$and.push({
        services: {
          $elemMatch: {
            approved: req.params.approved,
            completed: req.params.completed
          }
        }
      });
     }
  }

  if(req.query.text){
      var queryText = new RegExp(req.query.text,"i");

      queryOrders.$or.push({"customer.name": queryText});
      queryOrders.$or.push({"forms.fields": {$elemMatch: {"value": queryText}}});
      queryOrders.$or.push({po_number: queryText});
      queryOrders.$or.push({'createdBy.name': queryText});
  }

  Order.find(queryOrders, {po_number: 1, customer: 1, shipped_date: 1, installation_date: 1, date_required: 1, status: 1},
    function (err, orders){
      if (err) res.json(400, err);
      return res.json(orders);
  });
};

exports.loadServicesByStatusAndPeriod = function (req, res){
  var queryOrders = {
      owner: req.user.owner,
      $and: [
        { services: { $elemMatch: { date: {"$gte": moment(req.params.from).format(), "$lt": moment(req.params.to).format()}}} }
    ]
  };
  var serviceQuery = 1;
  if(req.params.approved !=null && req.params.completed !=null){
    queryOrders.$and.push({
      services: {
        $elemMatch: {
          approved: req.params.approved,
          completed: req.params.completed
        }
      }
    });
    serviceQuery = { $elemMatch: { approved: req.params.approved, completed: req.params.completed } };
   }

 Order.find(queryOrders, {po_number: 1, customer: 1, services: serviceQuery},
   function (err, orders){
     if (err) res.json(400, err);
     return res.json(orders);
 });
};

exports.unscheduled = function (req, res) {
  new QueryOrders({
      owner: req.user.owner,
      scheduled: false
  }, {date_required:-1},null,null, res);
};

exports.updateStatus = function (req, res){
  Order.update({ _id: req.params.id, owner: req.user.owner},
      {$set: {status: req.params.status}},
      function (err){
          if(err) return res.json(400,err);
          new FindOrder(req, function (err, order){
              if (err) return res.json(400, err);
              return res.send(order);
          });
      });
};

exports.updateCalendarDate = function (req, res){
  var update = {};
  update[req.params.property] = req.params.date;
  Order.update({ _id: req.params.id, owner: req.user.owner},
      {$set: update},
      function (err){
          if(err) return res.json(400,err);
          new FindOrder(req, function (err, order){
              if (err) return res.json(400, err);
              return res.send(order);
          });
      });
};


exports.createOrder = function(req,res){
  if(req.user){
      var order = req.body;
      order.status = order.status || 'new';
      order.createdBy = {
          user_id: req.user._id,
          name: req.user.name,
          email: req.user.email
      };
      order.last_update_by = {
          user_id: req.user._id,
          name: req.user.name,
          email: req.user.email
      };
      order.owner = req.user.owner;
      Order.create(order, function (err, order) {
          if (err) return res.json(400, err);
          return res.send(order);
      });
  }
};

exports.updateOrder = function(req,res){
  if(req.user){
      var id = req.params.id;
      var order = req.body;

      delete order._id;
      delete order.createdBy;

      if(order.installation_by && order.installation_by._id){
        var installedBy = User.findById(order.installation_by._id, function (err, user){
          order.installation_by = {
              user_id: user._id,
              name: user.name,
              email: user.email
          };
          new updateOrder(req, res, order);
        });
      }else{
        new updateOrder(req, res, order);
      }

  }else{
    res.json({error: 'This order does not exists'});
  }
};

exports.fileUpload = function (req, res, next){
  // create a form to begin parsing
  var multiparty = require('multiparty');
  var form = new multiparty.Form();
  var file;

  form.on('error', function (error){
      res.send(error);
  });
  form.on('close', function(){
      res.json(file);
  });

  // listen on part event for image file
  form.on('part', function(part){
      if (!part.filename) return;
      if (part.name !== 'file') return part.resume();
      file = {};
      file.filename = part.filename;
      file.size = 0;
      part.on('data', function(buf){
          file.size += buf.length;
      });
      var path = __dirname+'/../../../uploads/';
      fs.exists(path, function (exists){
        if(exists){
          var out = fs.createWriteStream(path+ part.filename);
          part.pipe(out);
        }else{
          fs.mkdir(path,function(){
            var out = fs.createWriteStream(path+ part.filename);
            part.pipe(out);
          });
        }
      });
  });


  // parse the form
  form.parse(req);
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
};

// Get list of orders
exports.index = function(req, res) {
  Order.find(function (err, orders) {
    if(err) { return handleError(res, err); }
    return res.json(200, orders);
  });
};

// Get a single order
exports.show = function(req, res) {
  Order.findById(req.params.id, function (err, order) {
    if(err) { return handleError(res, err); }
    if(!order) { return res.send(404); }
    return res.json(order);
  });
};

// Creates a new order in the DB.
exports.create = function(req, res) {
  Order.create(req.body, function(err, order) {
    if(err) { return handleError(res, err); }
    return res.json(201, order);
  });
};

// Updates an existing order in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Order.findById(req.params.id, function (err, order) {
    if (err) { return handleError(res, err); }
    if(!order) { return res.send(404); }
    var updated = _.merge(order, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, order);
    });
  });
};

// Deletes a order from the DB.
exports.destroy = function(req, res) {
  Order.findById(req.params.id, function (err, order) {
    if(err) { return handleError(res, err); }
    if(!order) { return res.send(404); }
    order.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
