'use strict'

const SuperClass = require('./sample.superclass')

class SampleController extends SuperClass {
  async create (params) {
    return Promise.resolve({
      action: 'create',
      superfoo: this.foo(),
      params
    })
  }

  async read (params) {
    return Promise.resolve({
      action: 'read',
      superbar: this.bar(),
      params
    })
  }

  async update () {
    return Promise.resolve({
      action: 'update',
      params
    })
  }

  async sampleerr () {
    return Promise.reject(new Error('Sample Err'))
  }
}

module.exports = SampleController
