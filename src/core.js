var $ = require('jquery');

window.L = require('leaflet');
require('leaflet-tilelayer-mercator');

function setConfigDefaults(config) {
    var configConditions = function(config) {
        if (config.app.layersTreeWidget || config.app.bookmarksWidget) {
            config.app.sidebarWidget = {};
        }
        return config;
    };

    return configConditions($.extend(true, {
        app: {
            map: {
                center: [53, 82],
                zoom: 3,
                zoomControl: false,
                attributionControl: false
            },
            gmxMap: {
                setZIndex: true
            },
            i18n: {},
            permalinkManager: {},
            hideControl: {},
            zoomControl: {},
            centerControl: {
                color: 'black'
            },
            bottomControl: {},
            locationControl: {},
            copyrightControl: {},
            loaderStatusControl: {
                type: 'font'
            },
            baseLayersControl: {},
            layersMapper: {},
            layersTreeWidget: false,
            bookmarksWidget: false,
            storytellingWidget: false,
            sidebarWidget: false,
            calendarWidget: false,
            globals: false
        },
        state: {
            map: {
                position: {
                    x: 82,
                    y: 53,
                    z: 3
                }
            }
        }
    }, config));
}

module.exports = function(cm, container, applicationConfig) {
    // returns config object
    cm.define('config', [], function(cm, cb) {
        if (typeof applicationConfig === 'object') {
            return setConfigDefaults(applicationConfig);
        } else if (typeof applicationConfig === 'string') {
            $.ajax(applicationConfig).then(function(response) {
                try {
                    var config = (typeof response === 'string' ? JSON.parse(response) : response);
                } catch (e) {
                    console.error('invalid config');
                }
                if (config) {
                    cb(setConfigDefaults(config));
                } else {
                    cb(false);
                }
            }, function() {
                console.error('failed to load config');
                cb(false);
            });
        } else {
            console.error('invalid config argument');
            cb(false);
        }
    });

    cm.define('container', [], function(cm) {
        var L = require('leaflet');

        var containerEl = container[0] || container;
        L.DomUtil.addClass(containerEl, 'gmxApplication');
        if (window.device && window.device.platform) {
            L.DomUtil.addClass(containerEl, 'gmxApplication_platform-' + window.device.platform.toLowerCase());
        }
        return containerEl;
    });

    cm.define('resetter', [], function(cm) {
        var L = require('leaflet');

        return new(L.Class.extend({
            includes: [L.Mixin.Events],
            initialize: function() {},
            reset: function() {
                this.fire('reset');
            }
        }));
    });

    cm.define('mapsResourceServer', [], function(cm) {
        // if (nsGmx.Auth && nsGmx.Auth.Server) {
        //     return new nsGmx.Auth.Server({
        //         root: 'http://maps.kosmosnimki.ru'
        //     });
        // } else {
        //     return null;
        // }
        return null;
    });

    cm.define('permalinkManager', ['mapsResourceServer', 'config'], function(cm, cb) {
        // var PermalinkManager = require('gmx-common-components/PermalinkManager');
        //
        // var mapsResourceServer = cm.get('mapsResourceServer');
        // var config = cm.get('config');
        //
        // if (!config.app.permalinkManager) {
        //     return null;
        // }
        //
        // if (nsGmx.PermalinkManager && mapsResourceServer) {
        //     var permalinkManager = new nsGmx.PermalinkManager({
        //         provider: mapsResourceServer
        //     });
        //     var permalinkId = config.app.permalinkManager.permalinkId;
        //     if (permalinkId) {
        //         permalinkManager.loadFromId(permalinkId).then(function() {
        //             cb(permalinkManager);
        //         }, function() {
        //             console.warn('failed to load permalink ' + permalinkId);
        //             cb(permalinkManager);
        //         });
        //     } else if (config.state) {
        //         permalinkManager.loadFromData({
        //             version: '3.0.0',
        //             components: config.state
        //         });
        //         return permalinkManager;
        //     } else {
        //         return permalinkManager;
        //     }
        // } else if (nsGmx.StateManager) {
        //     var permalinkManager = new nsGmx.StateManager();
        //     permalinkManager.loadFromData({
        //         version: '3.0.0',
        //         components: config.state
        //     });
        //     return permalinkManager;
        // } else {
        //     return null;
        // }
        return null;
    });
}
