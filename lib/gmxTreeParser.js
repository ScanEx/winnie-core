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
