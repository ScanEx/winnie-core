var nsGmx = nsGmx || {};

nsGmx.MobileButtonsPaneControl = L.Control.extend({
    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'mobileButtonsPaneControl');
        return this._container;
    }
});
