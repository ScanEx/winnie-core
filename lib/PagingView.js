var nsGmx = nsGmx || {};

nsGmx.PagingViewMixin = {
    _getEl: function () {
        return this.el || this._container;
    },

    _emit: function (ev, params) {
        if (this.fire) {
            this.fire(ev, params || {});
        } else if (this.trigger) {
            this.trigger(ev, params || {});
        }
    },

    addView: function (id, view) {
        if (!this._views) {
            this._views = {};
        };
        this._views[id] = view;
        this._emit('addview');
    },

    showView: function (id) {
        var el = this._getEl();
        el.innerHTML = '';
        el.appendChild(this._views[id].el);
        this._emit('showview', {
            id: id
        })
    },

    hideView: function () {
        var el = this._getEl();
        el.innerHTML = '';
        this._emit('hideview');
    }
};

nsGmx.PagingView = Backbone.View.extend(nsGmx.PagingViewMixin);
