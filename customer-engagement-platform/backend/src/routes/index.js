const express = require('express');
const env = require('../config/env');
const v1Routes = require('./v1');

const router = express.Router();

router.use(`/${env.API_VERSION}`, v1Routes);

module.exports = router;
