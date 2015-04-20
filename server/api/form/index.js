'use strict';

var express = require('express');
var controller = require('./form.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();
/*
router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);
*/
router.post('/', auth.isAuthenticated(), controller.createOrUpdate);
router.post('/:id', auth.isAuthenticated(), controller.createOrUpdate);
router.delete('/:id', auth.isAuthenticated(), controller.deleteForm);
router.get('/:module', auth.isAuthenticated(), controller.getFormsForModule);
router.put('/:id/:target', auth.isAuthenticated(), controller.addField);
router.put('/:id/:target/:targetId', auth.isAuthenticated(), controller.updateField);
router.delete('/:id/field/:fieldId', auth.isAuthenticated(), controller.deleteField);
module.exports = router;
