var ContainerView = Backbone.View.extend({
    addView: function (view) {
        this.view = view;
        this.$el.append(view.el);
        this.trigger('addview');
    }
});

// returns nsGmx.ScrollView
function createScrollingSidebarTab(sidebarWidget, tabId, tabIcon) {
    var container = sidebarWidget.addTab(tabId, tabIcon);
    var scrollView = new nsGmx.ScrollView();
    scrollView.appendTo(container);

    $(window).on('resize', function() {
        scrollView.repaint();
    });

    function repaint(le) {
        if (le.id === tabId) {
            scrollView.repaint();
        }
    }

    sidebarWidget.on('content', repaint);
    sidebarWidget.on('opened', repaint);
    sidebarWidget.on('stick', repaint);

    return scrollView;
}

cm.define('sidebarWidget', ['resetter', 'config', 'map'], function(cm) {
    var resetter = cm.get('resetter');
    var config = cm.get('config');
    var map = cm.get('map')

    if (config.app.sidebarWidget && nsGmx.IconSidebarControl) {
        var sidebarControl = new nsGmx.IconSidebarControl(config.app.sidebarWidget);
        sidebarControl.addTo(map);
        sidebarControl.on('opening', function() {
            resetter.reset();
        });
        sidebarControl.on('closing', function() {
            resetter.reset();
        });
        if (nsGmx.Utils.isMobile()) {
            sidebarControl.setMode('mobile');
        }
        sidebarControl.on('stick', function(e) {
            [
                cm.get('baseLayersControl'),
                cm.get('logoControl'),
                cm.get('hideControl'),
                cm.get('zoomControl'),
                cm.get('centerControl'),
                cm.get('bottomControl'),
                cm.get('locationControl'),
                cm.get('copyrightControl'),
                cm.get('loaderStatusControl'),
                map.zoomControl,
                map.attributionControl
            ].map(function(ctrl) {
                if (e.isStuck) {
                    ctrl && L.DomUtil.addClass(ctrl.getContainer(), 'leaflet-control-gmx-hidden');
                } else {
                    ctrl && L.DomUtil.removeClass(ctrl.getContainer(), 'leaflet-control-gmx-hidden');
                }
                resetter.reset();
            });
        });
        return sidebarControl;
    } else {
        return null;
    }
});

cm.define('mobileButtonsPane', ['map'], function (cm) {
    var map = cm.get('map');

    var mobileButtonsPane = new nsGmx.MobileButtonsPaneControl({
        position: 'bottom'
    });

    mobileButtonsPane.addTo(map);

    return mobileButtonsPane;
});

cm.define('fullscreenPagingPane', ['map'], function (cm) {
    var map = cm.get('map');

    var fullscreenPagingPane = new nsGmx.FullscreenPagingPaneControl();

    fullscreenPagingPane.addTo(map);

    return fullscreenPagingPane;
});

cm.define('fppTest', ['fullscreenPagingPane'], function (cm) {
    var fpp = cm.get('fullscreenPagingPane');
    var pane1 = fpp.addPane('pane1');
    pane1.innerHTML = 'pane1';
    var pane2 = fpp.addPane('pane2');
    pane2.innerHTML = 'pane2';
    window.fpp = fpp;
    fpp.showPane('pane2');
    return fpp;
})

cm.define('calendarWidgetContainer', ['hideControl', 'sidebarWidget', 'container', 'config', 'map'], function(cm) {
    var sidebarWidget = cm.get('sidebarWidget');
    var hideControl = cm.get('hideControl');
    var container = cm.get('container');
    var config = cm.get('config');
    var map = cm.get('map');

    if (!config.app.calendarWidget) {
        return null;
    }

    if (!(window.$ && window.nsGmx.GmxWidget && window.nsGmx.Utils)) {
        return false;
    }

    var CalendarContainerControl = L.Control.extend({
        includes: [nsGmx.GmxWidgetMixin, L.Mixin.Events],
        onAdd: function(map) {
            var container = this._container = L.DomUtil.create('div', 'calendarContainer');
            this._terminateMouseEvents();

            if (nsGmx.Utils.isMobile()) {
                L.DomUtil.addClass(container, 'calendarContainer_mobile');
            } else {
                L.DomUtil.addClass(container, 'calendarContainer_desktop');
            }

            L.DomEvent.addListener(container, 'click', function() {
                this.fire('click');
            }, this);

            return container;
        }
    });

    var calendarContainerControl = new CalendarContainerControl({
        position: 'topright'
    });

    map.addControl(calendarContainerControl);
    $(container).addClass('gmxApplication_withCalendar');

    hideControl && hideControl.on('statechange', function(ev) {
        ev.target.options.isActive ? calendarContainerControl.show() : calendarContainerControl.hide();
    });

    return new ContainerView({
        el: calendarContainerControl.getContainer()
    });
});

cm.define('layersTreeWidgetContainer', ['sidebarWidget', 'config'], function (cm) {
    var sidebarWidget = cm.get('sidebarWidget');
    var config = cm.get('config');

    if (!config.app.layersTreeWidget) {
        return null;
    }

    if (!nsGmx.LayersTreeWidget || !sidebarWidget) {
        return false;
    }

    var scrollView = createScrollingSidebarTab(sidebarWidget, 'sidebarTab-layersTree', 'icon-layers');

    return scrollView;
});

cm.define('bookmarksWidgetContainer', ['sidebarWidget', 'config'], function (cm) {
    var sidebarWidget = cm.get('sidebarWidget');
    var config = cm.get('config');

    if (!config.app.bookmarksWidget) {
        return null;
    }

    if (!nsGmx.BookmarksWidget || !sidebarWidget) {
        return false;
    }

    var scrollView = createScrollingSidebarTab(sidebarWidget, 'sidebarTab-bookmarksWidget', 'icon-bookmark');

    return scrollView;
});
