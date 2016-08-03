// DateInterval model
cm.define('calendar', ['permalinkManager', 'config'], function(cm) {
    var permalinkManager = cm.get('permalinkManager');
    var config = cm.get('config');

    if (!(window.Backbone && window.nsGmx && window.nsGmx.DateInterval)) {
        return false;
    }

    var cal = new nsGmx.DateInterval();

    if (config.app.calendarWidget && config.app.calendarWidget.type === 'fire' && nsGmx.FireCalendarWidget) {
        cal.set(nsGmx.FireCalendarWidget.defaultFireDateInterval());
    }

    permalinkManager && permalinkManager.setIdentity('calendar', cal);

    return cal;
});

// LayersTreeNode model
cm.define('layersTree', ['rawTree', 'permalinkManager'], function(cm) {
    var rawTree = cm.get('rawTree');
    var permalinkManager = cm.get('permalinkManager');
    if (nsGmx && nsGmx.LayersTreeNode) {
        var layersTree = new nsGmx.LayersTreeNode({
            content: rawTree
        });

        // fix layers tree if (if it was created manually)
        layersTree.eachNode(function (node) {
            node.setNodeVisibility(node.get('visible'));
        });

        permalinkManager && permalinkManager.setIdentity('layersTree', layersTree);
        return layersTree;
    } else {
        return false;
    }
});

cm.define('layersMapper', ['config', 'map', 'layersHash', 'layersTree'], function(cm) {
    var LayersMapper = L.Class.extend({
        options: {
            map: null,
            layersHash: null,
            layersTree: null
        },
        initialize: function(options) {
            this._map = options.map;
            this._layersHash = L.extend({}, options.layersHash);
            this._layersTree = options.layersTree;

            this._layersTree.on('childChange', function(model) {
                if (model.changedAttributes().hasOwnProperty('visible')) {
                    this._updateLayerVisibility(model);
                }
            }.bind(this));

            this._layersTree.eachNode(function(model) {
                this._updateLayerVisibility(model);
            }.bind(this), true);
        },
        spoofLayer: function(layerId, newLayer) {
            var model = this._layersTree.find(layerId);
            var oldLayer = this._layersHash[layerId];
            if (!model || !oldLayer) {
                return;
            }
            this._map.removeLayer(oldLayer);
            this._layersHash[layerId] = newLayer;
            this._updateLayerVisibility(model);
        },
        _updateLayerVisibility: function(model) {
            var id = model.get('properties').name;
            if (!id || !this._layersHash[id]) {
                return;
            }
            if (model.get('visible')) {
                this._layersHash[id].removeFilter && this._layersHash[id].removeFilter();
                this._map.addLayer(this._layersHash[id]);
            } else {
                this._map.removeLayer(this._layersHash[id]);
            }
        }
    })

    var config = cm.get('config');
    if (config.app.layersMapper) {
        return new LayersMapper({
            map: cm.get('map'),
            layersHash: cm.get('layersHash'),
            layersTree: cm.get('layersTree')
        })
    } else {
        return null;
    }
});

cm.define('layersClusters', ['layersHash', 'layersMapper', 'resetter', 'config', 'map'], function(cm) {
    var layersHash = cm.get('layersHash');
    var resetter = cm.get('resetter');
    var config = cm.get('config');

    if (!config.layers) {
        return null;
    }

    var layersClustersManager = new(L.Class.extend({
        includes: [L.Mixin.Events],
        options: {
            layersHash: {},
            defaultClustersOptions: {
                maxZoom: 30
            }
        },
        initialize: function(options) {
            L.setOptions(this, options);
            _.mapObject(this.options.layersHash, function(layer, layerId) {
                if (!layer.bindClusters) {
                    return;
                }

                layer.bindClusters(
                    L.extend(
                        this.options.defaultClustersOptions,
                        this.options.layersConfig[layerId].clusters
                    )
                );

                layer._clusters.externalLayer.on('spiderfied', function(ev) {
                    this.fire('spiderfied', ev);
                }.bind(this));
                layer._clusters.externalLayer.on('unspiderfied', function(ev) {
                    this.fire('unspiderfied', ev);
                }.bind(this));
            }.bind(this));
        },

        reset: function() {
            _.mapObject(this.options.layersHash, function(layer, layerId) {
                // TODO: don't use private properties
                layer._clusters &&
                    layer._clusters.externalLayer &&
                    layer._clusters.externalLayer._unspiderfy &&
                    layer._clusters.externalLayer._unspiderfy()
            }.bind(this));
        }
    }))({
        layersHash: _.pick(layersHash, _.keys(config.layers).filter(function(key) {
            return config.layers[key].clusters
        })),
        layersConfig: cm.get('config').layers
    });

    resetter.on('reset', function() {
        layersClustersManager.reset();
    });

    return layersClustersManager;
});

cm.define('layersHeatmaps', ['config', 'layersHash'], function(cm) {
    var config = cm.get('config');
    var layersHash = cm.get('layersHash');
    if (!config.layers) {
        return null;
    }
    for (var layerId in config.layers) {
        var layer = layersHash[layerId]
        if (
            config.layers.hasOwnProperty(layerId) &&
            config.layers[layerId].heatmap &&
            layer
        ) {
            var opts = L.extend({}, config.layers[layerId].heatmap);
            layer.bindHeatMap(opts);
        }
    }
    return null;
});

cm.define('layersTranslations', ['layersTree', 'config', 'i18n'], function(cm) {
    var layersTree = cm.get('layersTree');
    var config = cm.get('config');
    var i18n = cm.get('i18n');

    var translatableProperties = ['title', 'description'];
    if (!config.layers) {
        return null;
    }
    for (var layerId in config.layers) {
        var props = config.layers[layerId];
        var layer = layersTree.find(layerId);
        if (config.layers.hasOwnProperty(layerId) && layer) {
            var layerProperties = layer.get('properties');
            for (var i = 0; i < translatableProperties.length; i++) {
                var prop = translatableProperties[i];
                var lang = i18n.getLanguage();
                if (
                    props[prop] &&
                    props[prop][lang] &&
                    layerProperties[prop]
                ) {
                    layerProperties[prop] = props[prop][lang];
                }
            }
        }
    }
    return null;
});

cm.define('dateMapper', ['layersHash', 'calendar'], function(cm) {
    var layersHash = cm.get('layersHash');
    var calendar = cm.get('calendar');

    calendar.on('change', mapDate);
    mapDate();

    return null;

    function mapDate() {
        for (layer in layersHash) {
            if (layersHash.hasOwnProperty(layer)) {
                layersHash[layer].setDateInterval && layersHash[layer].setDateInterval(calendar.get('dateBegin'), calendar.get(
                    'dateEnd'));
            }
        }
    }
});
