var nsGmx = nsGmx || {};

nsGmx.FullscreenControlMixin = {
    onAdd: function(map) {
        var className = this.options.className;
        this.options = this.options || {};
        this.options.position = className.toLowerCase();

        this._controlCornerEl = L.DomUtil.create('div', 'leaflet-top leaflet-bottom leaflet-left leaflet-right ' + className +
            '-controlCorner', map._controlContainer);
        this._terminateMouseEvents(this._controlCornerEl);
        map._controlCorners[this.options.position] = this._controlCornerEl;

        this._container = L.DomUtil.create('div', className);
        return this._container;
    },

    _terminateMouseEvents: function(el) {
        L.DomEvent.disableClickPropagation(el);
        el.addEventListener('mousewheel', L.DomEvent.stopPropagation);
    }
}
