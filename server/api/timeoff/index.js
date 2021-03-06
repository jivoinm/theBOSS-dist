'use strict';

var express = require('express');
var controller = require('./timeoff.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(),controller.index);
router.get('/query/:approved', auth.isAuthenticated(),controller.query);
router.get('/query/:dateFrom/:dateTo', auth.isAuthenticated(),controller.query);
router.get('/query/:approved/:dateFrom/:dateTo', auth.isAuthenticated(),controller.query);
router.get('/check', auth.isAuthenticated(),controller.checkDate);
router.get('/totalNewTimeoffs', auth.isAuthenticated(),controller.totalNewTimeoffs);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/', auth.isAuthenticated(), controller.create);
router.post('/:id', auth.isAuthenticated(), controller.update);
router.patch('/:id', auth.isAuthenticated(), controller.update);
router.delete('/:id', auth.isAuthenticated(), controller.destroy);

module.exports = router;
