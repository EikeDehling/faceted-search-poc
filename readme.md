[CORS Support]

To allow cross-origin request, enable this in your elasticsearch config:

"""
  http.cors:
    enabled: true
    allow-origin: /.*/
"""