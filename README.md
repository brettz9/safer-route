# Safer Route

This is a simple Firefox add-on which, upon an HTTP request, optionally
checks user history and/or makes a HEAD request to detect whether a
site supports HTTPS, and if so, changes the request to use the HTTPS
protocol, otherwise keeping the URL the same (and also optionally deleting
the HTTP version from the history).

Also provides two optional "paranoia modes", one which will replace all
HTTP requests with HTTPS and one which will lead to a blank page
when not found.

# Alternatives

* https://addons.mozilla.org/en-US/firefox/addon/http-nowhere/
* https://www.eff.org/https-everywhere

# Possible todos

1. Support alteration of history to use HTTPS in place of HTTP (as opposed to deletion)
