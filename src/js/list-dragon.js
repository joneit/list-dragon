// list-dragon node module
// https://github.com/openfin/list-dragon

'use strict';

/* eslint-env node, browser */

/**
 * @typedef {string|object} itemModelType
 *
 * @summary Data model for a drag-and-drop list item.
 *
 * @desc These "models" are typically just string primitives. Alternatively, you can supply your own object so long as it has a `label` property to hold the string. If you need to include the `htmlEncode` property then you have no choice; you must make it an object.
 *
 * > The models are not altered or rebuilt by the {@link ListDragon|constructor} nor by a successful drag-and-drop operation.
 *
 * @property {string} [label] - The string to display in the list item. If omitted, defaults to the value of the {@link modelListType} array's `label` property.
 *
 * Alternatively, the label string may be a template incorporating `{...}`-style data merge flags. These will be replaced with the values of the properties so named. For example, the following model object ...
 *
 * ```javascript
 * var template = '<b>#{jersey}</b> - ' +
 *     '{lastName}, {firstName} ' +
 *     '<i>{position}</i>';
 *
 * var model = {
 *     label: template,
 *     firstName: 'Graham',
 *     lastName: 'Zusi',
 *     jersey: 10,
 *     position: 'Midfielder'
 * }
 * ```
 *
 * ... produces a list item that looks something like this:
 *
 * <div style="display:inline-block;border:1px solid #ccc;padding:3px 8px;box-shadow:3px 3px 5px"><b>#10</b> - Graham Zusi, <i>Midfielder</i></div>
 *
 * @property {boolean} [htmlEncode] - If truthy, encode the string. If omitted, inherit value from the property of the same name hanging off of the containing {@link modelListType} array.
 */

/**
 * @typedef {itemModelType[]|object} modelListType
 *
 * @summary List of models representing a `<ul>...</ul>` element to be generated.
 *
 * @desc This list can be supplied to the ListDragon {@link ListDragon|constructor} and ListDragon will generate the HTML for you.
 *
 * Because JavaScript array literal syntax does not accommodate additional properties, you may specify an object rather than an array and include a `models` property (see below) to hold the actual model list array.
 *
 * > This object will be mutated by the constructor as follows:
 * 1. If this is an object (rather than an array, as discussed above), the constructor converts it to an array with additional properties.
 * 2. The constructor adds in the `container` and `element`.
 *
 * @property {itemModelType[]} models - The model list array (when this is an object). _Only include this property if this is an object and not an array._
 *
 * @property {boolean|function} [isDropTarget=true] - Enables the list as a target for dropping list items. If a function, it is called on every 'mousedown' event with `this` as the `modelListType` object; it should return a boolean.
 *
 * @property {string} [title] - Wraps generated `<ul>...</ul>` element in a `<div>...</div>` element and prepends a `<div>...</div>` for the title.
 *
 * @property {boolean} [htmlEncode=options.htmlEncode] - Encode the title and all model labels (unless models[*].hmtlEncode is defined as falsey).
 *
 * @property {string} [cssClassNames=options.cssClassNames] - CSS class name for container `<div>...<div>` element (when there is a title) or `<ul>...</ul>` element (when there is not).
 *
 * @property {string} [label] - Default list item contents when list item is a model with no `label` property of its own. Not especially useful unless a template. (See {@link itemModelType} for details.)
 *
 * @property {Element} container - A new `<div>...</div>` element ready for DOM insertion. It contains a nested `<div>...</div>` for the header (when `title` given) and a nested `<ul>...</ul>` for the drag-and-drop item list. _Do not specify this property yourself; it is added automatically by the ListDragon {@link ListDragon|constructor}._
 *
 * @property {Element} element - The `<ul>...</ul>` element nested within the containing `<div>...</div>` element. _Do not specify this property yourself; it is added automatically by the ListDragon {@link ListDragon|constructor}._
 */

