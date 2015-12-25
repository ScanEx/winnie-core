var nsGmx = nsGmx || {};

nsGmx.createGmxApplication = function(container, applicationConfig) {
    var ComponentsManager = window.cm.ComponentsManager;
    var cm = new ComponentsManager();

    // returns config object
    cm.define('config', [], function(cm, cb) {
        var configConditions = function(config) {
            if (config.app.layersTreeWidget || config.app.bookmarksWidget) {
                config.app.sidebarWidget = {};
            }
            return config;
        };

        var setDefaults = function(config) {
            return configConditions($.extend(true, {
                app: {
                    map: {
                        center: [53, 82],
                        zoom: 3,
                        zoomControl: false,
                        attributionControl: false
                    },
                    gmxMap: {
                        setZIndex: true
                    },
                    i18n: {},
                    permalinkManager: {},
                    hideControl: {},
                    zoomControl: {},
                    centerControl: {
                        color: 'black'
                    },
                    bottomControl: {},
                    locationControl: {},
                    copyrightControl: {},
                    loaderStatusControl: {
                        type: 'font'
                    },
                    baseLayersControl: {},
                    layersMapper: {},
                    layersTreeWidget: false,
                    bookmarksWidget: false,
                    storytellingWidget: false,
                    sidebarWidget: false,
                    calendarWidget: false,
                    globals: false
                },
                state: {
                    map: {
                        position: {
                            x: 82,
                            y: 53,
                            z: 3
                        }
                    }
                }
            }, config));
        };

        if (typeof applicationConfig === 'object') {
            return setDefaults(applicationConfig);
        } else if (typeof applicationConfig === 'string') {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', applicationConfig, true);
            xhr.addEventListener('load', function(pe) {
                if (pe.currentTarget.status === 200) {
                    try {
                        var config = JSON.parse(pe.currentTarget.response || pe.currentTarget.responseText);
                    } catch (e) {
                        console.error('invalid config');
                    }
                    if (config) {
                        cb(setDefaults(config));
                    } else {
                        cb(false);
                    }
                } else {
                    console.error('failed to load config');
                    cb(false);
                }
            });
            xhr.send();
        } else {
            console.error('invalid config argument');
            cb(false);
        }
    });

    cm.define('resetter', [], function(cm) {
        return new(L.Class.extend({
            includes: [L.Mixin.Events],
            initialize: function() {},
            reset: function() {
                this.fire('reset');
            }
        }));
    });

    cm.define('i18n', ['config'], function(cm) {
        var config = cm.get('config');

        if (!(config.app.i18n && nsGmx.Translations)) {
            return false;
        }

        var lang = config.state.language || config.app.i18n.language || (nsGmx.Translations && nsGmx.Translations.getLanguage());
        if (lang) {
            L.gmxLocale && L.gmxLocale.setLanguage(lang);
            nsGmx.Translations && nsGmx.Translations.setLanguage(lang);
        }
        return nsGmx.Translations;
    });

    cm.define('mapsResourceServer', [], function(cm) {
        if (nsGmx.Auth && nsGmx.Auth.Server) {
            return new nsGmx.Auth.Server({
                root: 'http://maps.kosmosnimki.ru'
            });
        } else {
            return null;
        }
    });

    cm.define('permalinkManager', ['mapsResourceServer', 'config'], function(cm, cb) {
        var mapsResourceServer = cm.get('mapsResourceServer');
        var config = cm.get('config');

        if (!config.app.permalinkManager) {
            return null;
        }

        if (nsGmx.PermalinkManager && mapsResourceServer) {
            var permalinkManager = new nsGmx.PermalinkManager({
                provider: mapsResourceServer
            });
            var permalinkId = config.app.permalinkManager.permalinkId;
            if (permalinkId) {
                permalinkManager.loadFromId(permalinkId).then(function() {
                    cb(permalinkManager);
                }, function() {
                    console.warn('failed to load permalink ' + permalinkId);
                    cb(permalinkManager);
                });
            } else if (config.state) {
                permalinkManager.loadFromData({
                    version: '3.0.0',
                    components: config.state
                });
                return permalinkManager;
            } else {
                return permalinkManager;
            }
        } else if (nsGmx.StateManager) {
            var permalinkManager = new nsGmx.StateManager();
            permalinkManager.loadFromData({
                version: '3.0.0',
                components: config.state
            });
            return permalinkManager;
        } else {
            return null;
        }
    });

    cm.define('map', ['permalinkManager', 'resetter', 'config'], function(cm, cb) {
        var resetter = cm.get('resetter');
        var config = cm.get('config');
        var opts = config.app.map;

        if (config.app.zoomControl === 'leaflet') {
            opts.zoomControl = true;
        }

        if (config.app.copyrightControl === 'leaflet') {
            opts.attributionControl = true;
        }

        var map = L.map(container[0] || container, opts);

        map.on('click zoomstart dragend', function(le) {
            resetter.reset();
        });

        resetter.on('reset', function() {
            map.closePopup();
        });

        return map;
    });

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
                this.cm.get('bottomControl') && bottomControls.push(cm.get('bottomControl'));
                this.cm.get('copyrightControl') && bottomControls.push(cm.get('copyrightControl'));
                this.cm.get('logoControl') && bottomControls.push(cm.get('logoControl'));
                return bottomControls;
            }
        }))(cm);
    });

    cm.define('centerbsControlCorner', ['map'], function(cm) {
        var map = cm.get('map');
        var el = L.DomUtil.create('div', 'leaflet-top leaflet-bottom leaflet-left leaflet-right gmx-bottom-shift', map._controlContainer);
        L.DomUtil.addClass(el, L.Browser.ie ? 'gmxApplication-centerbsControlCorner-ie9' : 'gmxApplication-centerbsControlCorner');
        map._controlCorners['centerbs'] = el;
        return {
            fadeIn: function() {
                L.DomUtil.removeClass(el, 'gmx-bottom-shift');
                L.DomUtil.addClass(el, 'gmxApplication-centerbsControlCorner-fadeIn');
            },
            fadeOut: function() {
                L.DomUtil.addClass(el, 'gmx-bottom-shift');
                L.DomUtil.removeClass(el, 'gmxApplication-centerbsControlCorner-fadeIn');
            },
            getContainer: function() {
                return el;
            }
        }
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
            map.setView([data.position.y, data.position.x], data.position.z);
        };

        permalinkManager && permalinkManager.setIdentity('map', serializer);

        return serializer;
    });

    cm.define('widgetsContainerControl', ['map', 'centerbsControlCorner'], function(cm) {
        var map = cm.get('map');

        var WidgetsContainer = L.Control.extend({
            options: {
                position: 'centerbs'
            },
            onAdd: function() {
                this._container = L.DomUtil.create('div', 'gmxApplication-widgetsContainer');
                return this._container;
            }
        });

        var widgetsContainer = new WidgetsContainer();
        widgetsContainer.addTo(map);
        return widgetsContainer;
    });

    cm.define('widgetsContainer', ['widgetsContainerControl'], function(cm) {
        return cm.get('widgetsContainerControl').getContainer();
    });

    cm.define('gmxMap', ['map', 'config'], function(cm, cb) {
        var config = cm.get('config');
        if (!L.gmx || !L.gmx.loadMap) {
            return false;
        }
        L.gmx.loadMap(config.app.gmxMap.mapID, config.app.gmxMap).then(function(layers) {
            cb({
                getRawTree: function() {
                    return layers.rawTree;
                },
                getLayersHash: function() {
                    return layers.layersByID;
                }
            });
        }, function(err) {
            cb({
                getRawTree: function() {
                    return {
                        properties: {
                            BaseLayers: '[]'
                        },
                        children: []
                    }
                },
                getLayersHash: function() {
                    return {};
                },
                error: err
            })
        });
    });

    cm.define('rawTree', ['gmxMap'], function(cm) {
        return cm.get('gmxMap').getRawTree();
    });

    cm.define('layersHash', ['gmxMap'], function(cm) {
        return cm.get('gmxMap').getLayersHash();
    });

    cm.define('gmxMapErrorHandler', ['gmxMap'], function(cm) {
        var gmxMap = cm.get('gmxMap');
        if (gmxMap.error) {
            console.error(gmxMap.error);
        }
        return null;
    });

    cm.define('baseLayersManager', ['map', 'config', 'rawTree', 'permalinkManager'], function(cm, cb) {
        var map = cm.get('map');
        var config = cm.get('config');
        var rawTree = cm.get('rawTree');
        var permalinkManager = cm.get('permalinkManager');

        var baseLayers = rawTree.properties.BaseLayers.trim().slice(1, -1).split(',').map(function(e) {
            return e.trim().slice(1, -1)
        });
        if (!map.gmxBaseLayersManager) {
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
            return false;
        }
        map.gmxBaseLayersManager.initDefaults().then(function() {
            map.gmxBaseLayersManager.setActiveIDs(baseLayers).setCurrentID(baseLayers[0]);
            permalinkManager && permalinkManager.setIdentity('baseLayersManager', map.gmxBaseLayersManager);
            cb(map.gmxBaseLayersManager);
        });
    });

    cm.define('baseLayersControl', ['baseLayersManager', 'config', 'i18n', 'map'], function(cm, cb) {
        var baseLayersManager = cm.get('baseLayersManager');
        var config = cm.get('config');
        var i18n = cm.get('i18n');
        var map = cm.get('map');

        if (config.app.baseLayersControl && L.Control.GmxIconLayers) {
            var ctrl = new L.Control.GmxIconLayers(baseLayersManager, L.extend(config.app.baseLayersControl, {
                language: i18n.getLanguage()
            }));
            map.addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
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

    cm.define('calendar', ['permalinkManager', 'config'], function(cm) {
        var permalinkManager = cm.get('permalinkManager');
        var config = cm.get('config');

        if (!(window.Backbone && window.nsGmx && window.nsGmx.DateInterval)) {
            return false;
        }

        var cal = new nsGmx.DateInterval();
        
        if (config.app.calendarWidget && config.app.calendarWidget.type === 'fire' && nsGmx.FireCalendarWidget) {
            cal.set(nsGmx.FireCalendarWidget.defaultFireDateInterval());
        }

        permalinkManager && permalinkManager.setIdentity('calendar', cal);

        return cal;
    });

    cm.define('layersTree', ['rawTree', 'permalinkManager'], function(cm) {
        var rawTree = cm.get('rawTree');
        var permalinkManager = cm.get('permalinkManager');
        if (nsGmx && nsGmx.LayersTreeNode) {
            var layersTree = new nsGmx.LayersTreeNode({
                content: rawTree
            });
            permalinkManager && permalinkManager.setIdentity('layersTree', layersTree);
            return layersTree;
        } else {
            return false;
        }
    });

    cm.define('layersMapper', ['config', 'map', 'layersHash', 'layersTree'], function(cm) {
        var LayersMapper = L.Class.extend({
            options: {
                map: null,
                layersHash: null,
                layersTree: null
            },
            initialize: function(options) {
                this._map = options.map;
                this._layersHash = L.extend({}, options.layersHash);
                this._layersTree = options.layersTree;

                this._layersTree.on('childChange', function(model) {
                    if (model.changedAttributes().hasOwnProperty('visible')) {
                        this._updateLayerVisibility(model);
                    }
                }.bind(this));

                this._layersTree.eachNode(function(model) {
                    this._updateLayerVisibility(model);
                }.bind(this), true);
            },
            spoofLayer: function(layerId, newLayer) {
                var model = this._layersTree.find(layerId);
                var oldLayer = this._layersHash[layerId];
                if (!model || !oldLayer) {
                    return;
                }
                this._map.removeLayer(oldLayer);
                this._layersHash[layerId] = newLayer;
                this._updateLayerVisibility(model);
            },
            _updateLayerVisibility: function(model) {
                var id = model.get('properties').name;
                if (!id || !this._layersHash[id]) {
                    return;
                }
                if (model.get('visible')) {
                    this._map.addLayer(this._layersHash[id]);
                } else {
                    this._map.removeLayer(this._layersHash[id]);
                }
            }
        })

        var config = cm.get('config');
        if (config.app.layersMapper) {
            return new LayersMapper({
                map: cm.get('map'),
                layersHash: cm.get('layersHash'),
                layersTree: cm.get('layersTree')
            })
        } else {
            return null;
        }
    });

    cm.define('layersClusters', ['config', 'layersHash'], function(cm) {
        var config = cm.get('config');
        var layersHash = cm.get('layersHash');
        if (!config.layers) {
            return null;
        }
        for (var layerId in config.layers) {
            var layer = layersHash[layerId]
            if (
                config.layers.hasOwnProperty(layerId) &&
                config.layers[layerId].clusters &&
                layer
            ) {
                var opts = L.extend({
                    zoomToBoundsOnClick: false,
                    autoSpiderfy: true,
                    maxZoom: 30
                }, config.layers[layerId].clusters);
                if (opts.autoSpiderfy) {
                    opts = L.extend(opts, {
                        clusterclick: function(e) {
                            var bounds = e.layer.getBounds();
                            var nw = bounds.getNorthWest();
                            var se = bounds.getSouthEast();
                            if (nw.distanceTo(se) === 0) {
                                e.layer.spiderfy();
                            } else {
                                e.layer.zoomToBounds();
                            }
                        }
                    })
                }
                layer.bindClusters(opts);
            }
        }
        return null;
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

    cm.define('dateMapper', ['layersHash', 'calendar'], function(cm) {
        var layersHash = cm.get('layersHash');
        var calendar = cm.get('calendar');

        calendar.on('change', mapDate);
        mapDate();

        return null;

        function mapDate() {
            for (layer in layersHash) {
                if (layersHash.hasOwnProperty(layer)) {
                    layersHash[layer].setDateInterval(calendar.get('dateBegin'), calendar.get('dateEnd'));
                }
            }
        }
    });

    cm.define('sidebarWidget', ['centerbsControlCorner', 'widgetsContainer', 'resetter', 'config', 'map'], function(cm) {
        var centerbsControlCorner = cm.get('centerbsControlCorner');
        var widgetsContainer = cm.get('widgetsContainer');
        var resetter = cm.get('resetter');
        var config = cm.get('config');
        var map = cm.get('map')

        if (config.app.sidebarWidget && nsGmx.IconSidebarWidget) {
            var sidebarWidget = new nsGmx.IconSidebarWidget(config.app.sidebarWidget);
            sidebarWidget.appendTo(widgetsContainer);
            sidebarWidget.on('opening', function() {
                if (nsGmx.Utils.isPhone() && map) {
                    L.DomUtil.addClass(widgetsContainer, 'gmxApplication-widgetsContainer_mobileSidebarOpened');
                    L.DomUtil.addClass(map.getContainer(), 'gmxApplication-mapContainer_hidden');
                }
                resetter.reset();
            });
            sidebarWidget.on('closing', function() {
                if (nsGmx.Utils.isPhone() && map) {
                    L.DomUtil.removeClass(widgetsContainer, 'gmxApplication-widgetsContainer_mobileSidebarOpened');
                    L.DomUtil.removeClass(map.getContainer(), 'gmxApplication-mapContainer_hidden');
                }
                resetter.reset();
            });
            sidebarWidget.on('stick', function(e) {
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
                        L.DomUtil.addClass(sidebarWidget.getContainer(), 'gmxApplication-noShadow');
                        ctrl && L.DomUtil.addClass(ctrl.getContainer(), 'leaflet-control-gmx-hidden');
                        centerbsControlCorner.fadeIn();
                    } else {
                        L.DomUtil.removeClass(sidebarWidget.getContainer(), 'gmxApplication-noShadow');
                        ctrl && L.DomUtil.removeClass(ctrl.getContainer(), 'leaflet-control-gmx-hidden');
                        centerbsControlCorner.fadeOut();
                    }
                    resetter.reset();
                });
            });
            return sidebarWidget;
        } else {
            return null;
        }
    });

    cm.define('layersTreeWidget', ['sidebarWidget', 'layersTree', 'config'], function(cm) {
        var sidebarWidget = cm.get('sidebarWidget');
        var layersTree = cm.get('layersTree');
        var config = cm.get('config');

        if (!(nsGmx.LayersTreeWidget && layersTree && sidebarWidget)) {
            return false;
        }

        if (!config.app.layersTreeWidget) {
            return null;
        }

        var container = sidebarWidget.addTab('sidebarTab-layersTree', 'icon-layers');

        var layersTreeWidget = new nsGmx.LayersTreeWidget(L.extend({
            isMobile: nsGmx.Utils.isMobile()
        }, config.app.layersTreeWidget, {
            layersTree: layersTree
        }));

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
                collection: new Backbone.Collection(JSON.parse(rawTree.properties.UserData).tabs)
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

    cm.define('storytellingWidget', ['widgetsContainer', 'permalinkManager', 'calendar', 'rawTree', 'config', 'map'], function(cm) {
        var widgetsContainer = cm.get('widgetsContainer');
        var permalinkManager = cm.get('permalinkManager');
        var calendar = cm.get('calendar');
        var rawTree = cm.get('rawTree');
        var config = cm.get('config');
        var map = cm.get('map');

        if (config.app.storytellingWidget) {
            var storytellingWidget = new nsGmx.StorytellingWidget({
                bookmarks: JSON.parse(rawTree.properties.UserData).tabs
            });

            storytellingWidget.appendTo(widgetsContainer);

            storytellingWidget.on('storyChanged', function(story) {
                permalinkManager && permalinkManager.loadFromData(story.state)
            });

            return storytellingWidget;
        } else {
            return null;
        }
    });

    cm.define('calendarContainer', ['widgetsContainerControl', 'hideControl', 'sidebarWidget', 'config'], function(cm) {
        var config = cm.get('config');
        var sidebarWidget = cm.get('sidebarWidget');
        var widgetsContainerControl = cm.get('widgetsContainerControl');

        if (!config.app.calendarWidget) {
            return null;
        }

        if (!(window.$ && window.nsGmx.GmxWidget && window.nsGmx.Utils)) {
            return false;
        }

        var CalendarContainer = nsGmx.GmxWidget.extend({
            className: 'calendarContainer',
            initialize: function() {
                this._terminateMouseEvents();
                var $calendarContainerCenterTable = $('<div>').addClass('calendarContainer-centerTable').appendTo(this.$el);
                this._calendarContainerCenterTableCell = $('<div>').addClass('calendarContainer-centerTableCell').appendTo($calendarContainerCenterTable);
                if (nsGmx.Utils.isMobile()) {
                    this.$el.addClass('calendarContainer_mobile');
                } else {
                    this.$el.addClass('calendarContainer_desktop');
                }
            },
            getCalendarPlaceholder: function() {
                return this._calendarContainerCenterTableCell;
            }
        });

        var calendarContainer = new CalendarContainer();

        $(widgetsContainerControl.getContainer()).append(calendarContainer.getContainer());
        $(widgetsContainerControl.getContainer()).addClass('gmxApplication-widgetsContainer_withCalendar');

        var hideControl = cm.get('hideControl');

        hideControl && hideControl.on('statechange', function(ev) {
            ev.target.options.isActive ? calendarContainer.show() : calendarContainer.hide();
        });

        sidebarWidget && sidebarWidget.on('stick', function(e) {
            if (e.isStuck) {
                $(calendarContainer.getContainer()).addClass('gmxApplication-noShadow');
            } else {
                $(calendarContainer.getContainer()).removeClass('gmxApplication-noShadow');
            }
        });

        return calendarContainer;
    });

    cm.define('calendarWidget', ['calendar', 'calendarContainer', 'config'], function(cm) {
        var config = cm.get('config');
        var calendar = cm.get('calendar');
        var calendarContainer = cm.get('calendarContainer');

        if (!calendar || !calendarContainer || !config.app.calendarWidget) {
            return null;
        }

        var calendarClass = config.app.calendarWidget.type === 'fire' ?
            nsGmx.FireCalendarWidget :
            nsGmx.CalendarWidget;

        var calendarWidget = new calendarClass(L.extend({
            dateInterval: calendar,
            container: calendarContainer.getCalendarPlaceholder()[0],
            dateFormat: 'dd-mm-yy',
            dateMax: new Date()
        }, config.app.calendarWidget));

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
            includes: [nsGmx.GmxWidgetMixin],
            initialize: function(options) {
                L.setOptions(this, options);
                this._container = L.DomUtil.create('div', 'infoControl');
                this._terminateMouseEvents();
                this.render(null);
                this.hide();
            },
            render: function(html) {
                this._container.innerHTML = html;
                return this;
            },
            onAdd: function(map) {
                return this._container;
            }
        });

        var infoControl = new InfoControl({
            position: 'center'
        });

        map.addControl(infoControl);

        _.mapObject(layersHash, function(layer, layerId) {
            unbindPopup(layer);
            layer.on('click', function(ev) {
                var style = layer.getStyle(ev.gmx.layer.getStylesByProperties([ev.gmx.id])[0]);
                var balloonHtml = L.gmxUtil.parseBalloonTemplate(style.Balloon, {
                    properties: ev.gmx.properties,
                    tileAttributeTypes: layer._gmx.tileAttributeTypes
                });
                infoControl.render(balloonHtml);
                infoControl.show();
                mapActiveArea.setActiveArea({
                    bottom: infoControl.getContainer().scrollHeight + 'px'
                });
                map.setView(ev.latlng);
            });
        });

        resetter.on('reset', function() {
            infoControl.hide();
            mapActiveArea.resetActiveArea();
        });

        return null;

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

    return cm;
};