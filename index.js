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

    if (!options.rawRequest && options.body) {
      options.body = options.body.graph().toStream()
    }

    return options.rdfFetch(url, options).then((res) => {
      if (options.rawResponse) {
        return res
      }

      if (!res.dataset) {
        // if there is no dataset, body should be also undefined
        delete res.body

        return res
      }

      return res.dataset().then((dataset) => {
        let context = options.context || SimpleFetch.defaults.context
        let iri = res.headers.get('Content-Location') || url

        if (options.simpleFactory) {
          res.body = options.simpleFactory(context, iri, dataset)
        } else {
          res.body = new options.Simple(context, iri, dataset)
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
