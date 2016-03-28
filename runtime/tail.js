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

cm.define('debugWindow', ['map'], function() {
    var map = cm.get('map');

    var debugWindowControl = new(L.Control.extend({
        onAdd: function(map) {
            this._container = L.DomUtil.create('div', 'debugWindowControl');
            this._controlCornerEl = L.DomUtil.create(
                'div',
                'leaflet-top leaflet-bottom leaflet-left leaflet-right debugWindowControl-controlCorner',
                map._controlContainer
            );
            map._controlCorners['debugwindow'] = this._controlCornerEl;
            this.options.position = 'debugwindow';
            return this._container;
        },
        log: function(str) {
            L.DomUtil.addClass(this._container, 'debugWindowControl_active');
            var el = L.DomUtil.create('div', '', this._container);
            el.innerHTML = str;
        }
    }))();

    debugWindowControl.addTo(map);

    return debugWindowControl;
});
