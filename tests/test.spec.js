'use strict'

process.env.NODE_ENV = 'local'

const should = require('should')

const NATS = require('nats')
const Broker = require('../index')
const Events = require('./sample.events')
const Actions = require('./sample.controller')

const timeout = 1000
const nats = NATS.connect({
  preserveBuffers: true
})

const publisher = new Broker(nats, { timeout })
const subscriber = new Broker(nats, { timeout })

subscriber.listen('resource', new Events())
subscriber.register('resource', new Actions())

describe('Test Spec', function () {

  it('should rpc call', function(done) {
    publisher.call('resource.read', { aa: 'bb' })
      .then(ret => {
        ret.should.eql({
          action: 'read',
          superbar: 'super.bar',
          params: { aa: 'bb' }
        })
        done()
      })
      .catch(err => {
        should.ifError(err)
      })
  })

  it('should handle err', function(done) {
    return publisher.call('resource.sampleerr')
      .catch(err => {
        if (/Sample Err$/.test(err.message)) return done()
        should.ifError(err)
      })
  })
})
