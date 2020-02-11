'use strict';

const assert = require('assert');
const mongo = require('mongodb').MongoClient;

function lookup(data,{ isMongo = false, isShort=false, isLong=false, isSHORTNER_DOMAIN=false } = {})
{
  let validity = false, port_indicator =false, mongo_indicator =false;
  if(isMongo === true)
  {
      if((/([a-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S\/?)*)/).test(data))
      {
        let regex = /([a-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S\/?)*)/;
        let matches = data.match(regex);
        if(matches[1] === "mongodb")
        {
          mongo_indicator =true;
        }
        if((1<=matches[5] && matches[5]<=65535) || !matches[5])
        {
          port_indicator =true;
        }
        if(matches[2].length<253)
        {
          validity = true;
        }
      }
  }
  else if(isShort === true)
  {
    if((/([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S\/?)*)/).test(data))
    {
      let regex = /([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S\/?)*)/;
      let matches = data.match(regex);
      if((1<=matches[5] && matches[5]<=65535) || !matches[5])
      {
        port_indicator =true;
      }
      if((matches[1].toLowerCase() === "https" || matches[1].toLowerCase() === "http") && (matches[1].length<253))
      {
        validity = true;
      }
    }
  }
  else if(isLong === true)
  {
    if((/([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S\/?)*)/).test(data))
    {
      let regex = /([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S\/?)*)/;
      let matches = data.match(regex);
      if((1<=matches[5] && matches[5]<=65535) || !matches[5])
      {
        port_indicator =true;
      }
      if((matches[1].toLowerCase() === "https" || matches[1].toLowerCase() === "http") && (matches[2].length<253))
      {
        validity = true;
      }
    }
  }
  else if(isSHORTNER_DOMAIN === true)
  {
    if(/[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?/.test(data))
    {
      let regex = /[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?/;
      let matches = data.match(regex);
      if(matches[0] === data)
      {
        validity = true;
      }
        if((1<=matches[2] && matches[2]<=65535) || !matches[2])
        {
          port_indicator =true;
        }
    }
  }

  return {valid : validity, port : port_indicator, valid_m : validity, port_m : port_indicator, mongo_m : mongo_indicator};
  }


class UrlShortener {

  /**
   *  The return value for each of the following methods must be
   *  an object.  If an error occurs, then the returned object must
   *  have an 'error' property which itself must be an object having
   *  at least the following 2 properties:
   *
   *   'code':   A short string which specifies the class of error
   *             which occurred.
   *   'message':A detailed string describing the error in as much
   *             detail as possible.
   *
   *  The specifications for the methods below specify the 'code'; the
   *  'message' can be any suitable description of the error.  The
   *  intent is that the 'code' property is suitable for use by
   *  machines while the 'message' property is suitable for use by
   *  humans.
   *
   *  When a URL is deactivated, any association for that URL is
   *  merely deactivated and not removed.  While deactivated, the
   *  association is not returned by the `query()` method until it is
   *  added again using the `add()` method.
   */

  /** Factory method for building a URL shortener with specified mongoDbUrl
   *  and shortenerBase.
   *
   *  The mongoDbUrl parameter must be a valid URL with scheme set
   *  to mongodb.
   *
   * The shortenerBase parameter must consists of a valid domain followed
   * by an optional port.
   *
   * If everything is ok, this factory method should return a new
   * instance of this.
   *
   * If an error occurs, then the following error codes should be
   * returned:
   *
   *   BAD_MONGO_URL: mongodbUrl is invalid.
   *   BAD_SHORTENER_BASE: shortenerBase is invalid.
   */
  static async make(mongoDbUrl, shortenerBase) {
    let regex_mongoDbUrl = /([a-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S\/?)*)/;
    let matches_mongoDbUrl = mongoDbUrl.match(regex_mongoDbUrl);
    let scheme = matches_mongoDbUrl[1];
    let dbname = matches_mongoDbUrl[6];
    let {valid,port} = lookup(shortenerBase,{ isSHORTNER_DOMAIN : true});
    if(valid === true)
    {
      if(port === false)
      {
      return { error: { code: 'BAD_SHORTENER_BASE', message: 'The port number of shortenerBase is invalid.'} };
      }
    }
    else
    {
      return { error: { code: 'BAD_SHORTENER_BASE', message: 'shortenerBase is invalid.'} };
    }
    let {valid_m,port_m,mongo_m} = lookup(mongoDbUrl,{ isMongo : true});
    if(valid_m === true)
    {
      if(mongo_m === false)
      {
      return { error: { code: 'BAD_MONGO_URL', message: 'bad scheme '+scheme+' must be "mongodb".'} };
      }
      if(port_m === false)
      {
      return { error: { code: 'BAD_MONGO_URL', message: 'The port number of mongodbUrl is invalid.'} };
      }
    }
    else
    {
      return { error: { code: 'BAD_MONGO_URL', message: 'mongodbUrl is invalid.'} };
    }
    const client = await mongo.connect(mongoDbUrl, { useNewUrlParser: true });
    client.db(matches_mongoDbUrl[5])
    return new UrlShortener(shortenerBase,client,dbname);
  }

  /** Create a URL shortener with SHORTENER_BASE set to base. */
  constructor(base, client, db) {
    this.base = base;
    this.client = client;
    this.db = db;
  }

  /** Release all resources held by this url-shortener.  Specifically,
   *  close any database connections.  Return empty object.
   */
  async close() {
  await this.client.close();
  }

  /** Clear database */
  async clear() {
    await this.client.db().dropDatabase();
    return { };
  }


  /** The argument longUrl must be a legal url.  It is ok if it has
   *  been previously added or deactivated.  The base of longUrl cannot
   *  be the same as the base of this url-shortener.
   *
   *  If there are no errors, then return an object having a 'value'
   *  property which contains the short url corresponding to longUrl.
   *  If longUrl was previously added, then the short url *must* be
   *  the same as the previously returned value.  If long url is
   *  currently deactivated, then it's previous association is made
   *  available to subsequent uses of the query() method.
   *
   *  Errors corresponding to the following 'code's should be detected:
   *
   *   'URL_SYNTAX': longUrl syntax is incorrect (it does not contain
   *                 a :// substring, its domain is invalid).
   *
   *   'DOMAIN':     base of longUrl is equal to shortUrl base.
   */
  async add(longUrl)
  {
      let regex = /([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S*\/?)*)/;
      let matches = longUrl.match(regex);
      let scheme = matches[1];
      let ld = matches[2];
      let lr = matches[6];
      let ldr = ld.toLowerCase() + '/' + lr;
      let {valid,port} = lookup(longUrl,{ isLong : true});
      if(valid === true)
      {
        if(port === false)
        {
        return { error: { code: 'URL_SYNTAX', message: 'longUrl syntax is incorrect its domain is invalid'} };
        }
      }
      else
      {
        return { error: { code: 'URL_SYNTAX', message: 'longUrl syntax is incorrect it does not contain a :// substring'} };
      }
      if(ld === this.base)
      {
          return { code: 'DOMAIN', message: 'base of longUrl is equal to shortUrl base.' };
      }
      if(await this.client.db().collection(this.db).findOne({ dr_lurl : ldr}))
      {
        let value = await this.client.db().collection(this.db).findOne({ dr_lurl : ldr});
        this.client.db().collection(this.db).updateOne({ dr_lurl : ldr},{$set:{active:1}});
        return {value : scheme + "://" + value.dr_surl}
      }
      let rn = Math.floor(Math.random() * Math.pow(2,32));
      let id = (rn.toString(36)).toLowerCase();
      let surl = this.base + '/' + id;
      await this.client.db().collection(this.db).insertOne( {
                    s_surl : scheme.toLowerCase(),
                    r_surl : id,
                    d_lurl : ld.toLowerCase(),
                    r_lurl : lr,
                    dr_lurl : ldr,
                    dr_surl : surl,
                    active : 1,
                    count : 0
                  });
      let value = await this.client.db().collection(this.db).findOne({ dr_lurl : ldr});
      return {value : scheme + "://" + value.dr_surl}
    }

  /** The argument shortUrl must be a shortened URL previously
   *  returned by the add() method which has not subsequently been
   *  deactivated by the deactivate() method.
   *
   *  If there are no errors, then return an object having a 'value'
   *  property which contains the long url corresponding to shortUrl.
   *
   *  Errors corresponding to the following 'code's should be
   *  detected:
   *
   *   'URL_SYNTAX': shortUrl syntax is incorrect (it does not contain
   *                 a :// substring or the base is invalid.
   *
   *   'DOMAIN':     shortUrl base is not equal to SHORTENER_BASE.
   *
   *   'NOT_FOUND':  shortUrl is not currently registered for this
   *                 service.
   */
  async query(shortUrl) {
    let regex = /([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S*\/?)*)/;
    let matches = shortUrl.match(regex);
    let {valid,port} = lookup(shortUrl,{ isShort : true});
    if(valid === true)
    {
      if(port === false)
      {
      return { error: { code: 'URL_SYNTAX', message: 'shortUrl syntax is incorrect its domain is invalid.'} };
      }
    }
    else
    {
      return { error: { code: 'URL_SYNTAX', message: 'shortUrl syntax is incorrect it does not contain a :// substring.'} };
    }
    let scheme = matches[1];
    let surl = matches[0];
    let sd = matches[2];
    let sr = matches[6];
    let sdr = sd.toLowerCase() + "/" + sr;
    if(String(this.base).toLowerCase() === sd.toLowerCase())
    {
     let value = await this.client.db().collection(this.db).findOne({ dr_surl : sdr});
     if(value && (value.active === 1))
     {
       let new_count=value.count+1;
       this.client.db().collection(this.db).updateOne({ dr_surl : sdr},{$set:{count:new_count}});
       return {value : scheme.toLowerCase() + '://' + value.dr_lurl };
     }
      return { error: { code: 'NOT_FOUND', message: 'The '+ shortUrl + ' is not currently registered for this service' } };
    }
    else
    {
      return { error: { code: 'DOMAIN', message: 'The ' + shortUrl + ' shortUrl base is not equal to SHORTENER_BASE:' + this.base } };
    }
  }


  /** The argument url must be one of a previously added (longUrl,
   *  shortUrl) pair.  It may be the case that url is currently
   *  deactivated.
   *
   *  If there are no errors, then return an object having a 'value'
   *  property which contains a count of the total number of times
   *  shortUrl was successfully looked up using query().  Note that
   *  the count should be returned even if url is currently deactivated.
   *
   *  Errors corresponding to the following 'code's should be detected:
   *
   *   'URL_SYNTAX': url syntax is incorrect (it does not contain
   *                 a :// substring, or the base is invalid).
   *
   *   'NOT_FOUND':  url was never registered for this service.
   */
  async count(url) {
    let regex = /([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S*\/?)*)/;
    let matches = url.match(regex);
    let scheme = matches[1];
    let curl = matches[0];
    let d = matches[2];
    let r = matches[6];
    let cdr = d.toLowerCase() + "/" + r;
    if(matches[2].toLowerCase() === this.base)
    {
    let {valid,port} = lookup(url,{ isShort : true});
    if(valid === true)
    {
      if(port === false)
      {
      return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect its domain is invalid.'} };
      }
    }
    else
    {
      return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect it does not contain a :// substring.'} };
    }
    }
    else
    {
      let {valid,port} = lookup(url,{ isLong : true});
      if(valid === true)
      {
        if(port === false)
        {
        return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect its domain is invalid.'} };
        }
      }
      else
      {
        return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect it does not contain a :// substring.'} };
      }
    }
         let value1 = await this.client.db().collection(this.db).findOne({ dr_lurl : cdr});
         if(value1)
          {
                       return {value : value1.count};
          }
          let value2 = await this.client.db().collection(this.db).findOne({ dr_surl : cdr});
          if(value2)
          {
                       return {value : value2.count};
          }
      return { error: { code: 'NOT_FOUND', message: 'The ' + url + ' is not currently registered for this service' } };
    }


  /** The argument url must be one of a previously added (longUrl,
   *  shortUrl) pair.  It is not an error if the url has already
   *  been deactivated.
   *
   *  If there are no errors, then return an empty object and make the
   *  association between (longUrl, shortUrl) unavailable to
   *  future uses of the query() method.
   *
   *  Errors corresponding to the following 'code's should be detected:
   *
   *   'URL_SYNTAX':  url syntax is incorrect (it does not contain
   *                  a :// substring, or the base is invalid).
   *
   *   'NOT_FOUND':  url was never registered for this service.
   */
  async deactivate(url)
  {
    let regex = /([a-zA-z]+):\/\/([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(:(\d+))?)\/?((\S*\/?)*)/;
    let matches = url.match(regex);
    let scheme = matches[1];
    let durl = matches[0];
    let d = matches[2];
    let r = matches[6];
    let ddr = d.toLowerCase() + "/" + r;
    if(matches[2].toLowerCase() === this.base)
    {
    let {valid,port} = lookup(url,{ isShort : true});
    if(valid === true)
    {
      if(port === false)
      {
      return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect its domain is invalid.'} };
      }
    }
    else
    {
      return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect it does not contain a :// substring.'} };
    }
    }
    else
    {
      let {valid,port} = lookup(url,{ isLong : true});
      if(valid === true)
      {
        if(port === false)
        {
        return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect its domain is invalid.'} };
        }
      }
      else
      {
        return { error: { code: 'URL_SYNTAX', message: 'Url syntax is incorrect it does not contain a :// substring.'} };
      }
    }
    let value1 = await this.client.db().collection(this.db).findOne({ dr_lurl : ddr});
    if(value1)
     {
                  this.client.db().collection(this.db).updateOne({ dr_lurl : ddr},{$set:{active:0}});
                  return {};
     }
     let value2 = await this.client.db().collection(this.db).findOne({ dr_surl : ddr});
     if(value2)
     {
                  this.client.db().collection(this.db).updateOne({ dr_surl : ddr},{$set:{active:0}});
                  return {};
     }
  return { error: { code: 'NOT_FOUND', message: 'The ' + url + ' is not currently registered for this service' } };
  }

  //private utility methods can go here.
}

module.exports = UrlShortener

//This may be useful to specify as options when creating
//a mongo client connection
const MONGO_OPTIONS = {
  useNewUrlParser: true
};

//private utility functions can go here.
