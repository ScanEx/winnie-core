var nsGmx = nsGmx || {};

nsGmx.createGmxApplication = function(container, applicationConfig) {
    var ComponentsManager = window.cm.ComponentsManager;
    var cm = new ComponentsManager();

    function clone(o) {
        var c = {};
        for (k in o) {
            if (o.hasOwnProperty(k)) {
                c[k] = o[k];
            }
        }
        return c;
    }

    function extend(a, b) {
        for (p in b) {
            if (b.hasOwnProperty(p)) {
                a[p] = b[p];
            }
        }
        return a;
    }

    var isMobile = (nsGmx && nsGmx.Utils && nsGmx.Utils.isMobile) || function() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            return true;
        } else {
            return false;
        }
    }

    var isPhone = (nsGmx && nsGmx.Utils && nsGmx.Utils.isPhone) || function() {
        return isMobile() && (screen.width <= 768);
    }

    // returns config object
    cm.define('config', [], function(cm, cb) {
        var setDefaults = function(config) {
            config.map = config.map || {};
            config.map.zoom = config.map.zoom || 3;
            config.map.center = config.map.center || [53, 82];
            config.map.zoomControl = config.map.zoomControl || false;
            config.map.attributionControl = config.map.attributionControl || false;

            config.gmxMap = config.gmxMap || {};
            config.gmxMap.setZIndex = (typeof config.gmxMap.setZIndex === 'boolean') ? config.gmxMap.setZIndex : true;

            config.hideControl = (config.hideControl || (typeof config.hideControl === 'boolean')) ? config.hideControl : {};
            config.zoomControl = (config.zoomControl || (typeof config.zoomControl === 'boolean')) ? config.zoomControl : {};
            config.centerControl = (config.centerControl || (typeof config.centerControl === 'boolean')) ? config.centerControl : {
                color: 'black'
            };
            config.bottomControl = (config.bottomControl || (typeof config.bottomControl === 'boolean')) ? config.bottomControl : {};
            config.locationControl = (config.locationControl || (typeof config.locationControl === 'boolean')) ? config.locationControl : {};
            config.copyrightControl = (config.copyrightControl || (typeof config.copyrightControl === 'boolean')) ? config.copyrightControl : {};

            config.baseLayersControl = (config.baseLayersControl || (typeof config.baseLayersControl === 'boolean')) ? config.baseLayersControl : {};

            config.language = (config.language === 'eng') ? 'eng' : 'rus';

            config.layersMapper = (config.layersMapper || typeof config.layersMapper === 'boolean') ? config.layersMapper : true;

            config.storytellingWidget = config.storytellingWidget || false;
            config.sidebarWidget = config.sidebarWidget || !!config.layersTreeWidget || false;

            return config;
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
        L.gmxLocale.setLanguage(config.language);
        return null;
    });

    cm.define('permalinkManager', [], function() {
        if (nsGmx.PermalinkManager) {
            return new nsGmx.PermalinkManager();
        } else {
            return null;
        }
    });

    cm.define('map', ['config'], function(cm, cb) {
        var config = cm.get('config')
        var opts = clone(config.map);
        
        if (config.zoomControl === 'leaflet') {
            opts.zoomControl = true;
        }
        
        if (config.copyrightControl === 'leaflet') {
            opts.attributionControl = true;
        }

        L.Map.addInitHook(function() {
            this._controlCorners['centerbs'] = L.DomUtil.create('div', 'leaflet-top leaflet-bottom leaflet-left leaflet-right gmx-bottom-shift', this._controlContainer);
        });

        return L.map(container[0] || container, opts);
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

    cm.define('widgetsContainer', ['map'], function(cm) {
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
        return widgetsContainer.getContainer();
    });

    cm.define('gmxMap', ['map', 'config'], function(cm, cb) {
        var config = cm.get('config');
        L.gmx.loadMap(config.gmxMap.mapID, config.gmxMap).then(function(layers) {
            cb({
                getRawTree: function() {
                    return layers.rawTree;
                },
                getLayersHash: function() {
                    return layers.layersByID;
                }
            });
        });
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
            permalinkManager.setIdentity('baseLayersManager', map.gmxBaseLayersManager);
            cb(map.gmxBaseLayersManager);
        });
    });

    cm.define('baseLayersControl', ['map', 'baseLayersManager', 'i18n'], function(cm, cb) {
        var map = cm.get('map');
        var config = cm.get('config');
        var baseLayersManager = cm.get('baseLayersManager');
        if (config.baseLayersControl) {
            var ctrl = new L.Control.GmxIconLayers(baseLayersManager, extend(config.baseLayersControl, {
                language: config.language
            }));
            map.addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });

    cm.define('logoControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').copyrightControl;
        var ctrl = L.control.gmxLogo(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    });

    cm.define('hideControl', ['map', 'config', 'i18n'], function(cm) {
        var opts = cm.get('config').hideControl;
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
        var opts = cm.get('config').zoomControl;
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
        var opts = cm.get('config').centerControl;
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
        var opts = cm.get('config').bottomControl;
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
        var opts = cm.get('config').locationControl;
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
        var opts = cm.get('config').copyrightControl;
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

    cm.define('calendar', [], function(cm) {
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
                }
            }))();

            var now = new Date()

            cal.setDateBegin(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
            cal.setDateEnd(new Date());

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

        if (config.layersMapper) {
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

    cm.define('sidebarWidget', ['config', 'widgetsContainer'], function(cm) {
        var config = cm.get('config');
        var widgetsContainer = cm.get('widgetsContainer');
        if (config.sidebarWidget && nsGmx.IconSidebarWidget) {
            var sidebarWidget = new nsGmx.IconSidebarWidget(config.sidebarWidget);
            sidebarWidget.appendTo(widgetsContainer);
            sidebarWidget.on('opening', function() {
                var map = cm.get('map')
                if (isPhone() && map) {
                    L.DomUtil.addClass(widgetsContainer, 'gmxApplication-widgetsContainer_mobileSidebarOpened');
                    L.DomUtil.addClass(map.getContainer(), 'gmxApplication-mapContainer_hidden');
                }
            });
            sidebarWidget.on('closing', function() {
                var map = cm.get('map')
                if (isPhone() && map) {
                    L.DomUtil.removeClass(widgetsContainer, 'gmxApplication-widgetsContainer_mobileSidebarOpened');
                    L.DomUtil.removeClass(map.getContainer(), 'gmxApplication-mapContainer_hidden');
                }
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
        if (config.layersTreeWidget && nsGmx.LayersTreeWidget && layersTree && sidebar) {
            var container = sidebar.addTab('sidebarTab-layersTree', 'icon-layers');

            var layersTreeWidget = new nsGmx.LayersTreeWidget(L.extend(config.layersTreeWidget, {
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
            return;
        }

        if (config.bookmarksWidget && nsGmx.BookmarksWidget && rawTree && sidebar) {
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
        if (config.storytellingWidget) {
            var storytellingWidget = new nsGmx.StorytellingWidget({
                bookmarks: JSON.parse(gmxMap.getRawTree().properties.UserData).tabs
            });

            storytellingWidget.appendTo(widgetsContainer.getWidgetsContainer());

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

    return cm;
};