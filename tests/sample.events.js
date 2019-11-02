'use strict'

class Events {
  onHit (params) {
    console.log('hit!', params)
  }
}

module.exports = Events
