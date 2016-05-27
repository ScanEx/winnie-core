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

cm.define('gmxMap', ['map', 'i18n', 'config'], function(cm, cb) {
    var config = cm.get('config');
    var intl = cm.get('i18n');

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
        // debugger;
        cb(parseMapConfig(config.map));
    } else {
        cb(createEmptyMap());
    }

    function parseMapConfig(mapConfig) {
        // everything except of this will be in MetaProperties
        var propsNames = ['id', 'type', 'title', 'description', 'expanded', 'visible', 'children'];

        var layersHash = {};
        var rawTree = rParseMapConfig({
            id: 'map',
            title: 'map',
            children: mapConfig.layers
        });

        function rParseMapConfig(l) {
            if (!l) {
                return;
            }

            var props = {};
            Object.keys(l).map(function(propName) {
                if (propsNames.indexOf(propName) + 1) {
                    props[propName] = l[propName];
                }
            })

            props.title = typeof props.title === 'object' ? props.title[intl.getLanguage()] : props.title;
            props.description = typeof props.description === 'object' ? props.description[intl.getLanguage()] : props.description;

            if (l.children) {
                var id = l.id || l.gmxId || 'group' + _.uniqueId();
                props.GroupID = id;
                props.name = id;
            } else {
                var id = l.id || l.gmxId || 'layer' + _.uniqueId();
                props.LayerID = id;
                props.name = id;
            }

            var metaProps = {};
            Object.keys(l).map(function(propName) {
                if (propsNames.indexOf(propName) + 1) {
                    return;
                } else {
                    metaProps[propName] = {
                        'Type': capitalize(typeof l[propName]),
                        'Value': l[propName]
                    };
                }
            });

            props.MetaProperties = metaProps;

            layersHash[props.name] = L.gmx.createLayer({
                properties: props
            });

            return {
                type: l.children ? 'group' : 'layer',
                content: {
                    properties: props,
                    children: l.children && l.children.map(function(c) {
                        return rParseMapConfig(c);
                    }),
                    geometry: null
                }
            }
        }

        return {
            getRawTree: function() {
                return {
                    properties: {
                        BaseLayers: '[]'
                    },
                    children: rawTree.content.children
                }
            },
            getLayersHash: function() {
                return layersHash;
            }
        }
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

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
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

cm.define('baseLayersManager', ['map', 'config', 'rawTree', 'permalinkManager'], function(cm, cb) {
    var map = cm.get('map');
    var config = cm.get('config');
    var rawTree = cm.get('rawTree');
    var permalinkManager = cm.get('permalinkManager');

    var baseLayers = JSON.parse(rawTree.properties.BaseLayers);
    if (!map.gmxBaseLayersManager) {
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
        return false;
    }
    map.gmxBaseLayersManager.initDefaults({
        apiKey: config.app.gmxMap.apiKey
    }).then(function() {
        if (baseLayers && baseLayers.length) {
            map.gmxBaseLayersManager.setActiveIDs(baseLayers).setCurrentID(baseLayers[0]);
        }
        permalinkManager && permalinkManager.setIdentity('baseLayersManager', map.gmxBaseLayersManager);
        cb(map.gmxBaseLayersManager);
    });
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
