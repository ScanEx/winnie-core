var nsGmx = window.nsGmx = window.nsGmx || {};

nsGmx.IconButtonWidget = Backbone.View.extend({
    events: {
        'click': function () {
            this.trigger('click');
        }
    },
    // options.icon
    initialize: function (options) {
        this.$el.addClass('iconButtonWidget');
    }
});

nsGmx.MobileButtonsPaneWidget = Backbone.View.extend({
    className: 'mobileButtonsPaneWidget',

    initialize: function () {
        this._views = [];
    },

    render: function () {
        this.el.innerHTML = '';
        _.sortBy(this._views, 'priority').map(function (o) {
            this.$el.append(o.view.el);
        }.bind(this));
    },

    addView: function (view, priority) {
        this._views.push({
            view: view,
            priority: priority || 0
        });

        this.render();
        this.trigger('addview');
    }
});

nsGmx.MobileButtonsPaneControl = L.Control.extend({
    includes: [nsGmx.PagingViewMixin, nsGmx.FullscreenControlMixin, L.Mixin.Events],

    options: {
        className: 'mobileButtonsPaneControl'
    },

    initialize: function (options) {
        L.Control.prototype.initialize.apply(this, arguments);
        this.options.position = 'mobilebuttonspanecontrol';

        this._mainView = new nsGmx.MobileButtonsPaneWidget();
        this.addView('main', this._mainView);

        this._backView = new nsGmx.MobileButtonsPaneWidget();
        var backButton = new nsGmx.IconButtonWidget({
            className: 'icon-undo'
        });
        backButton.on('click', function () {
            this.showView('main');
            this.fire('backbuttonclick');
        }.bind(this));
        this._backView.addView(backButton);
        this.addView('back', this._backView);
    },

    getMainPane: function () {
        return this._mainView;
    },

    onAdd: function (map) {
        var container = nsGmx.FullscreenControlMixin.onAdd.apply(this, arguments);
        L.DomUtil.removeClass(this._controlCornerEl, 'leaflet-top');
        this.showView('main');
        return container;
    }
});
