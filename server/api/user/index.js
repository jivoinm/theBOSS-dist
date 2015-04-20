'use strict';

var express = require('express');
var controller = require('./user.controller');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(), controller.query);
router.delete('/:id', auth.isAuthenticated(), auth.hasRole('admin'), controller.destroy);
router.post('/:id/:role',auth.isAuthenticated(), auth.hasRole('admin'), controller.updateRole);
router.get('/me', auth.isAuthenticated(), controller.me);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/:id', auth.isAuthenticated(), controller.update);
router.post('/', controller.create);

module.exports = router;
