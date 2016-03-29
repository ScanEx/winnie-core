var nsGmx = nsGmx || {};
var nsGmx = nsGmx || {};

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
    addView: function (view) {
        this.$el.append(view.el);
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
