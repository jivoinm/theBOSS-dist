'use strict';

var _ = require('lodash');
var Order = require('./order.model');
var fs = require('fs');
var moment = require('moment');
var Project = require('../form/form.model');
var User = require('../user/user.model');
var util = require('util');
var path = require('path');

function QueryOrders(queryOrders, sort, page, limit, res, selectFields) {
  var query = Order.find(queryOrders);
  if(limit){
    limit = parseInt(limit);
  }

  if(!selectFields){
    query.select('group customer.name customer.ship_to customer.bill_to po_number createdBy forms last_updated_by created_on last_updated_on date_required installation_date installation_by.name shipped_date status services doors');
  }else{
    query.select(selectFields);
  }
  if(sort){
    query.sort(sort);
  }

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
  if(order.forms){
    var finished = _.all(order.forms, function (form) {
        var isFinished = _.all(form.tasks, function (task){
            return (task.status && task.status === 'done');
        });
        return isFinished;
    });

    var inProgress = _.any(order.forms, function (form) {
        var status = _.any(form.tasks, function (task){
            return (task.status && task.status === 'in progress' || task.status === 'done');
        });
        return status;
    });

    order.status = finished ? 'finished' : inProgress ? 'in progress' : order.status;
  }
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
      page = req.query.page || 1;
      limit = req.query.limit || 25;
  }

  var queryOrders = {
          owner: req.user.owner,
          '$or': [{status: 'approved'}, {status: 'in progress'}],
          'forms.tasks': {$elemMatch: {$or: [{status: {$exists:false}}, {status:'in progress'}]}}
      };

  if(req.user.groups && req.user.groups.length > 0){
    queryOrders['group'] = {$in: req.user.groups};
  }


  Order.aggregate({$match: queryOrders},
      {$project: {
          'customer.name': 1,
          'customer.ship_to': 1,
          'customer.bill_to': 1,
          'po_number': 1,
          'createdBy': 1,
          'forms': 1,
          'last_updated_by': 1,
          'created_on': 1,
          'last_updated_on': 1,
          'date_required': {
              $cond: [ '$installation_date', '$installation_date', '$date_required' ]
             },
          'installation_by.name': 1,
          'shipped_date': 1,
          'status': 1,
          'services': 1,
          'doors': 1
        }},
        {$sort: {date_required: 1}},
        {$skip: (page * limit) - limit},
        {$limit: (limit * 1)}
      )
      .exec(function(err, orders){
          if(err) return res.json(400,err);
           Order.count(queryOrders).exec(function (err, count) {
                return res.json({
                    orders: orders,
                    page: page,
                    totalOrders: count
                });
            });
      });
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

  if(req.user.groups && req.user.groups.length > 0){
      queryOrders['group'] = {$in: req.user.groups};
  }

  new QueryOrders(queryOrders, {date_required:-1},page,limit, res);
};

exports.accessories = function(req,res){
  var page, limit, load_all = false;
  if(req.query){
      page = req.query.page;
      limit = req.query.limit;
      load_all = req.query.all || false;
  }

  var query = {
    owner: req.user.owner,
    ordered_accessories: {
      $elemMatch: {
        quantity: {$exists: true},
        from_manufacturer: {$exists: true}
      }
    }
  };

  if(req.user.groups && req.user.groups.length > 0){
      query['group'] = {$in: req.user.groups};
  }

  if(!load_all){
      query['ordered_accessories.received'] = false;
  }

  new QueryOrders(query, {date_required:-1},page,limit, res,'customer po_number createdBy ordered_accessories');
};

exports.comments = function(req,res){
  var match = {$match: {owner: req.user.owner}};
  if(req.user.groups && req.user.groups.length > 0){
    match.$match['group'] = {$in: req.user.groups};
  }
  Order.aggregate(match,
      {$unwind: '$comments'},
      {$sort: {'comments.created_on':1}},
      {$group: {_id: '$_id',po_number:{$first: '$po_number'}, comments: {$push: '$comments'}}})
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

      if(req.user.groups && req.user.groups.length > 0 && !req.query.date_required){
        queryOrders.$or = [
          {group: {$in: req.user.groups}},
          {'createdBy.user_id': req.user._id}
          ];
      }

      var page, limit, sort;
      if(req.query){
          if(req.query.text){
              var queryText = new RegExp(req.query.text,'i');
              queryOrders.$or = [{'customer.name': queryText},{'customer.ship_to': queryText},
              {'forms.fields': {$elemMatch: {'value': queryText}}},
              {po_number: queryText},
              {'createdBy.name': queryText},
              ];
          }
          if(req.query.status){
              queryOrders.status = new RegExp(req.query.status,'i');
          }
          if(req.query.date_required){
            queryOrders.date_required = {
              '$gte': new Date(moment(req.query.date_required).format('YYYY-MM-DD')),
              '$lt': new Date(moment(req.query.date_required).add(1,'d').format('YYYY-MM-DD'))};
          }
          page = req.query.page;
          limit = req.query.limit;
          sort = req.query.sort || {date_required:-1};
      }

      new QueryOrders(queryOrders, sort, page,limit, res);
  }
};

