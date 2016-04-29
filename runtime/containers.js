var ContainerView = Backbone.View.extend({
    addView: function(view) {
        this.view = view;
        this.$el.append(view.el);
        this.trigger('addview');
    }
});

// returns nsGmx.ScrollView
function createScrollingSidebarTab(sidebarWidget, tabId, tabIcon, buttonPriority) {
    var container = sidebarWidget.addTab(tabId, tabIcon, buttonPriority);
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

function createScrollingPage(fullscreenPagingPane, mobileButtonsPane, viewId, buttonIcon, buttonPriority) {
    var scrollView = new nsGmx.ScrollView();

    var pane = fullscreenPagingPane.addView(viewId, scrollView);

    var button = new nsGmx.IconButtonWidget({
        className: buttonIcon
    });

    button.on('click', function() {
        fullscreenPagingPane.showView(viewId);
    });

    fullscreenPagingPane.on('showview', function () {
        scrollView.repaint();
    });

    mobileButtonsPane.addView(button, buttonPriority);

    return scrollView;
}

cm.define('sidebarWidget', ['container', 'resetter', 'config', 'map'], function(cm) {
    var rootContainer = cm.get('container');
    var resetter = cm.get('resetter');
    var config = cm.get('config');
    var map = cm.get('map')

    if (config.app.sidebarWidget && nsGmx.IconSidebarControl) {
        var position = config.app.sidebarWidget.position || 'right';
        L.DomUtil.addClass(rootContainer, position === 'right' ? 'gmxApplication_withRightSidebar' : 'gmxApplication_withLeftSidebar');

        var sidebarControl = new nsGmx.IconSidebarControl(config.app.sidebarWidget);
        sidebarControl.addTo(map);

        sidebarControl.on('opening', function() {
            resetter.reset();
        });

        sidebarControl.on('closing', function() {
            resetter.reset();
        });

        sidebarControl.on('opened', function(ev) {
            $(rootContainer).addClass('gmxApplication_sidebarShift');
        });

        sidebarControl.on('closing', function() {
            $(rootContainer).removeClass('gmxApplication_sidebarShift');
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

cm.define('fullscreenPagingPane', ['map'], function() {
    var map = cm.get('map');

    var fullscreenPagingPane = new (nsGmx.FullscreenPagingPaneControl.extend({
        hideView: function () {
            nsGmx.FullscreenPagingPaneControl.prototype.hideView.apply(this, arguments);
            var mbpc = cm.get('mobileButtonsPaneControl');
            mbpc && mbpc.showView('main');
        }
    }));

    fullscreenPagingPane.addTo(map);

    return fullscreenPagingPane;
});

cm.define('mobileButtonsPaneControl', ['map', 'container', 'fullscreenPagingPane'], function() {
    var fullscreenPagingPane = cm.get('fullscreenPagingPane');
    var mainContainer = cm.get('container');
    var map = cm.get('map');

    var mobileButtonsPaneControl = new nsGmx.MobileButtonsPaneControl();

    mobileButtonsPaneControl.getMainPane().once('addview', function() {
        $(mainContainer).addClass('gmxApplication_withMobileBar');
        mobileButtonsPaneControl.addTo(map);
    });

    mobileButtonsPaneControl.on('backbuttonclick', function() {
        fullscreenPagingPane.hideView();
    });

    fullscreenPagingPane.on('showview', function() {
        mobileButtonsPaneControl.showView('back');
    });

    return mobileButtonsPaneControl;
});

cm.define('mobileButtonsPane', ['mobileButtonsPaneControl'], function(cm) {
    return cm.get('mobileButtonsPaneControl').getMainPane();
});

cm.define('calendarWidgetContainer', [
        'fullscreenPagingPane',
        'mobileButtonsPane',
        'sidebarWidget',
        'hideControl',
        'container',
        'config',
        'map'
    ],
    function(cm) {
        var fullscreenPagingPane = cm.get('fullscreenPagingPane');
        var mobileButtonsPane = cm.get('mobileButtonsPane');
        var sidebarWidget = cm.get('sidebarWidget');
        var hideControl = cm.get('hideControl');
        var mainContainer = cm.get('container');
        var config = cm.get('config');
        var map = cm.get('map');

        if (!config.app.calendarWidget) {
            return null;
        }

        if (!(window.$ && window.nsGmx.GmxWidget && window.nsGmx.Utils)) {
            return false;
        }

        // return nsGmx.Utils.isMobile() ? createMobileContainer() : createDesktopContainer()
        return createDesktopContainer();

        function createDesktopContainer() {
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
                },

                addView: function(view) {
                    this._container.appendChild(view.el);
                }
            });

            var calendarContainerControl = new CalendarContainerControl({
                position: 'topright'
            });

            map.addControl(calendarContainerControl);
            $(mainContainer).addClass('gmxApplication_withCalendar');

            hideControl && hideControl.on('statechange', function(ev) {
                ev.target.options.isActive ? calendarContainerControl.show() : calendarContainerControl.hide();
            });

            return calendarContainerControl;
        }

        function createMobileContainer() {
            return {
                addView: function(view) {
                    var pane = fullscreenPagingPane.addView('calendarWidget', view);

                    var button = new nsGmx.IconButtonWidget({
                        className: 'icon-calendar'
                    });

                    button.on('click', function() {
                        fullscreenPagingPane.showView('calendarWidget');
                    });

                    mobileButtonsPane.addView(button, 10);
                }
            };
        }
    });

cm.define('layersTreeWidgetContainer', ['fullscreenPagingPane', 'mobileButtonsPane', 'sidebarWidget', 'config'], function(cm) {
    var fullscreenPagingPane = cm.get('fullscreenPagingPane');
    var mobileButtonsPane = cm.get('mobileButtonsPane');
    var sidebarWidget = cm.get('sidebarWidget');
    var config = cm.get('config');

    if (!config.app.layersTreeWidget) {
        return null;
    }

    if (!nsGmx.LayersTreeWidget || !sidebarWidget) {
        return false;
    }

    if (!nsGmx.Utils.isMobile()) {
        return createScrollingSidebarTab(sidebarWidget, 'sidebarTab-layersTree', 'icon-layers', 30);
    } else {
        return createScrollingPage(fullscreenPagingPane, mobileButtonsPane, 'layersTreeWidget', 'icon-layers', 30);
    }
});

cm.define('bookmarksWidgetContainer', ['fullscreenPagingPane', 'mobileButtonsPane', 'sidebarWidget', 'config'], function(cm) {
    var fullscreenPagingPane = cm.get('fullscreenPagingPane');
    var mobileButtonsPane = cm.get('mobileButtonsPane');
    var sidebarWidget = cm.get('sidebarWidget');
    var config = cm.get('config');

    if (!config.app.bookmarksWidget) {
        return null;
    }

    if (!nsGmx.BookmarksWidget || !sidebarWidget) {
        return false;
    }

    if (!nsGmx.Utils.isMobile()) {
        return createScrollingSidebarTab(sidebarWidget, 'sidebarTab-bookmarksWidget', 'icon-bookmark', 50);
    } else {
        return createScrollingPage(fullscreenPagingPane, mobileButtonsPane, 'bookmarksWidget', 'icon-bookmark', 50);
    }
});
