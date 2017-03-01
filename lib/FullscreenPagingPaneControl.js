var nsGmx = window.nsGmx = window.nsGmx || {};

nsGmx.FullscreenPagingPaneControl = L.Control.extend({
    includes: [nsGmx.PagingViewMixin, nsGmx.FullscreenControlMixin, L.Mixin.Events],

    options: {
        className: 'fullscreenPagingPaneControl'
    },

    initialize: function (options) {
        L.Control.prototype.initialize.apply(this, arguments);
        var currentViewId = null;
        this.on('showview', function (e) {
            currentViewId = e.id;
            this._container && L.DomUtil.addClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
            this._controlCornerEl && L.DomUtil.addClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_fullscreen');
            this._controlCornerEl && currentViewId && L.DomUtil.addClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_page-' + currentViewId);
        }.bind(this));
        this.on('hideview', function (e) {
            this._container && L.DomUtil.removeClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
            this._controlCornerEl && L.DomUtil.removeClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_fullscreen');
            this._controlCornerEl && currentViewId && L.DomUtil.removeClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_page-' + currentViewId);
        }.bind(this));
    }
});
