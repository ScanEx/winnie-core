module.exports = function (cm) {
    cm.define('map', ['container', 'resetter', 'config'], function(cm, cb) {
        var L = require('leaflet');

        var container = cm.get('container');
        var resetter = cm.get('resetter');
        var config = cm.get('config');
        var opts = config.app.map;

        if (config.app.zoomControl === 'leaflet') {
            opts.zoomControl = true;
        }

        if (config.app.copyrightControl === 'leaflet') {
            opts.attributionControl = true;
        }

        var map = L.map(container[0] || container, opts);

        map.on('click zoomstart', function(le) {
            resetter.reset();
        });

        resetter.on('reset', function() {
            map.closePopup();
        });

        return map;
    });

    cm.define('gmxMap', ['map', 'config'], function(cm, cb) {
        var lGmx = require('leaflet-geomixer');

        var config = cm.get('config');

        L.gmx.loadMap(config.app.gmxMap.mapID, config.app.gmxMap).then(function(layers) {
            cb({
                getRawTree: function() {
                    return layers.rawTree;
                },
                getLayersHash: function() {
                    return layers.layersByID;
                }
            });
        }, function(err) {
            cb({
                getRawTree: function() {
                    return {
                        properties: {
                            BaseLayers: '[]'
                        },
                        children: []
                    }
                },
                getLayersHash: function() {
                    return {};
                },
                error: err
            })
        });
    });

    cm.define('rawTree', ['gmxMap'], function(cm) {
        return cm.get('gmxMap').getRawTree();
    });

    cm.define('layersHash', ['gmxMap'], function(cm) {
        return cm.get('gmxMap').getLayersHash();
    });

    cm.define('gmxMapErrorHandler', ['gmxMap'], function(cm) {
        var gmxMap = cm.get('gmxMap');
        if (gmxMap.error) {
            console.error(gmxMap.error);
        }
        return null;
    });

    cm.define('baseLayersManager', ['map', 'config', 'rawTree', 'permalinkManager', 'gmxMap'], function(cm, cb) {
        var GmxBaseLayersManager = require('gmx-base-layers-manager');

        var map = cm.get('map');
        var config = cm.get('config');
        var rawTree = cm.get('rawTree');
        var permalinkManager = cm.get('permalinkManager');

        var baseLayersManager = new GmxBaseLayersManager(map);
        var baseLayers = JSON.parse(rawTree.properties.BaseLayers);
        if (!baseLayersManager) {
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
            return false;
        }
        baseLayersManager.initDefaults({
            apiKey: config.app.gmxMap.apiKey
        }).then(function() {
            baseLayersManager.setActiveIDs(baseLayers).setCurrentID(baseLayers[0]);
            permalinkManager && permalinkManager.setIdentity('baseLayersManager', baseLayersManager);
            cb(baseLayersManager);
        });
    });
};
