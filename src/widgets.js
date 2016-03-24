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

cm.define('layersTreeWidget', ['sidebarWidget', 'layersTree', 'resetter', 'config', 'map'], function(cm) {
    var sidebarWidget = cm.get('sidebarWidget');
    var layersTree = cm.get('layersTree');
    var resetter = cm.get('resetter');
    var config = cm.get('config');
    var map = cm.get('map');

    if (!config.app.layersTreeWidget) {
        return null;
    }

    if (!(nsGmx.LayersTreeWidget && layersTree && sidebarWidget)) {
        return false;
    }

    var container = sidebarWidget.addTab('sidebarTab-layersTree', 'icon-layers');

    var layersTreeWidget = new nsGmx.LayersTreeWidget(L.extend({
        isMobile: nsGmx.Utils.isMobile()
    }, config.app.layersTreeWidget, {
        layersTree: layersTree
    }));

    layersTreeWidget.on('centerLayer', function(model) {
        map.fitBounds(model.getLatLngBounds());
    })

    resetter.on('reset', function() {
        layersTreeWidget.reset();
    });

    if (nsGmx.ScrollView) {
        var scrollView = new nsGmx.ScrollView({
            views: [layersTreeWidget]
        });

        $(window).on('resize', function() {
            scrollView.repaint();
        });

        function repaint(le) {
            if (le.id === 'sidebarTab-layersTree') {
                scrollView.repaint();
            }
        }
        sidebarWidget.on('content', repaint);
        sidebarWidget.on('opened', repaint);
        sidebarWidget.on('stick', repaint);

        scrollView.appendTo(container);
    } else {
        layersTreeWidget.appendTo(container);
    }

    return layersTreeWidget;
});

cm.define('bookmarksWidget', ['map', 'rawTree', 'sidebarWidget', 'permalinkManager'], function(cm) {
    var config = cm.get('config');
    var sidebar = cm.get('sidebarWidget');
    var rawTree = cm.get('rawTree');
    var permalinkManager = cm.get('permalinkManager');

    if (!permalinkManager) {
        return null;
    }

    if (config.app.bookmarksWidget && nsGmx.BookmarksWidget && rawTree && sidebar) {
        var container = sidebar.addTab('sidebarTab-bookmarksWidget', 'icon-bookmark');
        var bookmarksWidget = new nsGmx.BookmarksWidget({
            collection: new Backbone.Collection(JSON.parse(rawTree.properties.UserData && rawTree.properties.UserData).tabs)
        });

        bookmarksWidget.on('selected', function(model) {
            permalinkManager.loadFromData(model.get('state'));
        });

        if (nsGmx.ScrollView) {
            var scrollView = new nsGmx.ScrollView({
                views: [bookmarksWidget]
            });

            $(window).on('resize', function() {
                scrollView.repaint();
            });

            function repaint(le) {
                if (le.id === 'sidebarTab-bookmarksWidget') {
                    scrollView.repaint();
                }
            }
            sidebar.on('content', repaint);
            sidebar.on('opened', repaint);
            sidebar.on('stick', repaint);

            scrollView.appendTo(container);
        } else {
            bookmarksWidget.appendTo(container);
        }

        return bookmarksWidget;
    } else {
        return null;
    }
});

cm.define('storytellingWidget', ['permalinkManager', 'rawTree', 'config', 'map'], function(cm) {
    var permalinkManager = cm.get('permalinkManager');
    var rawTree = cm.get('rawTree');
    var config = cm.get('config');
    var map = cm.get('map');

    if (config.app.storytellingWidget) {
        var StorytellingControlClass = config.app.storytellingWidget.type === 'accordeon' ?
            nsGmx.StorytellingAccordeonControl :
            nsGmx.StorytellingControl;

        var storytellingControl = new StorytellingControlClass(L.extend(config.app.storytellingWidget, {
            bookmarks: rawTree.properties.UserData && JSON.parse(rawTree.properties.UserData).tabs
        }));

        storytellingControl.on('storyChanged', function(story) {
            permalinkManager && permalinkManager.loadFromData(story.state)
        });

        map.addControl(storytellingControl);

        return storytellingControl;
    } else {
        return null;
    }
});

cm.define('calendarContainer', ['hideControl', 'sidebarWidget', 'config', 'map'], function(cm) {
    var sidebarWidget = cm.get('sidebarWidget');
    var hideControl = cm.get('hideControl');
    var config = cm.get('config');
    var map = cm.get('map');

    if (!config.app.calendarWidget) {
        return null;
    }

    if (!(window.$ && window.nsGmx.GmxWidget && window.nsGmx.Utils)) {
        return false;
    }

    var CalendarContainer = L.Control.extend({
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

    var calendarContainer = new CalendarContainer({
        position: 'topright'
    });

    map.addControl(calendarContainer);

    hideControl && hideControl.on('statechange', function(ev) {
        ev.target.options.isActive ? calendarContainer.show() : calendarContainer.hide();
    });

    return calendarContainer;
});

cm.define('calendarWidget', ['calendarContainer', 'calendar', 'resetter', 'config'], function(cm) {
    var calendarContainer = cm.get('calendarContainer');
    var calendar = cm.get('calendar');
    var resetter = cm.get('resetter');
    var config = cm.get('config');

    if (!calendar || !calendarContainer || !config.app.calendarWidget) {
        return null;
    }

    var calendarClass = config.app.calendarWidget.type === 'fire' ?
        nsGmx.FireCalendarWidget :
        nsGmx.CalendarWidget;

    if (!calendarClass) {
        return false;
    }

    $(container).addClass('gmxApplication_withCalendar');

    var calendarWidget = new calendarClass(L.extend({
        dateInterval: calendar,
        container: calendarContainer.getContainer(),
        dateFormat: 'dd-mm-yy',
        dateMax: new Date()
    }, config.app.calendarWidget));

    resetter.on('reset', function() {
        calendarWidget.reset();
    });

    return calendarWidget;
});
