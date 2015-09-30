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
                    sidebarWidget: false
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

    cm.define('i18n', ['config'], function(cm) {
        var config = cm.get('config');
        if (!L.gmxLocale || !L.gmxLocale.setLanguage) {
            return false;
        }
        var lang = config.state.language || (nsGmx.Translations && nsGmx.Translations.getLanguage());
        if (lang) {
            L.gmxLocale.setLanguage(lang);
            nsGmx.Translations && nsGmx.Translations.setLanguage(lang);
        }
        return null;
    });

    cm.define('permalinkManager', [], function() {
        if (nsGmx.PermalinkManager) {
            return new nsGmx.PermalinkManager();
        } else if (nsGmx.StateManager) {
            return new nsGmx.StateManager();
        } else {
            return null;
        }
    });

    cm.define('map', ['config'], function(cm, cb) {
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

    cm.define('mapSerializer', ['map', 'permalinkManager'], function() {
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

    cm.define('gmxMapErrorHandler', ['gmxMap'], function(cm) {
        var gmxMap = cm.get('gmxMap');
        if (gmxMap.error) {
            console.error(gmxMap.error);
        }
        return null;
    });

    cm.define('baseLayersManager', ['map', 'gmxMap', 'config', 'permalinkManager'], function(cm, cb) {
        var map = cm.get('map');
        var gmxMap = cm.get('gmxMap');
        var config = cm.get('config');
        var permalinkManager = cm.get('permalinkManager');

        var baseLayers = gmxMap.getRawTree().properties.BaseLayers.trim().slice(1, -1).split(',').map(function(e) {
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
            var ctrl = new L.Control.GmxIconLayers(baseLayersManager, L.extend({}, config.app.baseLayersControl, {
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
                        dateBegin: dateBegin
                    });
                },
                setDateEnd: function(dateEnd) {
                    this.set({
                        dateEnd: dateEnd
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

    cm.define('layersTree', ['gmxMap', 'permalinkManager'], function(cm) {
        var permalinkManager = cm.get('permalinkManager');
        if (nsGmx && nsGmx.LayersTreeNode) {
            var rawTree = cm.get('gmxMap').getRawTree();
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
    cm.define('layersMapper', ['config', 'map', 'gmxMap', 'layersTree'], function(cm) {
        var map = cm.get('map');
        var layersHash = cm.get('gmxMap').getLayersHash();
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

    cm.define('dateMapper', ['gmxMap', 'calendar'], function(cm) {
        var layersHash = cm.get('gmxMap').getLayersHash();
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

    cm.define('bookmarksWidget', ['map', 'gmxMap', 'sidebarWidget', 'permalinkManager'], function() {
        var config = cm.get('config');
        var sidebar = cm.get('sidebarWidget');
        var rawTree = cm.get('gmxMap').getRawTree();
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

    cm.define('storytellingWidget', ['map', 'config', 'gmxMap', 'calendar', 'widgetsContainer'], function(cm) {
        var config = cm.get('config');
        var widgetsContainer = cm.get('widgetsContainer');
        var gmxMap = cm.get('gmxMap');
        var map = cm.get('map');
        var calendar = cm.get('calendar');
        if (config.app.storytellingWidget) {
            var storytellingWidget = new nsGmx.StorytellingWidget({
                bookmarks: JSON.parse(gmxMap.getRawTree().properties.UserData).tabs
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

    return cm;
};
