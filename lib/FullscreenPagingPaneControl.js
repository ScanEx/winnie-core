var nsGmx = nsGmx || {};

nsGmx.FullscreenPagingPaneControl = L.Control.extend({
    includes: [nsGmx.PagingViewMixin, nsGmx.FullscreenControlMixin, L.Mixin.Events],

    options: {
        className: 'fullscreenPagingPaneControl'
    },

    initialize: function (options) {
        L.Control.prototype.initialize.apply(this, arguments);
        this.on('showview', function () {
            this._container && L.DomUtil.addClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
            this._controlCornerEl && L.DomUtil.addClass(this._controlCornerEl, 'fullscreenPagingPaneControl_fullscreen');
        }.bind(this));
        this.on('hideview', function () {
            this._container && L.DomUtil.removeClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
            this._controlCornerEl && L.DomUtil.removeClass(this._controlCornerEl, 'fullscreenPagingPaneControl_fullscreen');
        }.bind(this));
    }
});