(function (module) { // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

    var format = require('templex');

    var REINHERIT_STYLESHEET_VALUE = null;  // null removes the style

    var body, transform;

    /**
     * @constructor ListDragon
     *
     * @desc This object services a set of item lists that allow dragging and dropping items with and between them.
     *
     * Two strategies are supported:
     *
     * 1. Supply your own models and let the API build the HTML.
     * To use this strategy, provide an array of model lists.
     * 2. Supply your own HTML and let the API build the models for you.
     * To use this strategy, script your HTML and provide one of these:
     *    * an array of all the list item (`<li>`) tags
     *    * a CSS selector that points to all the list item tags
     *
     * For the first strategy, when you supply a model list array, the new ListDragon object will include a reference to it in the `modelLists` property. For the second strategy, when you supply the HTML, the constructor builds the `modelLists` array for you.
     *
     * In either case, after the user performs a successful drag-and-drop operation, the position of the models within this array will have changed. (The models themselves are the original objects as supplied in the model lists; they are not touched (altered or rebuilt) in any way.)
     *
     * @param {modelListType[]|Element[]|string} selectorOrModelLists - See the {@link modelListType|typedef} for details.
     * @param {object} [options={}] - outer scope for template variables, after each model and each model list
     * @param {boolean} [options.htmlEncode=false] - Encode the title and all model labels (unless models[*].hmtlEncode is defined as falsey).
     * @param {string} [options.cssClassNames='dragon-list'] - CSS class name for container `<div>...<div>` element (when there is a title) or `<ul>...</ul>` element (when there is not).
     * @param {string} [label]
     */
    function ListDragon(selectorOrModelLists, options) {

        if (!(this instanceof ListDragon)) {
            throw error('Not called with "new" keyword.');
        }

        var self = this;
        var modelLists, items;

        options = options || {};

        if (selectorOrModelLists instanceof Array) {
            // param is model list array
            // build new <ul> element(s) from given array(s) and put in `.modelLists`;
            // fill `.items` array with <li> elements from these new <ul> elements
            items = [];
            modelLists = createListElementsFromModelLists(selectorOrModelLists, options);
            modelLists.forEach(function (list) {
                items = items.concat(toArray(list.element.querySelectorAll('li')));
            });
        } else {
            if (selectorOrModelLists[0] instanceof Element) {
                // param is list of <li>...</li> elements
                items = selectorOrModelLists;
            } else {
                // param is selector
                // fill `.items` array with <li>...</li> elements from selected <ul> elements
                selectorOrModelLists = (selectorOrModelLists || '\\').replace(/\\/g, 'li');
                items = document.querySelectorAll(selectorOrModelLists);
            }

            if (!(items instanceof Array)) {
                items = toArray(items);
            }

            // fill `.modelLists` array with these <li> elements' parent <ul> elements
            modelLists = createModelListsFromListElements(items);
        }

        items.forEach(function (itemElement, index) {
            var item = (itemElement !== itemElement.parentElement.lastElementChild)
                ? self.addEvt(itemElement, 'mousedown', itemElement, true)
                : { element: itemElement };

            /* `item.model` not currently needed so commented out here.
             * Originally used for rebuilding modelLists for final reporting,
             * modelLists are now spliced on the fly (on every successful
             * drag-and-drop operation) so they're always up to date.

             var origin = this.itemCoordinates(itemElement);
             item.model = this.modelLists[origin.list].models[origin.item];

             */

            items[index] = item;
        });

        body = body || document.getElementsByTagName('body')[0];

        transform = 'transform' in items[0].element.style
            ? 'transform' // Chrome 45 and Firefox 40
            : '-webkit-transform'; // Safari 8

        // set up the new object
        this.modelLists = modelLists;
        this.items = items;
        this.bindings = {};
        this.callback = {};

    }

    ListDragon.prototype = {

        addEvt: function (target, type, listener, doNotBind) {
            var binding = {
                handler: handlers[type].bind(target, this),
                element: listener || window
            };

            if (!doNotBind) {
                this.bindings[type] = binding;
            }

            binding.element.addEventListener(type, binding.handler);

            return binding;
        },

        removeEvt: function (type) {
            var binding = this.bindings[type];
            delete this.bindings[type];
            binding.element.removeEventListener(type, binding.handler);
        },

        removeAllEventListeners: function () {
            // remove drag & drop events (mousemove, mouseup, and transitionend)
            for (var type in this.bindings) {
                var binding = this.bindings[type];
                binding.element.removeEventListener(type, binding.handler);
            }
            // remove the mousedown events from all list items
            this.items.forEach(function (item) {
                if (item.handler) {
                    item.element.removeEventListener('mousedown', item.handler);
                }
            });
        },

        pointInRects: function (point, except1, except2) {
            return this.items.find(function (item) {
                return (
                    item.element !== except1 &&
                    item.element !== except2 &&
                    pointInRect(point, item.rect)
                );
            });
        },

        // get positions of all list items in page coords
        getAllBoundingRects: function () {
            var modelLists = this.modelLists;
            this.items.forEach(function (item) {
                var itemElement = item.element,
                    listElement = itemElement.parentElement,
                    list = modelLists.find(function (list) { return list.element === listElement; });

                if (
                    // omitted: default to true
                    list.isDropTarget === undefined ||

                    // function: use return value
                    typeof list.isDropTarget === 'function' && list.isDropTarget() ||

                    // otherwise: use truthiness of given value
                    list.isDropTarget
                ) {
                    var rect = itemElement.getBoundingClientRect(),
                        last = itemElement === listElement.lastElementChild,
                        fill = last ? listElement.getBoundingClientRect() : rect;

                    rect = {
                        left:   window.scrollX + rect.left,
                        top:    window.scrollY + rect.top,
                        right:  window.scrollX + rect.right,
                        bottom: window.scrollY + fill.bottom
                    };

                    item.rect = rect;
                }
            });
        },

        reinsert: function (target) {
            var style = target.style;
            style.width = style[transform] = style.transition = REINHERIT_STYLESHEET_VALUE;

            target.classList.remove('dragon-pop');

            this.drop.style.transitionDuration = '0s';
            this.drop.style.borderTopWidth = REINHERIT_STYLESHEET_VALUE;
            this.drop.parentElement.insertBefore(target, this.drop);

            delete this.drop;
        },

        // return an object { item: <item index within list>, list: <list index within list of lists> }
        itemCoordinates: function (item) {
            var listElement = item.parentElement,
                coords = { item: 0 };

            while ((item = item.previousElementSibling)) {
                ++coords.item;
            }

            this.modelLists.find(function (list, index) {
                coords.list = index;
                return list.element === listElement; // stop when we find the one we belong to
            });

            return coords;
        }

    };

    var handlers = {
        mousedown: function (dragon, evt) {

            evt.stopPropagation();
            evt.preventDefault();  //prevents user selection of rendered nodes during drag

            if (dragon.drop) {
                return;
            }

            var rect = this.getBoundingClientRect();

            dragon.rect = rect = {
                left:   Math.round(rect.left - 1),
                top:    Math.round(rect.top - 1),
                right:  Math.round(rect.right),
                bottom: Math.round(rect.bottom),
                width:  Math.round(rect.width),
                height: Math.round(rect.height)
            };

            dragon.pin = {
                x: window.scrollX + evt.clientX,
                y: window.scrollY + evt.clientY
            };

            dragon.origin = dragon.itemCoordinates(this);

            if (dragon.callback.grabbed) {
                dragon.callback.grabbed.call(this, dragon);
            }

            dragon.getAllBoundingRects();

            dragon.drop = this.nextElementSibling;
            dragon.drop.style.transitionDuration = '0s';
            dragon.drop.style.borderTopWidth = rect.height + 'px';

            this.style.width = rect.width + 'px';
            this.style.transitionDuration = '0s';
            this.style[transform] = translate(
                rect.left - window.scrollX,
                rect.top  - window.scrollY
            );
            this.classList.add('dragon-pop');

            body.appendChild(this);

            rect.left   += window.scrollX;
            rect.top    += window.scrollY;
            rect.right  += window.scrollX;
            rect.bottom += window.scrollY;

            dragon.addEvt(this, 'mousemove');
            dragon.addEvt(this, 'mouseup');
        },

        mousemove: function (dragon, evt) {
            dragon.drop.style.transition = REINHERIT_STYLESHEET_VALUE;

            var dx = evt.clientX - dragon.pin.x,
                dy = evt.clientY - dragon.pin.y,
                bottom = {
                    x: evt.clientX,
                    y: dragon.rect.bottom + window.scrollY + dy
                },
                other = dragon.pointInRects(bottom, this, dragon.drop);

            this.style[transform] = translate(
                dragon.rect.left - window.scrollX + dx,
                dragon.rect.top  - window.scrollY + dy
            );

            if (other) {
                var element = other.element;
                element.style.transition = REINHERIT_STYLESHEET_VALUE;
                element.style.borderTopWidth = dragon.drop.style.borderTopWidth;
                dragon.drop.style.borderTopWidth = null;
                dragon.drop = element;
            }
        },

        mouseup: function (dragon, evt) {
            dragon.removeEvt('mousemove');
            dragon.removeEvt('mouseup');

            evt.stopPropagation();

            var newRect = this.getBoundingClientRect();

            if (
                window.scrollX + newRect.left === dragon.rect.left &&
                window.scrollY + newRect.top === dragon.rect.top
            ) {
                dragon.reinsert(this);
            } else {
                var dropRect = dragon.drop.getBoundingClientRect();

                dragon.addEvt(this, 'transitionend', this);
                this.style.transitionDuration = REINHERIT_STYLESHEET_VALUE;
                this.style[transform] = translate(
                    dropRect.left - window.scrollX,
                    dropRect.top - window.scrollY
                );
            }
        },

        transitionend: function (dragon, evt) {
            if (evt.propertyName === transform) {
                dragon.removeEvt('transitionend');
                dragon.reinsert(this);

                var model = dragon.modelLists[dragon.origin.list].splice(dragon.origin.item, 1)[0];
                var destination = dragon.itemCoordinates(this);
                dragon.modelLists[destination.list].splice(destination.item, 0, model);

                if (dragon.callback.dropped) {
                    dragon.callback.dropped.call(this, dragon);
                }
            }
        }
    };

    function toArray(arrayLikeObject) {
        return Array.prototype.slice.call(arrayLikeObject);
    }

    function pointInRect(point, rect) {
        return rect.top <= point.y && point.y <= rect.bottom
            && rect.left <= point.x && point.x <= rect.right;
    }

    function translate(left, top) {
        return 'translate('
            + Math.floor(left + window.scrollX) + 'px,'
            + Math.floor(top + window.scrollY) + 'px)';
    }

    function htmlEncode(string) {
        var textNode = document.createTextNode(string);

        return document
            .createElement('a')
            .appendChild(textNode)
            .parentNode
            .innerHTML;
    }

    /**
     * Creates `<ul>...</ul>` elements and inserts them into an `element` property on each model.
     * @param {object} modelLists
     * @returns `modelLists`
     */
    function createListElementsFromModelLists(modelLists, options) {
        var templateLabel = options.label || '{label}';

        modelLists.forEach(function (modelList, listIndex) {
            var listLabel = modelList.label || templateLabel,
                listHtmlEncode = modelList.htmlEncode !== undefined && modelList.htmlEncode || options.htmlEncode,
                container = document.createElement('div'),
                listElement = document.createElement('ul');

            if (modelList.models) {
                Object.keys(modelList).forEach(function (key) {
                    if (key !== 'models') {
                        modelList.models[key] = modelList[key];
                    }
                });
                modelLists[listIndex] = modelList = modelList.models;
            } else if (modelList instanceof Array) {
                modelList.models = modelList; // point to self
            } else {
                throw error('List [{1}] not an array of models (with or without additional properties) OR' +
                    'an object (with a `models` property containing an array of models).', listIndex);
            }

            modelList.forEach(function (model) {
                var modelLabel = model.label || listLabel,
                    modelHtmlEncode = model.htmlEncode !== undefined && model.htmlEncode || listHtmlEncode,
                    modelObject = typeof model === 'object' ? model : { label: model},
                    label = format.call([modelObject, modelList, options], modelLabel),
                    itemElement = document.createElement('li');

                itemElement.innerHTML = modelHtmlEncode ? htmlEncode(label) : label;

                listElement.appendChild(itemElement);
            });

            // append the final "fencepost" item -- drop target at bottom of list after all items
            var itemElement = document.createElement('li');
            itemElement.innerHTML = '&nbsp;';
            listElement.appendChild(itemElement);

            // append header to container
            if (modelList.title) {
                var header = document.createElement('div');
                header.innerHTML = listHtmlEncode ? htmlEncode(modelList.title) : modelList.title;
                container.appendChild(header);
            }

            container.appendChild(listElement);
            container.className = modelList.cssClassNames || options.cssClassNames || 'dragon-list';
            modelList.element = listElement;
            modelList.container = container;
        });

        return modelLists;
    }

    function createModelListsFromListElements(items) {
        var modelLists = [];

        items.forEach(function (itemElement) {
            var listElement = itemElement.parentElement,
                container = listElement.parentElement,
                models = [];
            if (!modelLists.find(function (list) { return list.element === listElement; })) {
                toArray(listElement.querySelectorAll('li')).forEach(function (itemElement) {
                    if (itemElement !== listElement.lastElementChild) {
                        models.push(itemElement.innerHTML);
                    }
                });
                models.element = listElement;
                models.container = container;
                modelLists.push(models);
            }
        });

        return modelLists;
    }

    function error() {
        return 'ListDragon: ' + format.apply(this, Array.prototype.slice.call(arguments));
    }

    // this interface consists solely of the prototypal object constructor
    module.exports = ListDragon;

})(module, module.exports);

