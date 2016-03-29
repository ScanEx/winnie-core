var nsGmx = nsGmx || {};

nsGmx.PagingViewMixin = {
    _getEl: function() {
        return this.el || this._container;
    },

    _emit: function(ev, params) {
        if (this.fire) {
            this.fire(ev, params || {});
        } else if (this.trigger) {
            this.trigger(ev, params || {});
        }
    },

    _updateViewClass: function(id) {
        var el = this._getEl();
        var className = this.className || (this.options && this.options.className);
        if (!className) {
            return;
        }
        if (this._currentViewId) {
            L.DomUtil.removeClass(el, className + '_page-' + this._currentViewId);
        }
        this._currentViewId = id;
        if (this._currentViewId) {
            L.DomUtil.addClass(el, className + '_page-' + this._currentViewId);
        }
    },

    addView: function(id, view) {
        if (!this._views) {
            this._views = {};
        };
        this._views[id] = view;
        this._emit('addview');
    },

    showView: function(id) {
        var el = this._getEl();
        this._updateViewClass(id);
        el.innerHTML = '';
        el.appendChild(this._views[id].el);
        this._emit('showview', {
            id: id
        })
    },

    hideView: function() {
        var el = this._getEl();
        this._updateViewClass(null);
        el.innerHTML = '';
        this._emit('hideview');
    }
};

nsGmx.PagingView = Backbone.View.extend(nsGmx.PagingViewMixin);
