#!/usr/bin/env nodejs

'use strict';

const path = require('path');
const util = require('util');

const UrlShortener = require('./url-shortener');

const COMMANDS = {
  add: [ UrlShortener.prototype.add, 'LONG_URL' ],
  clear: [ UrlShortener.prototype.clear ],
  count: [ UrlShortener.prototype.count, 'URL' ],
  deactivate: [ UrlShortener.prototype.deactivate, 'URL' ],
  query: [ UrlShortener.prototype.query, 'SHORT_URL' ],
};

/** Top level routine: scriptName is name by which script was invoked
 *  and args are remaining arguments.
 */
async function go(scriptName, args) {
  const [ domain, dbUrl, cmd, ...rest ] = args
  const info = COMMANDS[cmd];
  if (!info || info.length - 1 !== rest.length) usage(scriptName);
  let shortener = null;
  try {
    shortener = await UrlShortener.make(dbUrl, domain);
    if (shortener.error) {
      console.error(shortener.error.message);
      shortener = null;
    }
    else {
      const result = await info[0].apply(shortener, rest);
      if (result.error) {
	console.error(result.error.message);
      }
      else {
	console.log(result);
      }
    }
  }
  finally {
    if (shortener) await shortener.close();
  }
}


const CMD_WIDTH = 12;

/** Print usage message and exit. */
function usage(scriptName) {
  let msg = `${scriptName} SHORTENER_BASE DB_URL COMMAND...\n`;
  msg += '  where COMMAND is one of:';
  Object.entries(COMMANDS).
    forEach(([k, v]) => {
      const rands = v.length === 1 ? '' : ' ' + v.slice(1).join(' ');
      const space = ' '.repeat(CMD_WIDTH - k.length);
      msg += `\n${k}${space}${rands}`;
    });
  console.error(msg);
  process.exit(1);
}

//top-level code
async function cli() {
  const scriptName = path.basename(process.argv[1]);  
  if (process.argv.length < 4) {
    usage(scriptName);
  }
  await go(scriptName, process.argv.slice(2));
}

module.exports = cli;
