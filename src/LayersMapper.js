var L = require('leaflet');

module.exports = L.Class.extend({
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
            this._map.addLayer(this._layersHash[id]);
        } else {
            this._map.removeLayer(this._layersHash[id]);
        }
    }
})
