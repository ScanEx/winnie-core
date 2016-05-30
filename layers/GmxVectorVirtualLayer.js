window.nsGmx = nsGmx || {};

+ function() {

    var GmxVectorVirtualLayer = L.Class.extend({
        // <String> options.gmxId (MAPID:LAYERID)
        initialize: function(options) {
            L.setOptions(this, options);
            this._layerIsVisible = false;
        },

        onAdd: function(map) {
            this._layerIsVisible = true;
            this._ensureLayer().then(function(layer) {
                this._updateLayerVisibility(map, layer);
            }.bind(this), this._handleLayerError.bind(this));
        },

        onRemove: function(map) {
            this._layerIsVisible = false;
            this._ensureLayer().then(function(layer) {
                this._updateLayerVisibility(map, layer);
            }.bind(this), this._handleLayerError.bind(this));
        },

        setDateInterval: function() {
            var args = arguments;
            this._ensureLayer().then(function(layer) {
                layer.setDateInterval.apply(layer, args);
            }.bind(this), this._handleLayerError.bind(this));
        },

        bindClusters: function() {
            var args = arguments;
            this._ensureLayer().then(function(layer) {
                layer.bindClusters.apply(layer, args);
            }.bind(this), this._handleLayerError.bind(this));
        },

        bindHeatmap: function() {
            var args = arguments;
            this._ensureLayer().then(function(layer) {
                layer.bindHeatmap.apply(layer, args);
            }.bind(this), this._handleLayerError.bind(this));
        },

        _ensureLayer: function() {
            if (!this._pEnsureLayer) {
                var mapId = this.options.gmxId.split(':')[0];
                var layerId = this.options.gmxId.split(':')[1];
                this._pEnsureLayer = L.gmx.loadLayer(mapId, layerId);
            }
            return this._pEnsureLayer;
        },

        _updateLayerVisibility: function(map, layer) {
            if (this._layerIsVisible) {
                map.addLayer(layer);
            } else {
                map.removeLayer(layer);
            }
        },

        _handleLayerError: function (err) {
            console.error(err);
        }
    });

    var Factory = L.Class.extend({
        initialize: function(options) {},

        initFromDescription: function(layerProperties) {
            var metaProps = {};
            layerProperties.properties.MetaProperties &&
                Object.keys(layerProperties.properties.MetaProperties).map(function(mp) {
                    metaProps[mp] = layerProperties.properties.MetaProperties[mp].Value
                });

            return new GmxVectorVirtualLayer(metaProps);
        }
    });

    L.gmx.addLayerClass('gmxVector', Factory);

}();
