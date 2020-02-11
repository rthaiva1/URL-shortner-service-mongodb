#!/usr/bin/env nodejs

const cli = require('./shortener-cli');

(async function() { await cli(); })().catch(err => console.error(err));
