var $ = require('jquery');

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
}
