/*globals exports, require, XPCOMUtils */
/*jslint todo: true, vars: true*/

/*

Todos for later
1. When available, replace with https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/places_history

*/

(function () {'use strict';

function l (msg) {
    console.log(msg);
}

var modifyRequest;

exports.main = function () {

    var chrome = require('chrome'), Cc = chrome.Cc, Ci = chrome.Ci, Cu = chrome.Cu, Cr = chrome.Cr;
    var prefs = require('sdk/simple-prefs').prefs;
    var XMLHttpRequest = require('sdk/net/xhr').XMLHttpRequest;

    Cu['import']('resource://gre/modules/XPCOMUtils.jsm');

    function makeURI(aURL, aOriginCharset, aBaseURI) {
      var ioService = Cc['@mozilla.org/network/io-service;1']
                      .getService(Ci.nsIIOService);
      return ioService.newURI(aURL, aOriginCharset, aBaseURI);
    }
    function getHTTPSForLocation (url) {
        return url.replace(/^http:/, 'https:');
    }
    function redirect (subject, uri) {
        subject.redirectTo(makeURI(uri));
    }
    function historyAlteration (aURI) {
        switch (prefs.httpInHistory) {
            // Todo: Allowing an option for alteration of HTTP into HTTPS would be great, but mapping mozIPlaceInfo (and mozIVisitInfo) needed by mozIAsyncHistory.updatePlaces to nsINavHistoryResultNode (and subclasses?) seems less than clear
            /*
            Add to httpInHistory "description" in package.json and properties: "or modify them to show as if HTTPS had been visited"
            Add to properties: httpInHistory_options.alter_in_history=Check history for equivalent HTTPS support and alter any equivalent HTTP files in history to use HTTPS upon discovery
            {
                "value": "alter_in_history",
                "label": "Check history for equivalent HTTPS support and alter any equivalent HTTP files in history to use HTTPS upon discovery"
            },
            */
            /*
            case 'alter_in_history':
                var asyncHistory = Cc['@mozilla.org/browser/history;1'].
                                                    getService(Ci.mozIAsyncHistory);
                cont.getChild(0);
                asyncHistory.updatePlaces({placeId: , uri: getHTTPSForLocation(aURL)});
                // Fall-through
            */
            case 'delete_from_history':
                // Not needed?
                //var ac = Cc['@mozilla.org/autocomplete/search;1?name=history'].getService(Ci.mozIPlacesAutoComplete);
                //ac.unregisterOpenPage(aURI);
                var browserHistory = Cc['@mozilla.org/browser/nav-history-service;1'].
                                                    getService(Ci.nsIBrowserHistory);
                browserHistory.removePage(aURI);
                break;
            default:
                throw 'Unexpected httpInHistory value';
        }
    }

    var observerService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
    modifyRequest = {
        register: function () {
            observerService.addObserver(this, 'http-on-modify-request', false);
        },
        unregister: function() {
            observerService.removeObserver(this, 'http-on-modify-request');
        },
        observe: function(subject, topic, data) {
            subject.QueryInterface(Ci.nsIHttpChannel);
            var aURI = subject.URI;
            if (!aURI.schemeIs('http')) {return;}
            
            var aURL = aURI.spec;

            var hasHTTPS;
            
            function getWindow () {
                var interfaceReq, win;
                var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
            
                // Code obtained from http://forums.mozillazine.org/viewtopic.php?p=2788191#p2788191
                // Find the originating window by checking the notificationCallbacks
                if (!httpChannel.notificationCallbacks) {
                    if (httpChannel.loadGroup && httpChannel.loadGroup.notificationCallbacks) {
                        interfaceReq = httpChannel.loadGroup.notificationCallbacks.QueryInterface(Ci.nsIInterfaceRequestor);
                    }
                    else {
                        return;                  
                    }
                }
                else {
                    interfaceReq = httpChannel.notificationCallbacks.QueryInterface(Ci.nsIInterfaceRequestor);
                }
                try {
                    win = interfaceReq.getInterface(Ci.nsIDOMWindow);
                }
                catch (err) {
                    if (err.result === Cr.NS_NOINTERFACE) {
                        return;
                    }
                    throw (err);
                }
                return win;
            }
            function processLocation () {
                var win;
                if (hasHTTPS || prefs.paranoiaMode === 'load_https') {
                    subject.cancel(Cr.NS_BINDING_ABORTED);
                    // redirect(subject, getHTTPSForLocation(aURL)); // Leaves a non-HTTPS item in history, so we instead change location
                    win = getWindow();
                    win.location = getHTTPSForLocation(aURL);
                }
                else if (prefs.paranoiaMode === 'load_empty') {
                    subject.cancel(Cr.NS_BINDING_ABORTED);
                    // redirect(subject, 'about:newtab'); // Leaves a non-HTTPS item in history, so we instead change location
                    win = getWindow();
                    win.location = 'about:newtab';
                }
                // Otherwise, go ahead with requested HTTP load 
                // else { // prefs.paranoiaMode === 'load_http'
                // }
            }
            if (prefs.paranoiaMode !== 'load_https') {
                if (prefs.historyChecking) {
                    // Check for whether an https version exists for this domain in the history
                    var domain = aURI.host;
                    var historyService = Cc['@mozilla.org/browser/nav-history-service;1']
                                           .getService(Ci.nsINavHistoryService);

                    // No query options set will get all history, sorted in database order,
                    // which is nsINavHistoryQueryOptions.SORT_BY_NONE.
                    var options = historyService.getNewQueryOptions();

                    // No query parameters will return everything
                    var query = historyService.getNewQuery();

                    //query.domainIsHost = 0;
                    //query.domain = domain;
                    query.uriIsPrefix = true;
                    query.uri = makeURI('https://' + domain); // If domain is found with https://, probably safe for any URL

                    var result = historyService.executeQuery(query, options);

                    var cont = result.root;
                    cont.containerOpen = true;
                    hasHTTPS = cont.childCount;
                    cont.containerOpen = false;

                    if (prefs.httpInHistory !== 'do_not_alter') {
                        // Look for an exact match this time
                        query = historyService.getNewQuery();
                        query.uri = aURI;
                        result = historyService.executeQuery(query, options);
                        cont = result.root;
                        cont.containerOpen = true;
                        var hasChildren = cont.childCount;
l('http to delete:' + hasChildren + '::' + aURI.spec);
                        if (hasChildren) {
                            try {
                                historyAlteration(aURI);
                            }
                            finally {
                                cont.containerOpen = false;
                            }
                        }
                        else {
                            cont.containerOpen = false;
                        }
                    }
                }
                if (!hasHTTPS && prefs.headRequest) {
                    var xhr = new XMLHttpRequest();
                    
                    xhr.open('HEAD', getHTTPSForLocation(aURL), false); // Sync!
                    xhr.onload = function () {
                        hasHTTPS = !!this.getResponseHeader('Last-Modified');
                        processLocation();
                        if (hasHTTPS && prefs.httpInHistory !== 'do_not_alter') {
                            historyAlteration(aURI);
                        }
                    };
                    xhr.onerror = function () {
                        processLocation();
                    };
                    xhr.send();
                    return;
                }
            }
            processLocation();
        }
    };
    
    modifyRequest.register();

};

exports.onUnLoad = function () {
    if (modifyRequest) {
        modifyRequest.unregister();
    }
};

}());
