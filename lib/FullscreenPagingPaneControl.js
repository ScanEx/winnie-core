var nsGmx = nsGmx || {};

nsGmx.FullscreenPagingPaneControl = L.Control.extend({
    initialize: function (options) {
        L.Control.prototype.initialize.apply(this, arguments);
        this.options.position = 'fullscreenpagingpanecenter';
        this._panes = {};
    },

    onAdd: function (map) {
        this._controlCornerEl = L.DomUtil.create('div', 'leaflet-top leaflet-bottom leaflet-left leaflet-right fullscreenPagingPaneControl-controlCorner', map._controlContainer);
        this._terminateMouseEvents(this._controlCornerEl);
        map._controlCorners['fullscreenpagingpanecenter'] = this._controlCornerEl;

        this._container = L.DomUtil.create('div', 'fullscreenPagingPaneControl-container');
        return this._container;
    },

    addPane: function (id) {
        var paneContainer = L.DomUtil.create('div', 'fullscreenPagingPaneControl-pane');
        this._panes[id] = paneContainer;
        return paneContainer;
    },

    showPane: function (id) {
        if (!this._container) {
            return;
        }
        this._container.innerHTML = '';
        L.DomUtil.addClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
        L.DomUtil.addClass(this._controlCornerEl, 'fullscreenPagingPaneControl_fullscreen');
        this._container.appendChild(this._panes[id]);
    },

    hidePanes: function () {
        L.DomUtil.removeClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
        L.DomUtil.removeClass(this._controlCornerEl, 'fullscreenPagingPaneControl_fullscreen');
        this._container.innerHTML = '';
    },

    _terminateMouseEvents: function(el) {
        L.DomEvent.disableClickPropagation(el);
        el.addEventListener('mousewheel', L.DomEvent.stopPropagation);
    }
});
