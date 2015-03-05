var nsGmx = nsGmx || {};

nsGmx.createMapApplication = function(container, applicationConfig) {
    var ComponentsManager = window.cm.ComponentsManager;
    var cm = new ComponentsManager();

    var clone = function(o) {
        var c = {};
        for (k in o) {
            if (o.hasOwnProperty(k)) {
                c[k] = o[k];
            }
        }
        return c;
    };

    var extend = function(a, b) {
        for (p in b) {
            if (b.hasOwnProperty(p)) {
                a[p] = b[p];
            }
        }
        return a;
    };

    // returns config object
    cm.define('config', [], function(cm, cb) {
        var setDefaults = function(config) {
            config.map = config.map || {};
            config.map.zoom = config.map.zoom || 3;
            config.map.center = config.map.center || [53, 82];
            config.map.zoomControl = config.map.zoomControl || false;
            config.map.attributionControl = config.map.attributionControl || false;

            config.gmxMap = config.gmxMap || {};
            config.gmxMap.setZIndex = (typeof config.gmxMap.setZIndex === 'boolean') ? config.gmxMap.setZIndex : true;

            config.hideControl = (config.hideControl || (typeof config.hideControl === 'boolean')) ? config.hideControl : {};
            config.zoomControl = (config.zoomControl || (typeof config.zoomControl === 'boolean')) ? config.zoomControl : {};
            config.centerControl = (config.centerControl || (typeof config.centerControl === 'boolean')) ? config.centerControl : {
                color: 'black'
            };
            config.bottomControl = (config.bottomControl || (typeof config.bottomControl === 'boolean')) ? config.bottomControl : {};
            config.locationControl = (config.locationControl || (typeof config.locationControl === 'boolean')) ? config.locationControl : {};
            config.copyrightControl = (config.copyrightControl || (typeof config.copyrightControl === 'boolean')) ? config.copyrightControl : {};

            config.baseLayersControl = (config.baseLayersControl || (typeof config.baseLayersControl === 'boolean')) ? config.baseLayersControl : {};

            config.language = (config.language === 'eng') ? 'eng' : 'rus';

            return config;
        };

        if (typeof applicationConfig === 'object') {
            return setDefaults(applicationConfig);
        } else if (typeof applicationConfig === 'string') {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', applicationConfig, true);
            xhr.addEventListener('load', function(pe) {
                if (pe.currentTarget.status === 200) {
                    try {
                        var config = JSON.parse(pe.currentTarget.response);
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

    cm.define('i18n', ['config'], function(cm) {
        var config = cm.get('config');
        L.gmxLocale.setLanguage(config.language);
        return null;
    });

    // returns DOM element
    cm.define('container', [], function() {
        return container.length ? container[0] : container;
    });

    cm.define('map', ['config', 'container'], function(cm, cb) {
        var config = cm.get('config')
        var opts = clone(config.map);
        if (config.zoomControl === 'leaflet') {
            opts.zoomControl = true;
        }
        if (config.copyrightControl === 'leaflet') {
            opts.attributionControl = true;
        }
        return L.map(cm.get('container'), opts);
    });

    cm.define('gmxMap', ['map', 'config'], function(cm, cb) {
        var config = cm.get('config');
        L.gmx.loadMap(config.gmxMap.mapID, config.gmxMap).then(function(layers) {
            cb({
                getRawTree: function() {
                    return layers.rawTree;
                },
                getLayersHash: function() {
                    return layers.layersByID;
                }
            });
        });
    });

    cm.define('baseLayersManager', ['map', 'gmxMap', 'config'], function(cm, cb) {
        var map = cm.get('map');
        var gmxMap = cm.get('gmxMap');
        var config = cm.get('config');

        var baseLayers = gmxMap.getRawTree().properties.BaseLayers.trim().slice(1, -1).split(',').map(function(e) {
            return e.trim().slice(1, -1)
        });
        if (!map.gmxBaseLayersManager) {
            console.error('no base baseLayersManager found');
            return false;
        }
        map.gmxBaseLayersManager.initDefaults().then(function() {
            map.gmxBaseLayersManager.setActiveIDs(baseLayers).setCurrentID(baseLayers[0]);
            cb(map.gmxBaseLayersManager);
        });
    });

    cm.define('baseLayersControl', ['map', 'baseLayersManager', 'i18n'], function(cm, cb) {
        var map = cm.get('map');
        var config = cm.get('config');
        var baseLayersManager = cm.get('baseLayersManager');
        if (config.baseLayersControl) {
            var ctrl = new nsGmx.BaseLayersControl(baseLayersManager, extend(config.baseLayersControl, {
                language: config.language
            }));
            map.addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('logoControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').copyrightControl;
        var ctrl = L.control.gmxLogo(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    });

    cm.define('hideControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').hideControl;
        if (opts) {
            var ctrl = L.control.gmxHide(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('zoomControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').zoomControl;
        if (opts && opts !== 'leaflet') {
            var ctrl = L.control.gmxZoom(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('centerControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').centerControl;
        if (opts) {
            var ctrl = L.control.gmxCenter(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('bottomControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').bottomControl;
        if (opts) {
            var ctrl = L.control.gmxBottom(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('locationControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').locationControl;
        if (opts) {
            var ctrl = L.control.gmxLocation(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('copyrightControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').copyrightControl;
        if (opts && opts !== 'leaflet') {
            var ctrl = L.control.gmxCopyright(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    return cm;
};