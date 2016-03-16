var $ = require('jquery');

module.exports = function (cm, container, applicationConfig) {
    // returns config object
    cm.define('config', [], function(cm, cb) {
        var configConditions = function(config) {
            if (config.app.layersTreeWidget || config.app.bookmarksWidget) {
                config.app.sidebarWidget = {};
            }
            return config;
        };

        var setDefaults = function(config) {
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
        };

        if (typeof applicationConfig === 'object') {
            return setDefaults(applicationConfig);
        } else if (typeof applicationConfig === 'string') {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', applicationConfig, true);
            xhr.addEventListener('load', function(pe) {
                if (pe.currentTarget.status === 200) {
                    try {
                        var config = JSON.parse(pe.currentTarget.response || pe.currentTarget.responseText);
                    } catch (e) {
                        console.error('invalid config');
                    }
                    if (config) {
                        cb(setDefaults(config));
                    } else {
                        cb(false);
                    }
                } else {
                    console.error('failed to load config');
                    cb(false);
                }
            });
            xhr.send();
        } else {
            console.error('invalid config argument');
            cb(false);
        }
    });
}
