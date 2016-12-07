# Elasticsearch faceted search PoC

This sample app is a PoC for implementing faceted search and autocompletion using elassticsearch. It's
built using elasticsearch as a rest backend and react as the application. Also included is logstash config
to load some data into the elastic database.

## Requirements

To run this app you'll need:

* elasticsearch
* logstash
* webpack
* nodejs
* npm

## Building

... TODO ...

## CORS Support

To allow cross-origin request, enable this in your elasticsearch config:

```
  http.cors:
    enabled: true
    allow-origin: /.*/
```

## Request caching (faceted search aggregations)

Because initially the faceted search aggregations are over the full dataset, performance is an important
subject! For example aggregating over 30 million docs can easily take up to a second. This would result
in unacceptable user experience.

To avoid such trouble, the aggregations for faceted search should be cached. See here:

https://www.elastic.co/guide/en/elasticsearch/reference/2.4/shard-request-cache.html

Configuration in elasticsearch.yml:

```
  indices.requests.cache.size: 10%
```

It also needs to be enabled in the index's mapping, enabled via index settings or per-request:

```
  index.requests.cache.enable: true
```

Note that only aggregations and total results are cached and only for queries set to search_type=count ;
this means that the result list can't be fetched in the same query. In this prototype i'm doing to search
requests therefore, one for the aggregations (cached) and one for the top results (uncached, but very fast).


## Autocomplete

For a nicer user experience, autocompletion is performed when typing a city name. This is implemented with the
completion suggester in elasticsearch, see for example this guide for more explanation:

https://www.elastic.co/blog/you-complete-me