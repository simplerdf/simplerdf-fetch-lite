const rdfFetch = require('rdf-fetch-lite')
const Simple = require('simplerdf-core')

class SimpleFetch {
  init (context, iri, graph, options) {
    this._options.rdfFetch = options.rdfFetch || SimpleFetch.defaults.rdfFetch
  }

  fetch (url, options) {
    options = options || {}
    options.simpleFactory = this.create
    options.context = options.context || this.context()
    options.rdfFetch = options.rdfFetch || this._options.rdfFetch

    return SimpleFetch.fetch(url, options)
  }

  static fetch (url, options) {
    options = options || {}
    options.simpleFactory = options.simpleFactory || SimpleFetch.defaults.simpleFactory
    options.Simple = options.Simple || SimpleFetch.defaults.Simple
    options.context = options.context || SimpleFetch.defaults.context
    options.rdfFetch = options.rdfFetch || SimpleFetch.defaults.rdfFetch

    if (options.body) {
      options.body = options.body.graph().toStream()
    }

    return options.rdfFetch(url, options).then((res) => {
      if (!res.dataset) {
        return res
      }

      return res.dataset().then((dataset) => {
        let context = options.context || SimpleFetch.defaults.context
        let iri = res.headers.get('Content-Location') || url

        if (options.simpleFactory) {
          res.simple = options.simpleFactory(context, iri, dataset)
        } else {
          res.simple = new options.Simple(context, iri, dataset)
        }

        return res
      })
    })
  }
}

SimpleFetch.defaults = {
  Simple: Simple,
  rdfFetch: rdfFetch
}

module.exports = SimpleFetch