exports.services = function (req, res) {
  if (req.user) {
      var queryOrders = {
          owner: req.user.owner
      };

      if(req.user.groups && req.user.groups.length > 0){
         queryOrders.$or = [
          {group: {$in: req.user.groups}},
          {'createdBy.user_id': req.user._id}
          ];
      }

      var page, limit;
      if(req.query) {
          if(req.query.text) {
              var queryText = new RegExp(req.query.text, 'i');
              queryOrders.$or = [
                {'customer.name': queryText},{'customer.ship_to': queryText},
                { 'forms.fields': { $elemMatch: {'value': queryText} }},
                { po_number: queryText },
                { 'createdBy.name': queryText },
              ];
          }

          if(req.query.status) {
              queryOrders.services = {
                $elemMatch: {
                  completed: req.query.status === 'finished'
                }
              };
          } else {
            if(req.query.approved){
              queryOrders.services = {
                $elemMatch: {
                  approved: true,
                  completed: false
                }
              };
          } else {
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
  var match = { $match: {$or: [
     { services: { $elemMatch: { approved: false, completed: false }}},
     { services: { $elemMatch: { approved: true, completed: false }}}
   ],
   owner: req.user.owner
     }
  };


  if(req.user.groups && req.user.groups.length > 0){
    match.$match['group'] = {$in: req.user.groups};
  }

 Order.aggregate([ match,
  { $unwind: '$services'},
  { $match: { $or: [{'services.approved': true, 'services.completed': false}, {'services.approved': false, 'services.completed': false}] }},
  { $group: {_id: '$_id', po_number: { '$first': '$po_number' }, customer: {'$first': '$customer'} , services: {$push: '$services'}}}
  ],
  function(err, orders){
        if (err) res.json(400, err);
        return res.json(orders);
  });
};

exports.newAndNotCompletedServicesOlderThanTwoWeeks = function (req, res) {
  var match = { $match: {$or: [
     { services: { $elemMatch: { approved: false, completed: false }}},
     { services: { $elemMatch: { approved: true, completed: false }}}
    ],
    services: {$elemMatch: { date: { $lte: new Date(+new Date() - 12096e5)}}},
    owner: req.user.owner
   }
  };

  if(req.user.groups && req.user.groups.length > 0){
    match.$match['group'] = {$in: req.user.groups};
  }

 Order.aggregate([ match,
  { $unwind: '$services'},
  { $match: { $or: [{'services.approved': true, 'services.completed': false}, {'services.approved': false, 'services.completed': false}],
              'services.date': { $lte: new Date(+new Date() - 12096e5)}
            }
  },
  { $group: {_id: '$_id', po_number: { '$first': '$po_number' }, customer: {'$first': '$customer'} , services: {$push: '$services'}}}
  ],
  function(err, orders){
        if (err) res.json(400, err);
        return res.json(orders);
  });
};

exports.loadOrdersByStatusAndPeriod = function (req, res){
  var queryOrders = {};
  queryOrders.$or = [];
  queryOrders.$and = [{
      owner: req.user.owner,
  }];
  if(req.user.groups && req.user.groups.length > 0){
       queryOrders.$and = [{$or: [
          {group: {$in: req.user.groups}},
          {'createdBy.user_id': req.user._id}]}
          ];
  }

  queryOrders.$or.push({ date_required: {'$gte': moment(req.params.from).format(), '$lt': moment(req.params.to).format()} });
  queryOrders.$or.push({ installation_date: {'$gte': moment(req.params.from).format(), '$lt': moment(req.params.to).format()} });
  queryOrders.$or.push({ shipped_date: {'$gte': moment(req.params.from).format(), '$lt': moment(req.params.to).format()} });

  if(req.params.status){
    queryOrders.status = new RegExp(req.params.status,'i');
  } else {
    if(req.params.approved && req.params.completed){

      queryOrders.$and.push({ services: { $elemMatch: { date: {'$gte': moment(req.params.from).format(), '$lt': moment(req.params.to).format()}}} });
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

  if(req.query.text && req.query.text !== ''){
      var queryText = new RegExp(req.query.text,'i');
      queryOrders.$or = [];
      queryOrders.$or.push({'customer.name': queryText});
      queryOrders.$or.push({'customer.ship_to': queryText});
      queryOrders.$or.push({'forms.fields': {$elemMatch: {'value': queryText}}});
      queryOrders.$or.push({po_number: queryText});
      queryOrders.$or.push({'createdBy.name': queryText});
  }

  Order.find(queryOrders, {},
    function (err, orders){
      if (err) res.json(400, err);
      return res.json(orders);
  });
};

exports.loadOtherGroupOrdersByStatusAndPeriod = function (req, res){
  var queryOrders = {};
  queryOrders.$and = [];
  queryOrders.$or = [];
  queryOrders.$and.push({owner: req.user.owner});

  if(req.user.groups && req.user.groups.length > 0){
     queryOrders.group = { $not: {$in: req.user.groups }};
     queryOrders['createdBy.user_id'] = { $not: {$eq: req.user._id }};
  }

  queryOrders.$or.push({installation_date: {
    '$gte': new Date(req.params.from),
    '$lt': new Date(req.params.to)
  }});
  queryOrders.$or.push({date_required: {
    '$gte': new Date(req.params.from),
    '$lt': new Date(req.params.to)
  }});


  Order.aggregate(
    {$match: queryOrders},
    {$project: {
                date_required_day: { $dayOfMonth: [{$ifNull: ['$installation_date', '$date_required']}]},
                date_required_month: { $month: [{$ifNull: ['$installation_date', '$date_required']}]},
                date_required_year: { $year: [{$ifNull: ['$installation_date', '$date_required']}]}
            }
    },
    {
        $group: {
            _id: {
                year: '$date_required_year',
                month: '$date_required_month',
                day: '$date_required_day'
                },
                totalProjects: {$sum: 1}
            }

    },
    {'$sort': {date: 1}})
  .exec(function (err, orders){
      if (err) res.json(400, err);
      return res.json(orders);
  });
};

exports.loadOtherGroupServicesByStatusAndPeriod = function (req, res){
  var queryOrders = {
    owner: req.user.owner
  };

  if(req.user.groups && req.user.groups.length > 0){
     queryOrders.group = { $not: {$in: req.user.groups }};
     queryOrders['createdBy.user_id'] = { $not: {$eq: req.user._id }};
  }

  queryOrders['services.date'] = {
      '$gte': new Date(req.params.from),
      '$lt': new Date(req.params.to)
    };

  Order.aggregate(
    {$unwind: '$services'},
    {$match: queryOrders},
    {$project: {
            day: { $dayOfMonth: '$services.date'},
            month: { $month: '$services.date'},
            year: { $year: '$services.date'}
    }},
    {$group: {
        _id: {
            day: '$day',
            month: '$month',
            year: '$year'
            },
         totalServices: {$sum: 1}
        }
    },
    {'$sort': {'services.date': 1}})
  .exec(function (err, orders){
      if (err) res.json(400, err);
      return res.json(orders);
  });
};

exports.loadServicesByStatusAndPeriod = function (req, res){
 var queryOrders = {
    owner: req.user.owner
  };

  if(req.user.groups && req.user.groups.length > 0){
       queryOrders.$or = [
          {group: {$in: req.user.groups}},
          {'createdBy.user_id': req.user._id}
          ];
  }

  queryOrders['services.date'] = {
      '$gte': new Date(req.params.from),
      '$lt': new Date(req.params.to)
    };

  var serviceQuery = 1;
  if(req.params.approved && req.params.completed){
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
  Order.findOne({ _id: req.params.id, owner: req.user.owner}, function (err, order){
      if (err) res.json(400, err);
      order.status = req.params.status;

      order.save(function (err, orderUpdated){
        if (err) return res.json(400, err);
        return res.send(orderUpdated);
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
      order.group = order.group || (req.user.groups.length===1 ? req.user.groups[0] : null);
      order.createdBy = {
          user_id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          groups: req.user.groups
      };
      order.last_update_by = {
          user_id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          groups: req.user.groups
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
      //if (!part.filename) return;
      //if (part.name !== 'file') return part.resume();
      file = {};
      file.filename = part.filename;
      file.size = 0;
      part.on('data', function(buf){
          file.size += buf.length;
      });
      var pathToUpload = path.join(__dirname, '/../../../uploads/');
      var out = fs.createWriteStream(pathToUpload+ part.filename);
      part.pipe(out);
  });

  // parse the form
  form.parse(req);
  //res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
};


exports.fileDownload = function(req, res){
  if(!req.params.filename){
    return res.json({error: 'Missing file name'});
  }
  res.sendfile(req.params.filename, {root: path.join(__dirname, '/../../../uploads')}); // Set disposition and send it.
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
