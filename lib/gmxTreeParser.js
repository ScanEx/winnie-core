var nsGmx = nsGmx || {};

+ function() {
    // everything except of this will be in MetaProperties
    var reservedPropsNames = ['id', 'type', 'list', 'title', 'description', 'expanded', 'visible', 'children'];

    function createRawTree(mapConfig, lang) {
        mapConfig.name = 'root';
        mapConfig.BaseLayers = '[]';

        return rCreateRawTree(mapConfig).content;

        function rCreateRawTree(l) {
            if (!l) {
                return;
            }

            return {
                type: l.children ? 'group' : 'layer',
                content: {
                    properties: createLayerProperties(l, lang),
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

        (rawTree.content.children || []).map(function (child) {
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

        props.title = typeof props.title === 'object' ? props.title[lang] : props.title;
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

    nsGmx.gmxTreeParser = {
        createRawTree: createRawTree,
        walkRawTree: walkRawTree,
        createLayerProperties: createLayerProperties
    };
}();
