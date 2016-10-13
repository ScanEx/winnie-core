;(function() {
"use strict";

var nsGmx = nsGmx || {};

nsGmx.PagingViewMixin = {
    _getEl: function() {
        return this.el || this._container;
    },

    _emit: function(ev, params) {
        if (this.fire) {
            this.fire(ev, params || {});
        } else if (this.trigger) {
            this.trigger(ev, params || {});
        }
    },

    _updateViewClass: function(id) {
        var el = this._getEl();
        var className = this.className || (this.options && this.options.className);
        if (!className) {
            return;
        }
        if (this._currentViewId) {
            L.DomUtil.removeClass(el, className + '_page-' + this._currentViewId);
        }
        this._currentViewId = id;
        if (this._currentViewId) {
            L.DomUtil.addClass(el, className + '_page-' + this._currentViewId);
        }
    },

    addView: function(id, view) {
        if (!this._views) {
            this._views = {};
        };
        this._views[id] = view;
        this._emit('addview');
    },

    showView: function(id) {
        var el = this._getEl();
        this._updateViewClass(id);
        el.innerHTML = '';
        el.appendChild(this._views[id].el);
        this._emit('showview', {
            id: id
        })
    },

    hideView: function() {
        var el = this._getEl();
        this._updateViewClass(null);
        el.innerHTML = '';
        this._emit('hideview');
    }
};

nsGmx.PagingView = Backbone.View.extend(nsGmx.PagingViewMixin);

var nsGmx = nsGmx || {};

nsGmx.FullscreenControlMixin = {
    onAdd: function(map) {
        var className = this.options.className;
        this.options = this.options || {};
        this.options.position = className.toLowerCase();

        this._controlCornerEl = L.DomUtil.create('div', 'leaflet-top leaflet-bottom leaflet-left leaflet-right ' + className +
            '-controlCorner', map._controlContainer);
        this._terminateMouseEvents(this._controlCornerEl);
        map._controlCorners[this.options.position] = this._controlCornerEl;

        this._container = L.DomUtil.create('div', className);
        return this._container;
    },

    _terminateMouseEvents: function(el) {
        L.DomEvent.disableClickPropagation(el);
        el.addEventListener('mousewheel', L.DomEvent.stopPropagation);
    }
}

var nsGmx = nsGmx || {};

nsGmx.FullscreenPagingPaneControl = L.Control.extend({
    includes: [nsGmx.PagingViewMixin, nsGmx.FullscreenControlMixin, L.Mixin.Events],

    options: {
        className: 'fullscreenPagingPaneControl'
    },

    initialize: function (options) {
        L.Control.prototype.initialize.apply(this, arguments);
        var currentViewId = null;
        this.on('showview', function (e) {
            currentViewId = e.id;
            this._container && L.DomUtil.addClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
            this._controlCornerEl && L.DomUtil.addClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_fullscreen');
            this._controlCornerEl && currentViewId && L.DomUtil.addClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_page-' + currentViewId);
        }.bind(this));
        this.on('hideview', function (e) {
            this._container && L.DomUtil.removeClass(this._container, 'fullscreenPagingPaneControl_fullscreen');
            this._controlCornerEl && L.DomUtil.removeClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_fullscreen');
            this._controlCornerEl && currentViewId && L.DomUtil.removeClass(this._controlCornerEl, 'fullscreenPagingPaneControl-controlCorner_page-' + currentViewId);
        }.bind(this));
    }
});

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

var nsGmx = nsGmx || {};

// Creating gmx layers tree from config:
// 1. Preload Vector gmx layers
// 2. Create tree using loaded layers properties
// 3. Create layers hash (use loaded vector layers or create new virtual layers)

+ function(mapConfig, lang) {
    // everything except of this will be in MetaProperties
    var reservedPropsNames = ['id', 'type', 'list', 'title', 'description', 'expanded', 'visible', 'children'];

    function parse(mapConfig, lang) {
        return preloadGmxLayers(mapConfig).then(function (gmxLayers) {
            var rawTree = createRawTree(gmxLayers, mapConfig, lang);
            var layersHash = {};
            walkRawTree(rawTree, function (props) {
                if (props.children) {
                    return;
                }

                if (layersHash[props.name]) {
                    throw new Error('duplicate layer ' + props.name);
                }

                layersHash[props.name] = gmxLayers[props.name] || L.gmx.createLayer({
                    properties: props
                });
            });

            return {
                rawTree: rawTree,
                layersHash: layersHash
            }
        });
    }

    function createRawTree(gmxLayers, mapConfig, lang) {
        mapConfig.name = 'root';
        mapConfig.BaseLayers = '[]';

        return rCreateRawTree(mapConfig).content;

        function rCreateRawTree(l) {
            if (!l) {
                return;
            }

            var props = createLayerProperties(l, lang);
            var gmxProps = l.gmxId && gmxLayers[l.gmxId.split(':')[1]]._gmx.properties;

            return {
                type: l.children ? 'group' : 'layer',
                content: {
                    properties: gmxProps ? $.extend(true, props, gmxProps, {
                        type: 'Vector',
                        visible: props.visible
                    }) : props,
                    children: l.children && l.children.map(function(c) {
                        return rCreateRawTree(c);
                    }),
                    geometry: null
                }
            }
        }
    }

    function walkRawTree(rawTree, visitor) {
        if (!rawTree.content) {
            // root node
            rawTree = {
                type: 'group',
                content: rawTree
            };
        }

        visitor.call(null, rawTree.content.properties);

        (rawTree.content.children || []).map(function(child) {
            walkRawTree(child, visitor);
        });
    }

    function createLayerProperties(l, lang) {
        var props = {};

        Object.keys(l).map(function(propName) {
            if (reservedPropsNames.indexOf(propName) + 1) {
                props[propName] = l[propName];
            }
        })

        props.title = props.title ? (typeof props.title === 'object' ? props.title[lang] : props.title) : props.id;
        props.description = typeof props.description === 'object' ? props.description[lang] : props.description;

        if (l.children) {
            var id = l.id || l.name || l.gmxId || 'group' + _.uniqueId();
            props.GroupID = id;
            props.name = id;
        } else {
            var id = l.id || l.name || l.gmxId || 'layer' + _.uniqueId();
            props.LayerID = id;
            props.name = id;
        }

        props.MetaProperties = createMeta(l);

        return props;
    }

    function createMeta(l) {
        var metaProps = {};

        Object.keys(l).map(function(propName) {
            if (reservedPropsNames.indexOf(propName) + 1) {
                return;
            } else {
                metaProps[propName] = {
                    'Type': capitalize(typeof l[propName]),
                    'Value': l[propName]
                };
            }
        });

        return metaProps;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // in order to create virtual layer with Vector type
    // we need to get layer properties first
    function preloadGmxLayers(mapConfig) {
        var ids = [];

        function rWalk(node) {
            if (node.type === 'gmxVector' && node.gmxId) {
                ids.push(node.gmxId);
            }

            node.children && node.children.map(function(child) {
                rWalk(child);
            });
        }

        rWalk(mapConfig);

        return Promise.all(ids.map(function(id) {
            return L.gmx.loadLayer(id.split(':')[0], id.split(':')[1]);
        })).then(function(arResolved) {
            var h = {};
            ids.map(function(id, i) {
                h[id.split(':')[1]] = arResolved[i];
            });
            return h;
        });
    }

    nsGmx.gmxTreeParser = {
        parse: parse,
        createLayerProperties: createLayerProperties,
        preloadGmxLayers: preloadGmxLayers
    };
}();

window.nsGmx = window.nsGmx || {}
var nsGmx = window.nsGmx

nsGmx.createGmxApplication = function(container, applicationConfig) {
    var ComponentsManager = window.cm.ComponentsManager;
    var cm = new ComponentsManager();

// returns config object
cm.define('config', [], function(cm, cb) {
    var configConditions = function(config) {
        if ((config.app.layersTreeWidget || config.app.bookmarksWidget) && !config.app.sidebarWidget) {
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
                globals: false,
                mobilePopups: nsGmx.Utils.isMobile()
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

cm.define('container', [], function(cm) {
    var containerEl = container[0] || container;
    L.DomUtil.addClass(containerEl, 'gmxApplication');
    if (nsGmx.Utils && nsGmx.Utils.isMobile && nsGmx.Utils.isMobile()) {
        L.DomUtil.addClass(containerEl, 'gmxApplication_mobile');
    } else {
        L.DomUtil.addClass(containerEl, 'gmxApplication_desktop');
    }
    if (window.device && window.device.platform) {
        L.DomUtil.addClass(containerEl, 'gmxApplication_platform-' + window.device.platform.toLowerCase());
    }
    return containerEl;
});

cm.define('logger', [], function(cm) {
    return new(Backbone.Collection.extend({
        log: function(msg) {
            this.add({
                message: msg
            });
        }
    }))
});

cm.define('datepickerFix', [], function(cm) {
    // HACK: leaflet controls overlap datepicker @ set z-index more than leaflet control's
    // (cannot change datepicker's container or override z-index)
    var fixed = false;
    $.datepicker.setDefaults({
        beforeShow: function(input, instance) {
            var dpDiv = instance.dpDiv;
            if (!fixed) {
                dpDiv.on('click', function (je) {
                    je.stopPropagation();
                });
                fixed = true;
            }
            setTimeout(function() {
                dpDiv.css('z-index', '1001');
            }, 10);
        }
    });
    return null;
});

cm.define('map', ['permalinkManager', 'container', 'resetter', 'config'], function(cm, cb) {
    var container = cm.get('container');
    var resetter = cm.get('resetter');
    var config = cm.get('config');
    var opts = config.app.map;

    var map = L.map(container[0] || container, L.extend(opts, {
        zoomControl: false,
        attributionControl: false
    }));

    map.on('click zoomstart', function(le) {
        resetter.reset();
    });

    resetter.on('reset', function() {
        map.closePopup();
    });

    return map;
});

cm.define('mapActiveArea', ['config', 'map'], function(cm) {
    var config = cm.get('config');
    var cfg = config.app && config.app.mapActiveArea;

    if (!cm.get('map').setActiveArea || cfg === false) {
        return false;
    }

    var laa = new(L.Class.extend({
        options: {
            initialConstraints: {
                top: 10,
                bottom: 10,
                left: 10,
                right: 10
            },

            showBorder: false
        },

        initialize: function(options) {
            this.options = L.setOptions(this, options);
            this._affects = {
                initialConstraints: this.options.initialConstraints
            }
            this._updateActiveArea();
        },

        addAffect: function(id, props) {
            this._affects[id] = props;
            this._updateActiveArea();
        },

        removeAffect: function(id) {
            delete this._affects[id];
            this._updateActiveArea();
        },

        _redrawMap: function () {
            // HACK: force redraw map to update objects that must be displayed or hidden
            this.options.map.fire('moveend')
        },

        _updateActiveArea: function() {
            var ao = Object.keys(this._affects).map(function(affectId) {
                return this._affects[affectId]
            }.bind(this)).reduce(function(prev, curr) {
                return sum(prev, curr)
            }, {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            })

            this.options.map.setActiveArea(L.extend({
                position: 'absolute',
                border: this.options.showBorder ? '1px solid red' : 'none'
            }, ao));

            this._redrawMap()

            function sum(a, b) {
                var o = {};
                ['top', 'left', 'bottom', 'right'].map(function(direction) {
                    a[direction] = a[direction] + '';
                    var da = (a[direction].match(/\d+/) && a[direction].match(/\d+/)[0]) || 0;
                    b[direction] = b[direction] + '';
                    var db = (b[direction].match(/\d+/) && b[direction].match(/\d+/)[0]) || 0;
                    o[direction] = (da / 1 + db / 1) + 'px';
                });
                return o;
            }
        }
    }))(L.extend(cfg || {}, {
        map: cm.get('map')
    }));

    return laa;
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

cm.define('gmxMap', ['map', 'i18n', 'config'], function(cm, cb) {
    var config = cm.get('config');
    var i18n = cm.get('i18n');

    if (!L.gmx || !L.gmx.loadMap) {
        return false;
    }

    if (config.app && config.app.gmxMap && config.app.gmxMap.mapID) {
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
            cb(createEmptyMap(err));
        });
    } else if (config.map) {
        try {
            nsGmx.gmxTreeParser.parse(config.map, i18n.getLanguage()).then(function(res) {
                cb({
                    getRawTree: function() {
                        return res.rawTree;
                    },
                    getLayersHash: function() {
                        return res.layersHash;
                    }
                });
            });
        } catch (e) {
            console.error(e);
            cb(createEmptyMap());
        }
    } else {
        cb(createEmptyMap());
    }

    function createEmptyMap(err) {
        return {
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
        }
    }
});

cm.define('rawTree', ['gmxMap'], function(cm) {
    return cm.get('gmxMap').getRawTree();
});

cm.define('layersHash', ['gmxMap'], function(cm) {
    return cm.get('gmxMap').getLayersHash();
});

cm.define('gmxMapErrorHandler', ['gmxMap', 'logger'], function(cm) {
    var logger = cm.get('logger');
    var gmxMap = cm.get('gmxMap');
    if (gmxMap.error) {
        logger.log(gmxMap.error);
        console.error(gmxMap.error);
    }
    return null;
});

cm.define('baseLayersManager', ['map', 'i18n', 'config', 'rawTree', 'permalinkManager'], function(cm, cb) {
    var permalinkManager = cm.get('permalinkManager');
    var rawTree = cm.get('rawTree');
    var config = cm.get('config');
    var i18n = cm.get('i18n');
    var map = cm.get('map');

    if (!map.gmxBaseLayersManager) {
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
        return false;
    }

    if (config.map && config.map.baseLayers) {
        var ids = config.map.baseLayers.map(function(baseLayer) {
            map.gmxBaseLayersManager.add(id, {
                layers: [L.gmx.createLayer({
                    properties: nsGmx.gmxTreeParser.createLayerProperties(baseLayer, i18n.getLanguage())
                })],
                eng: typeof baseLayer.title === 'object' ? baseLayer.title.eng : baseLayer.title,
                rus: typeof baseLayer.title === 'object' ? baseLayer.title.rus : baseLayer.title,
                icon: baseLayer.iconUrl
            });
            return id;
        }.bind(this));

        map.gmxBaseLayersManager.setActiveIDs(ids);
        map.gmxBaseLayersManager.setCurrentID(ids[ids.length - 1]);

        return map.gmxBaseLayersManager;
    } else {
        var baseLayers = JSON.parse(rawTree.properties.BaseLayers);
        map.gmxBaseLayersManager.initDefaults({
            apiKey: config.app.gmxMap.apiKey
        }).then(function() {
            if (baseLayers && baseLayers.length) {
                map.gmxBaseLayersManager.setActiveIDs(baseLayers).setCurrentID(baseLayers[0]);
            }
            permalinkManager && permalinkManager.setIdentity('baseLayersManager', map.gmxBaseLayersManager);
            cb(map.gmxBaseLayersManager);
        });
    }
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
            mapActiveArea.addAffect('mobilepopup', {
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
            mapActiveArea.removeAffect('mobilepopup');
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

// DateInterval model
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

// LayersTreeNode model
cm.define('layersTree', ['rawTree', 'permalinkManager'], function(cm) {
    var rawTree = cm.get('rawTree');
    var permalinkManager = cm.get('permalinkManager');
    if (nsGmx && nsGmx.LayersTreeNode) {
        var layersTree = new nsGmx.LayersTreeNode({
            content: rawTree
        });

        // fix layers tree if (if it was created manually)
        layersTree.eachNode(function (node) {
            node.setNodeVisibility(node.get('visible'));
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
                this._layersHash[id].removeFilter && this._layersHash[id].removeFilter();
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

cm.define('layersClusters', ['layersHash', 'layersMapper', 'resetter', 'config', 'map'], function(cm) {
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
                if (!layer.bindClusters) {
                    return;
                }

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

cm.define('dateMapper', ['layersHash', 'calendar'], function(cm) {
    var layersHash = cm.get('layersHash');
    var calendar = cm.get('calendar');

    calendar.on('change', mapDate);
    mapDate();

    return null;

    function mapDate() {
        for (var layer in layersHash) {
            if (layersHash.hasOwnProperty(layer)) {
                layersHash[layer].setDateInterval && layersHash[layer].setDateInterval(calendar.get('dateBegin'), calendar.get(
                    'dateEnd'));
            }
        }
    }
});

cm.define('baseLayersControl', ['baseLayersManager', 'config', 'i18n', 'map'], function(cm, cb) {
    var baseLayersManager = cm.get('baseLayersManager');
    var config = cm.get('config');
    var i18n = cm.get('i18n');
    var map = cm.get('map');

    if (config.app.baseLayersControl && L.Control.GmxIconLayers) {
        var ctrl = new L.Control.GmxIconLayers(baseLayersManager, L.extend({}, config.app.baseLayersControl, {
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
    var config = cm.get('config');
    var map = cm.get('map');

    if (!window.L.control.gmxZoom) {
        return false;
    }

    var opts = config.app.zoomControl;

    if (!opts) {
        return null;
    }

    var ctrl = createCtrl();
    map.addControl(ctrl);
    return ctrl;

    function createCtrl() {
        if ((opts && opts === 'leaflet') || (opts && opts.type === 'leaflet')) {
            return L.control.zoom((typeof opts === 'object') ? opts : {});
        } else {
            return L.control.gmxZoom((typeof opts === 'object') ? opts : {});
        }
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
    var config = cm.get('config');
    var map = cm.get('map');

    if (!window.L.control.gmxCopyright) {
        return false;
    }

    var opts = config.app.copyrightControl;

    if (!opts) {
        return null;
    }

    var ctrl = createCtrl();
    map.addControl(ctrl);
    return ctrl;

    function createCtrl() {
        if ((opts && opts === 'leaflet') || (opts && opts.type === 'leaflet')) {
            return L.control.attribution((typeof opts === 'object') ? opts : {});
        } else {
            return L.control.gmxCopyright((typeof opts === 'object') ? opts : {});
        }
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

function createFontIcon(iconClass, state) {
    const iconEl = L.DomUtil.create('div', iconClass)
    if (state === 'active') {
        L.DomUtil.addClass(iconEl, 'icon_active')
    }
    if (state === 'disabled') {
        L.DomUtil.addClass(iconEl, 'icon_disabled')
    }
    return iconEl
}

var ContainerView = Backbone.View.extend({
    addView: function(view) {
        this.view = view;
        this.$el.append(view.el);
        this.trigger('addview');
    }
});

// returns nsGmx.ScrollView
function createScrollingSidebarTab(sidebarWidget, tabId, tabIcon, buttonPriority) {
    // var container = sidebarWidget.addTab(tabId, tabIcon, buttonPriority);
    var container = sidebarWidget.setPane(tabId, {
        createTab: function(state) { return createFontIcon(tabIcon, state) },
        position: buttonPriority
    })
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

    fullscreenPagingPane.on('showview', function() {
        scrollView.repaint();
    });

    mobileButtonsPane.addView(button, buttonPriority);

    return scrollView;
}

cm.define('sidebarWidget', ['container', 'resetter', 'config', 'map'], function(cm) {
    var resetter = cm.get('resetter');
    var config = cm.get('config');
    var map = cm.get('map')

    if (!config.app.sidebarWidget || !nsGmx.IconSidebarControl) {
        return null
    }

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
});

cm.define('sidebarAffects', ['config', 'container', 'mapActiveArea', 'sidebarWidget'], function (cm) {
    var sidebarControl = cm.get('sidebarWidget')
    var mapActiveArea = cm.get('mapActiveArea')
    var rootContainer = cm.get('container')
    var config = cm.get('config')

    var position = config.app.sidebarWidget.position || 'right';

    if (!sidebarControl) {
        return null
    }

    return new (L.Class.extend({
        initialize: function(options) {
            sidebarControl.on('opened closing', this.update, this)
            this.enable()
        },

        enable: function () {
            this._enabled = true
            this.update()
        },

        disable: function () {
            this._enabled = false
            this.update()
        },

        update: function (ev) {
            if (!this._enabled) {
                this.removeSidebarOpenedAffect()
                this.removeSidebarInitialAffect()
            } else {
                this.addSidebarInitialAffect()
                !sidebarControl.isOpened() || (ev && ev.type === 'closing') ? this.removeSidebarOpenedAffect() : this.addSidebarOpenedAffect()
            }
        },

        addSidebarInitialAffect: function() {
            L.DomUtil.addClass(rootContainer, position === 'right' ? 'gmxApplication_withRightSidebar' : 'gmxApplication_withLeftSidebar')
            if (position === 'left') {
                mapActiveArea.addAffect('sidebar-widget', {
                    left: '60px'
                })
            } else {
                mapActiveArea.addAffect('sidebar-widget', {
                    right: '60px'
                })
            }
        },

        removeSidebarInitialAffect: function() {
            L.DomUtil.removeClass(rootContainer, position === 'right' ? 'gmxApplication_withRightSidebar' : 'gmxApplication_withLeftSidebar')
            mapActiveArea.removeAffect('sidebar-widget');
        },

        addSidebarOpenedAffect: function() {
            L.DomUtil.addClass(rootContainer, 'gmxApplication_sidebarShift');
            var width = $(sidebarControl.getContainer()).outerWidth()
            if (config.app.sidebarWidget.position === 'left') {
                mapActiveArea.addAffect('sidebar-widget-opened', {
                    left: width - 50
                })
            } else {
                mapActiveArea.addAffect('sidebar-widget-opened', {
                    right: width - 50
                })
            }
        },

        removeSidebarOpenedAffect: function() {
            L.DomUtil.removeClass(rootContainer, 'gmxApplication_sidebarShift');
            mapActiveArea.removeAffect('sidebar-widget-opened')
        }
    }))()
})

cm.define('fullscreenPagingPane', ['map'], function() {
    var map = cm.get('map');

    var fullscreenPagingPane = new(nsGmx.FullscreenPagingPaneControl.extend({
        hideView: function() {
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

cm.define('layersTreeWidget', ['layersTreeWidgetContainer', 'layersTree', 'resetter', 'config', 'map'], function(cm) {
    var layersTreeWidgetContainer = cm.get('layersTreeWidgetContainer');
    var layersTree = cm.get('layersTree');
    var resetter = cm.get('resetter');
    var config = cm.get('config');
    var map = cm.get('map');

    if (!layersTreeWidgetContainer || !layersTree) {
        return null;
    }

    var layersTreeWidget = new nsGmx.LayersTreeWidget(L.extend({
        isMobile: nsGmx.Utils.isMobile()
    }, config.app.layersTreeWidget, {
        layersTree: layersTree
    }));

    layersTreeWidget.on('centerLayer', function(model) {
        map.fitBounds(model.getLatLngBounds());
    });

    resetter.on('reset', function() {
        layersTreeWidget.reset();
    });

    layersTreeWidgetContainer.addView(layersTreeWidget);

    return layersTreeWidget;
});

cm.define('bookmarksWidget', ['bookmarksWidgetContainer', 'permalinkManager', 'rawTree'], function(cm) {
    var bookmarksWidgetContainer = cm.get('bookmarksWidgetContainer');
    var permalinkManager = cm.get('permalinkManager');
    var rawTree = cm.get('rawTree');

    if (!permalinkManager || !bookmarksWidgetContainer) {
        return null;
    }

    if (!rawTree) {
        return false;
    }

    var bookmarksWidget = new nsGmx.BookmarksWidget({
        collection: new Backbone.Collection(JSON.parse(rawTree.properties.UserData && rawTree.properties.UserData).tabs)
    });

    bookmarksWidget.on('selected', function(model) {
        permalinkManager.loadFromData(model.get('state'));
    });

    bookmarksWidgetContainer.addView(bookmarksWidget);

    return bookmarksWidget;
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

        var storytellingControl = new StorytellingControlClass(L.extend({}, config.app.storytellingWidget, {
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

cm.define('calendarWidget', ['calendarWidgetContainer', 'calendar', 'resetter', 'config'], function(cm) {
    var calendarWidgetContainer = cm.get('calendarWidgetContainer');
    var calendar = cm.get('calendar');
    var resetter = cm.get('resetter');
    var config = cm.get('config');

    if (!calendarWidgetContainer) {
        return null;
    }

    var calendarClass = config.app.calendarWidget.type === 'fire' ?
        nsGmx.FireCalendarWidget :
        nsGmx.CalendarWidget;

    if (!calendarClass) {
        return false;
    }

    var calendarWidget = new calendarClass(L.extend({
        dateInterval: calendar,
        dateFormat: 'dd-mm-yy',
        dateMax: new Date()
    }, config.app.calendarWidget));

    resetter.on('reset', function() {
        calendarWidget.reset();
    });

    calendarWidgetContainer.addView(calendarWidget);

    return calendarWidget;
});

// <Boolean> debug.globals
// <Boolean> debug.layersTree
cm.define('debug', ['layersTree', 'layersHash', 'calendar', 'rawTree', 'config', 'map'], function() {
    var debugCfg = cm.get('config').debug;
    if (!debugCfg) {
        return null;
    }

    if (debugCfg.globals) {
        window.cal = cm.get('calendar');
        window.lt = cm.get('layersTree');
        window.lh = cm.get('layersHash');
        window.rt = cm.get('rawTree');
        window.cfg = cm.get('config');
        window.map = cm.get('map');
    }

    if (debugCfg.layersTree) {
        var layersTree = cm.get('layersTree');

        layersTree.on('childChange', function (node) {
            console.log(node.get('visible'), node.get('id'), node.get('properties').title);
        });
    }

    return null;
});

cm.define('debugWindow', ['logger', 'config', 'map'], function() {
    var logger = cm.get('logger');
    var config = cm.get('config');
    var map = cm.get('map');

    var opts = config.app.debugWindow;

    if (!opts) {
        return null;
    }

    var debugWindowControl = new(L.Control.extend({
        // options.logger
        initialize: function(options) {
            this.loggerCollection = options.logger;
            this.loggerCollection.on('add', this.render, this);
            this.render();
        },
        render: function() {
            if (!this._container || !this.loggerCollection.length) {
                return;
            }
            L.DomUtil.addClass(this._container, 'debugWindowControl_active');
            this.loggerCollection.map(function(msgModel) {
                var el = L.DomUtil.create('div', '', this._container);
                el.innerHTML = msgModel.get('message');
            }.bind(this));
        },
        onAdd: function(map) {
            this._container = L.DomUtil.create('div', 'debugWindowControl');
            this._controlCornerEl = L.DomUtil.create(
                'div',
                'leaflet-top leaflet-bottom leaflet-left leaflet-right debugWindowControl-controlCorner',
                map._controlContainer
            );
            map._controlCorners['debugwindow'] = this._controlCornerEl;
            this.options.position = 'debugwindow';
            this.render();
            return this._container;
        }
    }))({
        logger: logger
    });

    debugWindowControl.addTo(map);

    return debugWindowControl;
});

return cm;
};
}());
