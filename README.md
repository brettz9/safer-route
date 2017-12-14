# Safer Route

[![Greenkeeper badge](https://badges.greenkeeper.io/brettz9/safer-route.svg)](https://greenkeeper.io/)

This is a simple Firefox add-on which, upon an HTTP request, optionally
checks user history and/or makes a HEAD request to detect whether a
site supports HTTPS, and if so, changes the request to use the HTTPS
protocol, otherwise keeping the URL the same (and also optionally deleting
the HTTP version from the history).

Also provides two optional "paranoia modes", one which will replace all
HTTP requests with HTTPS and one which will lead to a blank page
when not found.

IMPORTANT NOTE: Some well-used sites, like Amazon.com may
use the practice of mixing http and https for the same domain
and redirecting https requests back to http for pages deemed not
to be sensitive, thereby potentially compromising at least your
privacy. This practice will currently cause my add-on to have a
major hiccup when such a site is visited, as my add-on keeps
trying to go to the https version, but the site keeps forwarding
it back to the http version. I may build in a system to prevent
this, such as allowing site-specific exceptions in the future, but
as I do not have time at the moment, you may wish to forgo
using this add-on until it supports exceptions or disable it when
visiting such a site.

# Alternatives

* https://addons.mozilla.org/en-US/firefox/addon/http-nowhere/
* https://www.eff.org/https-everywhere

# Possible todos

1. Support alteration of history to use HTTPS in place of HTTP (as
opposed to deletion).
