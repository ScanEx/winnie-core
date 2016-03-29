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
                globals: false,
                mobilePopups: nsGmx.Utils.isMobile()
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

cm.define('resetter', [], function(cm) {
    return new(L.Class.extend({
        includes: [L.Mixin.Events],
        initialize: function() {},
        reset: function() {
            this.fire('reset');
        }
    }));
});

cm.define('i18n', ['config'], function(cm) {
    var config = cm.get('config');

    if (!(config.app.i18n && nsGmx.Translations)) {
        return false;
    }

    var lang = config.state.language || config.app.i18n.language || (nsGmx.Translations && nsGmx.Translations.getLanguage());
    if (lang) {
        L.gmxLocale && L.gmxLocale.setLanguage(lang);
        nsGmx.Translations && nsGmx.Translations.setLanguage(lang);
    }
    return nsGmx.Translations;
});

cm.define('mapsResourceServer', [], function(cm) {
    if (nsGmx.Auth && nsGmx.Auth.Server) {
        return new nsGmx.Auth.Server({
            root: 'http://maps.kosmosnimki.ru'
        });
    } else {
        return null;
    }
});

cm.define('permalinkManager', ['mapsResourceServer', 'config'], function(cm, cb) {
    var mapsResourceServer = cm.get('mapsResourceServer');
    var config = cm.get('config');

    if (!config.app.permalinkManager) {
        return null;
    }

    if (nsGmx.PermalinkManager && mapsResourceServer) {
        var permalinkManager = new nsGmx.PermalinkManager({
            provider: mapsResourceServer
        });
        var permalinkId = config.app.permalinkManager.permalinkId;
        if (permalinkId) {
            permalinkManager.loadFromId(permalinkId).then(function() {
                cb(permalinkManager);
            }, function() {
                console.warn('failed to load permalink ' + permalinkId);
                cb(permalinkManager);
            });
        } else if (config.state) {
            permalinkManager.loadFromData({
                version: '3.0.0',
                components: config.state
            });
            return permalinkManager;
        } else {
            return permalinkManager;
        }
    } else if (nsGmx.StateManager) {
        var permalinkManager = new nsGmx.StateManager();
        permalinkManager.loadFromData({
            version: '3.0.0',
            components: config.state
        });
        return permalinkManager;
    } else {
        return null;
    }
});

cm.define('container', [], function(cm) {
    var containerEl = container[0] || container;
    L.DomUtil.addClass(containerEl, 'gmxApplication');
    if (window.device && window.device.platform) {
        L.DomUtil.addClass(containerEl, 'gmxApplication_platform-' + window.device.platform.toLowerCase());
    }
    return containerEl;
});
