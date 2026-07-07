const express = require('express');
const authController = require('../controller/authController');
const { loginSchema } = require('../validator/authValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
