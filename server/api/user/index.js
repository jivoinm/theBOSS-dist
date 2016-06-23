'use strict';

var express = require('express');
var controller = require('./user.controller');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(), controller.query);
router.delete('/:id', auth.isAuthenticated(), auth.hasRole('admin'), controller.destroy);
router.post('/:id/role/:role',auth.isAuthenticated(), auth.hasRole('admin'), controller.updateRole);
router.post('/:id/groups',auth.isAuthenticated(), auth.hasRole('admin'), controller.updateGroups);
router.get('/me', auth.isAuthenticated(), controller.me);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.put('/:id/resetPassword', auth.isAuthenticated(), controller.resetPassword);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/:id', auth.isAuthenticated(), controller.update);
router.post('/', controller.create);

module.exports = router;
