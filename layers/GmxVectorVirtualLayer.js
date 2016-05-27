window.nsGmx = nsGmx || {};

+ function() {

    var GmxVectorVirtualLayer = L.Class.extend({
        // <String> options.gmxId (MAPID:LAYERID)
        initialize: function(options) {
            L.setOptions(this, options);
            this._layerIsVisible = false;
        },

        onAdd: function(map) {
            var mapId = this.options.gmxId.split(':')[0];
            var layerId = this.options.gmxId.split(':')[1];
            this._layerIsVisible = true;
            if (!this._actualLayer) {
                L.gmx.loadLayer(mapId, layerId).then(function(layer) {
                    this._actualLayer = layer;
                    this._updateLayerVisibility(map);
                }.bind(this), function (err) {
                    console.error(err);
                }.bind(this))
            } else {
                this._updateLayerVisibility(map);
            }
        },

        onRemove: function(map) {
            this._layerIsVisible = false;
            this._updateLayerVisibility(map);
        },

        setDateInterval: function () {
            this._actualLayer && this._actualLayer.setDateInterval.apply(this._actualLayer, arguments);
        },

        _updateLayerVisibility: function() {
            if (this._layerIsVisible) {
                this._actualLayer && map.addLayer(this._actualLayer);
            } else {
                this._actualLayer && map.removeLayer(this._actualLayer);
            }
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
