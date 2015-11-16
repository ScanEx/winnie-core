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
                    calendarWidget: false
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

    cm.define('urlManager', [], function(cm) {
        var parser = document.createElement('a');
        parser.href = window.location.href;

        var getQueryVariable = function(variable) {
            var query = parser.search.substring(1);
            var vars = query.split('&');
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split('=');
                if (decodeURIComponent(pair[0]) == variable) {
                    return decodeURIComponent(pair[1]);
                }
            }
        };

        return {
            getParam: getQueryVariable
        };
    });

    cm.define('i18n', ['config'], function(cm) {
        var config = cm.get('config');
        var urlManager = cm.get('urlManager');
        var urlLangParam = urlManager.getParam('lang') && (
            urlManager.getParam('lang') === 'eng' ||
            urlManager.getParam('lang') === 'rus'
        );
        var lang = urlLangParam || config.state.language || (nsGmx.Translations && nsGmx.Translations.getLanguage());
        if (lang) {
            L.gmxLocale && L.gmxLocale.setLanguage(lang);
            nsGmx.Translations && nsGmx.Translations.setLanguage(lang);
        }
        return null;
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

    cm.define('permalinkManager', ['mapsResourceServer', 'urlManager'], function(cm, cb) {
        var urlManager = cm.get('urlManager');
        var mapsResourceServer = cm.get('mapsResourceServer');
        if (nsGmx.PermalinkManager && mapsResourceServer) {
            var permalinkManager = new nsGmx.PermalinkManager({
                provider: mapsResourceServer
            });
            var permalinkId = urlManager.getParam('permalink');
            if (permalinkId) {
                permalinkManager.loadFromId(permalinkId).then(function() {
                    cb(permalinkManager);
                }, function() {
                    console.warn('failed to load permalink ' + permalinkId);
                    cb(permalinkManager);
                });
            } else {
                return permalinkManager;
            }
        } else if (nsGmx.StateManager) {
            return new nsGmx.StateManager();
        } else {
            return null;
        }
    });

    cm.define('map', ['config', 'permalinkManager'], function(cm, cb) {
        var config = cm.get('config')
        var opts = config.app.map;

        if (config.app.zoomControl === 'leaflet') {
            opts.zoomControl = true;
        }

        if (config.app.copyrightControl === 'leaflet') {
            opts.attributionControl = true;
        }

        return L.map(container[0] || container, opts);
    });

    cm.define('centerbsControlCorner', ['map'], function(cm) {
        var map = cm.get('map');
        var el = L.DomUtil.create('div', 'leaflet-top leaflet-bottom leaflet-left leaflet-right gmx-bottom-shift gmxApplication-centerbsControlCorner', map._controlContainer);
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
            console.error('no base baseLayersManager found');
            return false;
        }
        map.gmxBaseLayersManager.initDefaults().then(function() {
            map.gmxBaseLayersManager.setActiveIDs(baseLayers).setCurrentID(baseLayers[0]);
            permalinkManager && permalinkManager.setIdentity('baseLayersManager', map.gmxBaseLayersManager);
            cb(map.gmxBaseLayersManager);
        });
    });

    cm.define('baseLayersControl', ['map', 'baseLayersManager', 'i18n'], function(cm, cb) {
        var map = cm.get('map');
        var config = cm.get('config');
        var baseLayersManager = cm.get('baseLayersManager');
        if (config.app.baseLayersControl && L.Control.GmxIconLayers) {
            var ctrl = new L.Control.GmxIconLayers(baseLayersManager, L.extend(config.app.baseLayersControl, {
                language: nsGmx.Translations.getLanguage()
            }));
            map.addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('logoControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.copyrightControl;
        var ctrl = L.control.gmxLogo(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    });

    cm.define('hideControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').app.hideControl;
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

    cm.define('calendar', ['permalinkManager'], function(cm) {
        var permalinkManager = cm.get('permalinkManager');
        if (Backbone) {
            var cal = new(Backbone.Model.extend({
                initialize: function() {
                    this.on('change:dateBegin', function() {
                        this.trigger('datechange', this.get('dateBegin'), this.get('dateEnd'));
                    }.bind(this));
                    this.on('change:dateEnd', function() {
                        this.trigger('datechange', this.get('dateBegin'), this.get('dateEnd'));
                    }.bind(this));
                },
                setDateBegin: function(dateBegin) {
                    this.set({
                        dateBegin: new Date(dateBegin)
                    });
                },
                setDateEnd: function(dateEnd) {
                    this.set({
                        dateEnd: new Date(dateEnd)
                    });
                },
                getDateBegin: function() {
                    return this.get('dateBegin');
                },
                getDateEnd: function() {
                    return this.get('dateEnd');
                },
                loadState: function(state) {
                    this.setDateBegin(state.dateBegin);
                    this.setDateEnd(state.dateEnd);
                },
                saveState: function() {
                    return {
                        dateBegin: this.getDateBegin(),
                        dateEnd: this.getDateEnd()
                    }
                }
            }))();

            var now = new Date();

            cal.setDateBegin(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
            cal.setDateEnd(new Date());

            permalinkManager && permalinkManager.setIdentity('calendar', cal);

            return cal;
        } else {
            return false;
        }
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

    // компонент, управляющий отображением слоёв на карте
    // В нормальном порядке просто отображает видимые слои из layersTree,
    // однако позволяет запретить отображать какой-либо слой, тем самым
    // передавая управляение его видимостью
    cm.define('layersMapper', ['config', 'map', 'layersHash', 'layersTree'], function(cm) {
        var map = cm.get('map');
        var layersHash = cm.get('layersHash');
        var layersTree = cm.get('layersTree');
        var config = cm.get('config');

        if (config.app.layersMapper) {
            if (!map || !layersHash || !layersTree) {
                return false;
            }

            var blacklist = [];

            layersTree.on('childChange', function(model) {
                if (model.changedAttributes().hasOwnProperty('visible')) {
                    var id = model.get('properties').LayerID || model.get('properties').GroupID;
                    if (model.changedAttributes().visible) {
                        layersHash[id] && (blacklist.indexOf(id) === -1) && map.addLayer(layersHash[id]);
                    } else {
                        layersHash[id] && (blacklist.indexOf(id) === -1) && map.removeLayer(layersHash[id]);
                    }
                }
            });

            layersTree.eachNode(function(model) {
                if (model.get('visible')) {
                    var id = model.get('properties').LayerID;
                    layersHash[id] && map.addLayer(layersHash[id]);
                }
            }, true);

            var allowLayer = function(id) {
                (blacklist.indexOf(id) !== -1) && blacklist.splice(blacklist.indexOf(id), 1);
            };

            var denyLayer = function(id) {
                (blacklist.indexOf(id) === -1) && layersHash[id] && blacklist.push(id);
            };

            var addLayer = function(id) {
                allowLayer(id);
                layersHash[id] && map.addLayer(layersHash[id]);
            };

            var removeLayer = function(id) {
                denyLayer(id);
                layersHash[id] && map.removeLayer(layersHash[id]);
            };

            return {
                allowLayer: allowLayer,
                denyLayer: denyLayer,
                addLayer: addLayer,
                removeLayer: removeLayer
            }
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


    cm.define('layersTranslations', ['config', 'layersTree'], function(cm) {
        var config = cm.get('config');
        var layersTree = cm.get('layersTree');
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
                    var lang = nsGmx.Translations.getLanguage();
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

        var mapDate = function(dateBegin, dateEnd) {
            for (layer in layersHash) {
                if (layersHash.hasOwnProperty(layer)) {
                    layersHash[layer].setDateInterval(dateBegin, dateEnd);
                }
            }
        };

        calendar.on('datechange', mapDate);
        mapDate(calendar.getDateBegin(), calendar.getDateEnd());

        return null;
    });

    cm.define('sidebarWidget', ['config', 'widgetsContainer', 'centerbsControlCorner', 'map'], function(cm) {
        var map = cm.get('map')
        var config = cm.get('config');
        var widgetsContainer = cm.get('widgetsContainer');
        var centerbsControlCorner = cm.get('centerbsControlCorner');
        if (config.app.sidebarWidget && nsGmx.IconSidebarWidget) {
            var sidebarWidget = new nsGmx.IconSidebarWidget(config.app.sidebarWidget);
            sidebarWidget.appendTo(widgetsContainer);
            sidebarWidget.on('opening', function() {
                if (nsGmx.Utils.isPhone() && map) {
                    L.DomUtil.addClass(widgetsContainer, 'gmxApplication-widgetsContainer_mobileSidebarOpened');
                    L.DomUtil.addClass(map.getContainer(), 'gmxApplication-mapContainer_hidden');
                }
            });
            sidebarWidget.on('closing', function() {
                if (nsGmx.Utils.isPhone() && map) {
                    L.DomUtil.removeClass(widgetsContainer, 'gmxApplication-widgetsContainer_mobileSidebarOpened');
                    L.DomUtil.removeClass(map.getContainer(), 'gmxApplication-mapContainer_hidden');
                }
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
                });
            });
            return sidebarWidget;
        } else {
            return null;
        }
    });

    cm.define('layersTreeWidget', ['config', 'layersTree', 'sidebarWidget'], function(cm) {
        var config = cm.get('config');
        var sidebar = cm.get('sidebarWidget');
        var layersTree = cm.get('layersTree');
        if (config.app.layersTreeWidget && nsGmx.LayersTreeWidget && layersTree && sidebar) {
            var container = sidebar.addTab('sidebarTab-layersTree', 'icon-layers');

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
                sidebar.on('content', repaint);
                sidebar.on('opened', repaint);
                sidebar.on('stick', repaint);

                scrollView.appendTo(container);
            } else {
                layersTreeWidget.appendTo(container);
            }

            return layersTreeWidget;
        } else {
            return null;
        }
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

    cm.define('storytellingWidget', ['map', 'config', 'rawTree', 'calendar', 'widgetsContainer'], function(cm) {
        var config = cm.get('config');
        var widgetsContainer = cm.get('widgetsContainer');
        var rawTree = cm.get('rawTree');
        var map = cm.get('map');
        var calendar = cm.get('calendar');
        if (config.app.storytellingWidget) {
            var storytellingWidget = new nsGmx.StorytellingWidget({
                bookmarks: JSON.parse(rawTree.properties.UserData).tabs
            });

            storytellingWidget.appendTo(widgetsContainer);

            storytellingWidget.on('storyChanged', function(story) {
                map.panTo(L.Projection.Mercator.unproject(new L.Point(
                    story.state.position.x,
                    story.state.position.y
                )));

                calendar.setDateBegin(new Date(story.state.customParamsCollection.commonCalendar.dateBegin));
                calendar.setDateEnd(new Date(story.state.customParamsCollection.commonCalendar.dateEnd));
            });

            return storytellingWidget;
        } else {
            return null;
        }
    });

    cm.define('stateLoader', ['config', 'permalinkManager', 'mapSerializer', 'layersTree', 'baseLayersManager', 'calendar'], function(cm) {
        var config = cm.get('config');
        var permalinkManager = cm.get('permalinkManager');
        config.state && permalinkManager && permalinkManager.loadFromData({
            version: '3.0.0',
            components: config.state
        });
        return null;
    });

    cm.define('calendarContainer', ['widgetsContainerControl', 'hideControl', 'sidebarWidget', 'config'], function(cm) {
        var config = cm.get('config');
        var sidebarWidget = cm.get('sidebarWidget');
        var widgetsContainerControl = cm.get('widgetsContainerControl');

        if (!config.app.calendarWidget) {
            return null;
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

        var calendarWidget = new nsGmx.CalendarWidget('demoCalendar', L.extend({
            container: calendarContainer.getCalendarPlaceholder()[0],
            dateFormat: 'dd-mm-yy',
            minimized: true,
            showSwitcher: true,
            showTime: false,
            dateMax: new Date()
        }, config.app.calendarWidget));

        $(calendarWidget).on('datechange', function(je) {
            var dateBegin = calendarWidget.getDateBegin();
            var dateEnd = calendarWidget.getDateEnd();
            if (dateEnd.getTime() - dateBegin.getTime() < 12 * 60 * 60 * 1000) {
                dateEnd = new Date(dateBegin.getTime() + 24 * 60 * 60 * 1000);
            }
            calendar.setDateBegin(dateBegin);
            calendar.setDateEnd(dateEnd);
        });

        calendar.on('datechange', function(dateBegin, dateEnd) {
            calendarWidget.setDateBegin(dateBegin);
            calendarWidget.setDateEnd(dateEnd);
        });

        return calendarWidget;
    });

    return cm;
};