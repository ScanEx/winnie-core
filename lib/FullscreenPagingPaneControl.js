var nsGmx = nsGmx || {};

nsGmx.FullscreenPagingPaneControl = L.Control.extend({
    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'fullscreenPagingPaneControl');
        return this._container;
    }
});
