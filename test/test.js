/* global describe, it */

const assert = require('assert')
const formats = require('rdf-formats-common')()
const nock = require('nock')
const rdf = require('rdf-ext')
const Readable = require('readable-stream')
const SimpleFetch = require('..')
const Simple = require('simplerdf-core')

describe('simplerdf-fetch-lite', () => {
  it('should have a defaults object', () => {
    assert.equal(typeof SimpleFetch.defaults, 'object')
  })

  describe('static', () => {
    it('should return a Promise object', () => {
      nock('http://example.org')
        .get('/promise')
        .reply(201)

      const result = SimpleFetch.fetch('http://example.org/promise', {
        formats: {
          parsers: {
            list: () => {
              return []
            },
            import: () => {
              return new Readable({
                read: () => {}
              })
            }
          }
        }
      })

      assert.equal(typeof result, 'object')
      assert.equal(typeof result.then, 'function')
    })

    it('should use the rdfFetch given in options', () => {
      let touched = false

      function touch () {
        touched = true

        return Promise.resolve({})
      }

      return SimpleFetch.fetch(null, {rdfFetch: touch}).then(() => {
        assert.equal(touched, true)
      })
    })

    it('should use the rdfFetch given in defaults', () => {
      let touched = false

      function touch () {
        touched = true

        return Promise.resolve({})
      }

      const defaultRdfFetch = SimpleFetch.defaults.rdfFetch

      SimpleFetch.defaults.rdfFetch = touch

      return SimpleFetch.fetch().then(() => {
        assert.equal(touched, true)

        SimpleFetch.defaults.rdfFetch = defaultRdfFetch
      })
    })

    it('should use the constructor given in options', () => {
      let touched = false

      class CustomClass {
        init () {
          touched = true
        }
      }

      return SimpleFetch.fetch(null, {
        Simple: Simple.extend(CustomClass),
        rdfFetch: () => Promise.resolve({
          headers: {
            get: () => null
          },
          dataset: () => {
            return Promise.resolve(rdf.dataset())
          }
        })
      }).then(() => {
        assert.equal(touched, true)
      })
    })

    it('should use the factory given in options', () => {
      return SimpleFetch.fetch(null, {
        simpleFactory: (context, iri, graph, options) => {
          return new (Simple.extend(SimpleFetch))(context, iri, graph, options)
        },
        rdfFetch: () => Promise.resolve({
          headers: {
            get: () => null
          },
          dataset: () => {
            return Promise.resolve(rdf.dataset())
          }
        })
      }).then((res) => {
        const plugins = res.body._plugins.map(p => p.name).sort()

        assert.deepEqual(plugins, ['SimpleFetch', 'SimpleRDF'])
      })
    })

    it('should use the constructor given in defaults', () => {
      const defaultSimple = SimpleFetch.defaults.Simple

      SimpleFetch.defaults.Simple = Simple.extend(SimpleFetch)

      return SimpleFetch.fetch(null, {
        rdfFetch: () => Promise.resolve({
          headers: {
            get: () => null
          },
          dataset: () => {
            return Promise.resolve(rdf.dataset())
          }
        })
      }).then((res) => {
        const plugins = res.body._plugins.map(p => p.name).sort()

        assert.deepEqual(plugins, ['SimpleFetch', 'SimpleRDF'])

        SimpleFetch.defaults.Simple = defaultSimple
      })
    })

    it('should send the Simple object given on options.body', () => {
      nock('http://example.org')
        .post('/send-body')
        .reply(200, function (url, body) {
          assert.equal(body.trim(), '<http://example.org/subject> <http://example.org/predicate> "object" .')
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      const simple = new Simple({predicate: 'http://example.org/predicate'}, 'http://example.org/subject')

      simple.predicate = 'object'

      return SimpleFetch.fetch('http://example.org/send-body', {
        formats: customFormats,
        method: 'post',
        body: simple
      })
    })

    it('should receive a SimpleRDF object in res.body', () => {
      nock('http://example.org')
        .get('/receive-body')
        .reply(200, function (url, body) {
          return [200, '<http://example.org/subject> <http://example.org/predicate> "object" .\n', {
            'Content-Type': 'application/n-triples'
          }]
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      return SimpleFetch.fetch('http://example.org/receive-body', {formats: customFormats}).then((res) => {
        const graphString = res.body.graph().toString().trim()

        assert.equal(graphString, '<http://example.org/subject> <http://example.org/predicate> "object" .')
      })
    })

    it('should use the context given in options for the received Simple object', () => {
      nock('http://example.org')
        .get('/context-options')
        .reply(200, function (url, body) {
          return [200, '<http://example.org/subject> <http://example.org/predicate> "object" .\n', {
            'Content-Type': 'application/n-triples'
          }]
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      const options = {
        formats: customFormats,
        context: {
          predicate: 'http://example.org/predicate'
        }
      }

      return SimpleFetch.fetch('http://example.org/context-options', options).then((res) => {
        assert.equal(res.body.context().description('predicate').predicate.value, 'http://example.org/predicate')
      })
    })

    it('should use the context given in defaults for the received Simple object', () => {
      nock('http://example.org')
        .get('/context-options')
        .reply(200, function (url, body) {
          return [200, '<http://example.org/subject> <http://example.org/predicate> "object" .\n', {
            'Content-Type': 'application/n-triples'
          }]
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      SimpleFetch.defaults.context = {predicate: 'http://example.org/predicate'}

      return SimpleFetch.fetch('http://example.org/context-options', {formats: customFormats}).then((res) => {
        assert.equal(res.body.context().description('predicate').predicate.value, 'http://example.org/predicate')

        SimpleFetch.defaults.context = null
      })
    })

    it('should set the Simple IRI to the request URL', () => {
      nock('http://example.org')
        .get('/iri-request-url')
        .reply(200, function (url, body) {
          return [200, '<http://example.org/subject> <http://example.org/predicate> "object" .\n', {
            'Content-Type': 'application/n-triples'
          }]
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      return SimpleFetch.fetch('http://example.org/iri-request-url', {formats: customFormats}).then((res) => {
        assert.equal(res.body.iri().toString(), 'http://example.org/iri-request-url')
      })
    })

    it('should set the Simple IRI to the Content-Location header value', () => {
      nock('http://example.org')
        .get('/iri-content-location')
        .reply(200, function (url, body) {
          return [
            200,
            '<http://example.org/subject> <http://example.org/predicate> "object" .\n', {
              'Content-Location': 'http://example.org/iri',
              'Content-Type': 'application/n-triples'
            }
          ]
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      return SimpleFetch.fetch('http://example.org/iri-content-location', {formats: customFormats}).then((res) => {
        assert.equal(res.body.iri().toString(), 'http://example.org/iri')
      })
    })

    it('should send the raw body if rawRequest is true', () => {
      nock('http://example.org')
        .post('/send-raw-body')
        .reply(200, function (url, body) {
          assert.equal(body.trim(), 'test')
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      return SimpleFetch.fetch('http://example.org/send-raw-body', {
        formats: customFormats,
        method: 'post',
        body: 'test',
        rawRequest: true
      })
    })

    it('should receive the raw body if rawResponse is true', () => {
      nock('http://example.org')
        .get('/receive-raw-body')
        .reply(200, function (url, body) {
          return [200, 'test']
        })

      const customFormats = {
        parsers: new rdf.Parsers({
          'application/n-triples': formats.parsers['application/n-triples']
        }),
        serializers: new rdf.Serializers({
          'application/n-triples': formats.serializers['application/n-triples']
        })
      }

      return SimpleFetch.fetch('http://example.org/receive-raw-body', {
        formats: customFormats,
        rawResponse: true
      }).then(res => res.text()).then((body) => {
        assert.equal(body, 'test')
      })
    })
  })

  describe('instance', () => {
    it('should be a constructor', () => {
      assert.equal(typeof SimpleFetch, 'function')
    })

    it('should use the constructor given in options', () => {
      const CustomClass = Simple.extend(SimpleFetch)
      const instance = new CustomClass({}, null, null, {
        rdfFetch: () => Promise.resolve({
          headers: {
            get: () => null
          },
          dataset: () => {
            return Promise.resolve(rdf.dataset())
          }
        })
      })

      return instance.fetch().then((res) => {
        const plugins = res.body._plugins.map(p => p.name).sort()

        assert.deepEqual(plugins, ['SimpleFetch', 'SimpleRDF'])
      })
    })
  })
})
