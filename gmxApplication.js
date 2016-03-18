var nsGmx = nsGmx || {};

nsGmx.createGmxApplication = function(container, applicationConfig) {
    var ComponentsManager = window.cm.ComponentsManager;
    var cm = new ComponentsManager();

    cm.define('mapActiveArea', ['map'], function(cm) {
        if (!cm.get('map').setActiveArea) {
            return false;
        }

        return new(L.Class.extend({
            initialize: function(options) {
                this.options = L.setOptions(this, options);
                this.resetActiveArea();
            },
            setActiveArea: function() {
                this.options.map.setActiveArea.apply(this.options.map, arguments);
            },
            resetActiveArea: function() {
                this.setActiveArea({
                    position: 'absolute',
                    border: '1 px solid red',
                    left: '0',
                    top: '0',
                    bottom: '0',
                    right: '0'
                });
            }
        }))({
            map: cm.get('map')
        });
    });

    // TODO: use controls manager
    cm.define('mapLayoutHelper', ['map'], function(cm) {
        return new(L.Class.extend({
            initialize: function(cm) {
                this.cm = cm;
            },
            showBottomControls: function() {
                this._getBottomControls().map(function(ctrl) {
                    L.DomUtil.removeClass(ctrl.getContainer(), 'leaflet-control-gmx-hidden');
                });
            },
            hideBottomControls: function() {
                this._getBottomControls().map(function(ctrl) {
                    L.DomUtil.addClass(ctrl.getContainer(), 'leaflet-control-gmx-hidden');
                });
            },
            _getBottomControls: function() {
                var bottomControls = [];
                this.cm.get('bottomControl') && bottomControls.push(this.cm.get('bottomControl'));
                this.cm.get('copyrightControl') && bottomControls.push(this.cm.get('copyrightControl'));
                this.cm.get('logoControl') && bottomControls.push(this.cm.get('logoControl'));
                this.cm.get('locationControl') && bottomControls.push(this.cm.get('locationControl'));
                this.cm.get('baseLayersControl') && bottomControls.push(this.cm.get('baseLayersControl'));
                return bottomControls;
            }
        }))(cm);
    });

    cm.define('mapSerializer', ['map', 'permalinkManager'], function(cm) {
        var map = cm.get('map');
        var permalinkManager = cm.get('permalinkManager');

        var serializer = {};
        serializer.saveState = function() {
            return {
                version: '1.0.0',
                position: {
                    x: map.getCenter().lng,
                    y: map.getCenter().lat,
                    z: map.getZoom()
                }
            };
        };
        serializer.loadState = function(data) {
            map.setView([data.position.y, data.position.x], data.position.z, {
                animate: false
            });
        };

        permalinkManager && permalinkManager.setIdentity('map', serializer);

        return serializer;
    });

    cm.define('balloonsSerializer', ['permalinkManager', 'layersHash', 'map'], function(cm) {
        var permalinkManager = cm.get('permalinkManager');
        var layersHash = cm.get('layersHash');
        var map = cm.get('map');

        var serializer = {};
        serializer.saveState = function() {};
        serializer.loadState = function(data) {
            for (var l in data) {
                var layer = layersHash[l];
                if (layer && layer.addPopup) {
                    data[l].forEach(layer.addPopup.bind(layer));
                }
            }
        };

        permalinkManager && permalinkManager.setIdentity('balloons', serializer);

        return serializer;
    });

    cm.define('drawingManager', ['permalinkManager', 'map'], function(cm, cb) {
        var permalinkManager = cm.get('permalinkManager');
        var map = cm.get('map');

        var drawingManager = map.gmxDrawing;

        if (!drawingManager) {
            return null;
        }

        permalinkManager && permalinkManager.setIdentity('drawingManager', drawingManager);

        return drawingManager;
    });

    cm.define('logoControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.copyrightControl;
        if (!window.L.control.gmxLogo) {
            return false;
        }
        var ctrl = L.control.gmxLogo(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    });

    cm.define('hideControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.hideControl;
        if (!window.L.control.gmxHide) {
            return false;
        }
        if (opts) {
            var ctrl = L.control.gmxHide(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('zoomControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.zoomControl;
        if (!window.L.control.gmxZoom) {
            return false;
        }
        if (opts && opts !== 'leaflet') {
            var ctrl = L.control.gmxZoom(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('centerControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.centerControl;
        if (!window.L.control.gmxCenter) {
            return false;
        }
        if (opts) {
            var ctrl = L.control.gmxCenter(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('bottomControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.bottomControl;
        if (!window.L.control.gmxBottom) {
            return false;
        }

        $(container).addClass('gmxApplication_withBottomControls');

        if (opts) {
            var ctrl = L.control.gmxBottom(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('locationControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.locationControl;
        if (!window.L.control.gmxLocation) {
            return false;
        }
        if (opts) {
            var ctrl = L.control.gmxLocation(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('copyrightControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.copyrightControl;
        if (!window.L.control.gmxCopyright) {
            return false;
        }
        if (opts && opts !== 'leaflet') {
            var ctrl = L.control.gmxCopyright(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('loaderStatusControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.loaderStatusControl;
        if (!window.L.control.gmxLoaderStatus) {
            return false;
        }
        if (opts) {
            var ctrl = L.control.gmxLoaderStatus(
                (typeof opts === 'object') ? opts : {}
            );
            cm.get('map').addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });





    cm.define('layersClusters', ['layersHash', 'resetter', 'config', 'map'], function(cm) {
        var layersHash = cm.get('layersHash');
        var resetter = cm.get('resetter');
        var config = cm.get('config');

        if (!config.layers) {
            return null;
        }

        var layersClustersManager = new(L.Class.extend({
            includes: [L.Mixin.Events],
            options: {
                layersHash: {},
                defaultClustersOptions: {
                    maxZoom: 30
                }
            },
            initialize: function(options) {
                L.setOptions(this, options);
                _.mapObject(this.options.layersHash, function(layer, layerId) {
                    layer.bindClusters(
                        L.extend(
                            this.options.defaultClustersOptions,
                            this.options.layersConfig[layerId].clusters
                        )
                    );
                    layer._clusters.externalLayer.on('spiderfied', function(ev) {
                        this.fire('spiderfied', ev);
                    }.bind(this));
                    layer._clusters.externalLayer.on('unspiderfied', function(ev) {
                        this.fire('unspiderfied', ev);
                    }.bind(this));
                }.bind(this));
            },
            reset: function() {
                _.mapObject(this.options.layersHash, function(layer, layerId) {
                    // TODO: don't use private properties
                    layer._clusters &&
                        layer._clusters.externalLayer &&
                        layer._clusters.externalLayer._unspiderfy &&
                        layer._clusters.externalLayer._unspiderfy()
                }.bind(this));
            }
        }))({
            layersHash: _.pick(layersHash, _.keys(config.layers).filter(function(key) {
                return config.layers[key].clusters
            })),
            layersConfig: cm.get('config').layers
        });

        resetter.on('reset', function() {
            layersClustersManager.reset();
        });

        return layersClustersManager;
    });

    cm.define('layersHeatmaps', ['config', 'layersHash'], function(cm) {
        var config = cm.get('config');
        var layersHash = cm.get('layersHash');
        if (!config.layers) {
            return null;
        }
        for (var layerId in config.layers) {
            var layer = layersHash[layerId]
            if (
                config.layers.hasOwnProperty(layerId) &&
                config.layers[layerId].heatmap &&
                layer
            ) {
                var opts = L.extend({}, config.layers[layerId].heatmap);
                layer.bindHeatMap(opts);
            }
        }
        return null;
    });

    cm.define('layersTranslations', ['layersTree', 'config', 'i18n'], function(cm) {
        var layersTree = cm.get('layersTree');
        var config = cm.get('config');
        var i18n = cm.get('i18n');

        var translatableProperties = ['title', 'description'];
        if (!config.layers) {
            return null;
        }
        for (var layerId in config.layers) {
            var props = config.layers[layerId];
            var layer = layersTree.find(layerId);
            if (config.layers.hasOwnProperty(layerId) && layer) {
                var layerProperties = layer.get('properties');
                for (var i = 0; i < translatableProperties.length; i++) {
                    var prop = translatableProperties[i];
                    var lang = i18n.getLanguage();
                    if (
                        props[prop] &&
                        props[prop][lang] &&
                        layerProperties[prop]
                    ) {
                        layerProperties[prop] = props[prop][lang];
                    }
                }
            }
        }
        return null;
    });



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

    cm.define('mobilePopups', ['mapLayoutHelper', 'mapActiveArea', 'layersMapper', 'layersHash', 'resetter', 'map'], function(cm) {
        var mapLayoutHelper = cm.get('mapLayoutHelper');
        var mapActiveArea = cm.get('mapActiveArea');
        var layersHash = cm.get('layersHash');
        var resetter = cm.get('resetter');
        var config = cm.get('config');
        var map = cm.get('map');

        if (!config.app.mobilePopups) {
            return null;
        }

        var InfoControl = L.Control.extend({
            options: {
                maxHeight: 200
            },
            includes: [nsGmx.GmxWidgetMixin],
            initialize: function(options) {
                L.setOptions(this, options);
                this._container = L.DomUtil.create('div', 'infoControl');
                this._terminateMouseEvents();
                this.render(null);
                this.hide();
            },
            render: function(html) {
                $(this._container).removeClass('infoControl_overflow');
                $(this._container).css('height', '');
                this._container.innerHTML = html;
                if ($(this._container).height() > this.options.maxHeight) {
                    $(this._container).addClass('infoControl_overflow');
                    $(this._container).height(this.options.maxHeight);
                }
                return this;
            },
            onAdd: function(map) {
                return this._container;
            }
        });

        var infoControl = new InfoControl({
            position: 'center',
            maxHeight: $(window).height() / 2
        });

        var evBus = new(L.Class.extend({
            includes: [L.Mixin.Events]
        }))();

        var popupIsActive = false;

        evBus.on('shown', function() {
            popupIsActive = true;
        });

        evBus.on('hidden', function() {
            popupIsActive = false;
        });

        map.addControl(infoControl);

        _.mapObject(layersHash, function(layer, layerId) {
            if (!layer.getStyles) {
                return;
            }
            unbindPopup(layer);
            layer.on('click', function(ev) {
                var balloonHtml = layer.getItemBalloon(ev.gmx.id);
                infoControl.render(balloonHtml);
                infoControl.show();
                mapLayoutHelper.hideBottomControls();
                mapActiveArea.setActiveArea({
                    bottom: infoControl.getContainer().scrollHeight + 'px'
                });
                map.setView(ev.latlng);
                evBus.fire('shown');
            });
        });

        resetter.on('reset', function() {
            if (popupIsActive) {
                infoControl.hide();
                mapLayoutHelper.showBottomControls();
                mapActiveArea.resetActiveArea();
            }
            evBus.fire('hidden');
        });

        return evBus;

        function unbindPopup(layer) {
            var styles = layer.getStyles();
            for (var i = 0; i < styles.length; i++) {
                styles[i].DisableBalloonOnClick = true;
            }
            layer.setStyles(styles);
        }
    });

    cm.define('globals', ['layersTree', 'layersHash', 'calendar', 'rawTree', 'config', 'map'], function() {
        if (!cm.get('config').app.globals) {
            return null;
        }

        window.cal = cm.get('calendar');
        window.lt = cm.get('layersTree');
        window.lh = cm.get('layersHash');
        window.rt = cm.get('rawTree');
        window.cfg = cm.get('config');
        window.map = cm.get('map');

        return null;
    });

    cm.define('debugWindow', ['map'], function() {
        var map = cm.get('map');

        var debugWindowControl = new(L.Control.extend({
            onAdd: function(map) {
                this._container = L.DomUtil.create('div', 'debugWindowControl');
                this._controlCornerEl = L.DomUtil.create(
                    'div',
                    'leaflet-top leaflet-bottom leaflet-left leaflet-right debugWindowControl-controlCorner',
                    map._controlContainer
                );
                map._controlCorners['debugwindow'] = this._controlCornerEl;
                this.options.position = 'debugwindow';
                return this._container;
            },
            log: function(str) {
                L.DomUtil.addClass(this._container, 'debugWindowControl_active');
                var el = L.DomUtil.create('div', '', this._container);
                el.innerHTML = str;
            }
        }))();

        debugWindowControl.addTo(map);

        return debugWindowControl;
    });

    return cm;
};
