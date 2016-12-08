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

To build the code and be able to run, follow these steps:

1. Install dependencies: `npm install`
2. Build the bundle: `webpack`
3. Open the app in your browser: `firefox file://./index.html`


## Faceted search

The faceted search part in this Proof-of-Concept application means there is below the search-box and next to the
result list a few categories ("facets") where we can click on elements to filter the results by limiting to that
category. For example there is a list of countries where you can click on one country to limit the results to companies
from that country.

This is implemented in elasticsearch by doing a search and executing aggregations on those categories.

```
    curl -XPOST 'http://localhost:9200/companies/_search?request_cache=true&search_type=count' -d '{
      "query": {
        "bool": {
          "must": []
        }
      },
      "aggs": {
        "activities": {
          "terms": {
            "field": "activity_code"
          }
        },
        "countries": {
          "terms": {
            "field": "country_code"
          }
        },
        "years": {
          "date_range": {
            "field": "incorporation_date",
            "format": "yyyy",
            "ranges": [
              {                 "to": "1950" },
              { "from": "1950", "to": "1975" },
              { "from": "1975", "to": "2000" },
              { "from": "2000"               }
            ]
          }
        }
      }
    }'
```

The above query will return the total number of search results and the top entries plus counts in each category.

Please also see the section about caching below. The above query is normally very slow (seconds...) and can only be
executed efficiently using caching. Downside to the caching is, it does not cache the actual hits, so we need to do
a second query to retrieve the hits. Luckily the second query needs only hits (no aggregations) and as such is much
much faster. (Note we could optimise this and execute both request in one msearch/bulk call)


### Documents missing the facet value

Some docs (companies) might not have a value for the field we're calculating the facet on. This can be addressed by
specifying hw to handle them, see here:
https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html#_missing_value_12


```
    "activities": {
      "terms": {
        "field": "activity_code",
        "missing": "N/A"
      }
    }
```

This means an extra bucket is added for docs missing the field.

There is also always a missing aggregation, that allows to count docs missing specific fields:
https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-missing-aggregation.html

## CORS Support

To allow cross-origin request, enable this in your elasticsearch config:

```
  http.cors:
    enabled: true
    allow-origin: /.*/
```

Note this is only needed for local operation of the app, because your browser directly accesses elasticsearch.


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

Cache operation can be verified by checking the cache contents. You should see data is being cached:

```
    curl -XGET 'http://localhost:9200/_nodes/stats/indices/request_cache?human'
```

On my laptop, the initial execution (uncached..) of this query is ~2 seconds, the second (cached) execution takes
around 5-10 milliseconds.

## Autocomplete

For a nicer user experience, autocompletion is performed when typing a city name. This is implemented with the
completion suggester in elasticsearch, see for this guide for a more complete explanation:
https://www.elastic.co/blog/you-complete-me

The auto-complete on the frontend is built with react-autocomplete, see https://github.com/reactjs/react-autocomplete

For the completion in elasticsearch, in the basis, a special field for the suggestions was added to the mapping,
see logstash/template.json

```
    "city_suggest": {
      "type": "completion"
    }
```

In logstash we fill this field with a copy of the city, see logstash.conf

```
    mutate {
        add_field => {
            "city_suggest" => "%{city}"
        }
    }
```

In the application we can the query the _suggest endpoint to fetch suggestions:

```
    curl -X POST localhost:9200/companies/_suggest -d '{
        "city" : {
            "text" : "a",
            "completion" : {
                "field" : "city_suggest"
            }
        }
    }'
```


## Filtering results

In this part i'm describing some of the queries/filters the application uses to filter results. Whenever your enter
a query (e.g. city name) or click on one of the filters, these are added to your search query and the results are
filtered.

The basis structure for the query is:

```
    "query": {
        "bool": {
            "must": []
        }
    }
```

Within the "must" element all required filters and queries should be added.


### Simple "terms" filter

For simple filtering (not full text) by a value, e.g. by an activity code (a number) we use a terms query:

```
    { "terms": { "activity_code": [ 123 ] } }
```


### Text-based queries

There is many text-based query options, please read the elasticsearch docs:
https://www.elastic.co/guide/en/elasticsearch/reference/current/full-text-queries.html

In this sample app the match query is used:

```
    { "match": { "city": "Amsterdam" }}
```


### Date range queries

To filter on dates, for example year of incorporation of a company, we use a range filter. For example to filter
on copmanies incorporated between 1995 and 1998 run the query below:

```
    { "range": { "incorporation_date": { "gte": "1995", "lte": "1998", format: 'yyyy'}}}
```

Note the format parameter. This concerns the format we're entering dates in this query, it has no effect on the format
how dates are stored or indexed in elasticsearch. It's here so we only need to type the years here.


### String range queries

You can use a simple range query to filter by string range. For example to filter on all postcodes between 1111AA and
999ZZ, use the filter below:

```
    { "range": { "postcode": { "gte": "1111AA", "lte": "9999ZZ" }}}

```


### Geo distance filter

Note this is not currenty implemented in the application, but documented here for future use! Please see here for a
more complete explanation: https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-queries.html

An example of querying by geo distance (Distance from a specified point), for example for a radius of 5 kilometer
around coordinate 52.22, 4.54 (Amsterdam central station):

```
    {
        "geo_distance" : {
            "distance" : "5km",
            "pin.location" : {
                "lat" : 52.22,
                "lon" : 4.54
            }
        }
    }
```

To be able to search by geo-distance based on address (city) or postcode fields, thosee will first need to be translated
gps (lat/long) coordinates. That should happen when loading the data, so e.g. it could be implemented in logstash.

See here for an example api that can be used: https://www.postcodeapi.nu