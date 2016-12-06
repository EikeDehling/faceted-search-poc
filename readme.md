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