cm.define('globals', ['layersTree', 'layersHash', 'calendar', 'rawTree', 'config', 'map'], function() {
    if (!cm.get('config').app.globals) {
        return null;
    }

    window.cal = cm.get('calendar');
    window.lt = cm.get('layersTree');
    window.lh = cm.get('layersHash');
    window.rt = cm.get('rawTree');
    window.cfg = cm.get('config');
    window.map = cm.get('map');

    return null;
});

cm.define('debugWindow', ['logger', 'config', 'map'], function() {
    var logger = cm.get('logger');
    var config = cm.get('config');
    var map = cm.get('map');

    var opts = config.app.debugWindow;

    if (!opts) {
        return null;
    }

    var debugWindowControl = new(L.Control.extend({
        // options.logger
        initialize: function (options) {
            this.loggerCollection = options.logger;
            this.loggerCollection.on('add', this.render, this);
            this.render();
        },
        render: function () {
            if (!this._container || !this.loggerCollection.length) {
                return;
            }
            L.DomUtil.addClass(this._container, 'debugWindowControl_active');
            this.loggerCollection.map(function (msgModel) {
                var el = L.DomUtil.create('div', '', this._container);
                el.innerHTML = msgModel.get('message');
            }.bind(this));
        },
        onAdd: function(map) {
            this._container = L.DomUtil.create('div', 'debugWindowControl');
            this._controlCornerEl = L.DomUtil.create(
                'div',
                'leaflet-top leaflet-bottom leaflet-left leaflet-right debugWindowControl-controlCorner',
                map._controlContainer
            );
            map._controlCorners['debugwindow'] = this._controlCornerEl;
            this.options.position = 'debugwindow';
            this.render();
            return this._container;
        }
    }))({
        logger: logger
    });

    debugWindowControl.addTo(map);

    return debugWindowControl;
});
