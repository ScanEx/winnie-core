var nsGmx = nsGmx || {};

nsGmx.createMapApplication = function(mapPlaceholder, applicationConfig, componentsManager) {
    var cm = componentsManager || window.cm;

    // returns config object
    cm.define('config', [], function(cm, cb) {
        if (typeof applicationConfig === 'object') {
            return applicationConfig;
        } else if (typeof applicationConfig === 'string') {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', applicationConfig, true);
            xhr.addEventListener('load', function(pe) {
                if (pe.status === 200) {
                    try {
                        var config = JSON.parse(pe.currentTarget.response);
                    } catch (e) {
                        console.error('invalid config');
                    }
                    if (config) {
                        cb(config);
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

    // returns DOM element
    cm.define('container', [], function() {
        return mapPlaceholder.length ? mapPlaceholder[0] : mapPlaceholder;
    });

    cm.define('gmxMap', ['config', 'container'], function(cm, cb) {
        var config = cm.get('config');
        var container = cm.get('container');

        var map = L.map(container, {
            attributionControl: false
        }).setView([
            (config.gmxMap && config.gmxMap.x) || 53, (config.gmxMap && config.gmxMap.y) || 82
        ], (config.gmxMap && config.gmxMap.z) || 3);

        L.gmx.loadMap(config.gmxMap && config.gmxMap.mapId, {
            apiKey: config.gmxMap && config.gmxMap.apiKey,
            setZIndex: true
        }).then(function(layers) {
            cb({
                getLeafletMap: function() {   
                    return map;
                },
                getRawTree: function() {
                    return layers.rawTree;
                },
                getLayersHash: function() {
                    return layers.layersByID;
                }
            });
        });
    });

    cm.define('baseLayersManager', ['gmxMap', 'config'], function(cm, cb) {
        var gmxMap = cm.get('gmxMap');
        var config = cm.get('config');
        var leafletMap = gmxMap.getLeafletMap();
        var baseLayers = gmxMap.getRawTree().properties.BaseLayers.trim().slice(1, -1).split(',').map(function(e) {
            return e.trim().slice(1, -1)
        });
        if (!leafletMap.gmxBaseLayersManager) {
            console.error('no base baseLayersManager found');
            return false;
        }
        leafletMap.gmxBaseLayersManager.initDefaults().then(function() {
            leafletMap.gmxBaseLayersManager.setActiveIDs(baseLayers).setCurrentID(baseLayers[0]);
            cb(leafletMap.gmxBaseLayersManager);
        });
    });

    // cm.define('layersDebugger', ['layersTree'], function(cm) {
    //     var layersTree = cm.get('layersTree');
    //     var ld = window.ld = {
    //         trace: function() {
    //             layersTree.eachNode(function(node) {
    //                 console.log([Array(node.get('depth') + 1).join('-'), node.get('properties').title, node.get('properties').LayerID || node.get('properties').GroupID, node.get('visible')].join(' '));
    //             });
    //         }
    //     };
    //     return ld;
    // });
};