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

(function (module) {  // eslint-disable-line no-unused-expressions

    // This closure supports NodeJS-less client side includes with <script> tags. See notes at bottom of this file.

    var format = window.templex || require('templex');

    var REVERT_TO_STYLESHEET_VALUE = null;  // null removes the style

    var body, transform, timer, scrollVelocity;

    /* inject:css */
    (function(){var a="div.dragon-list{position:relative;background-color:#fff}div.dragon-list>div,div.dragon-list>ul{position:absolute;left:0;right:0}div.dragon-list>div{text-align:center;background-color:#00796b;color:#fff;box-shadow:0 3px 6px rgba(0,0,0,.16),0 3px 6px rgba(0,0,0,.23);overflow:hidden;white-space:nowrap}div.dragon-list>ul{overflow-y:auto;bottom:0;margin:0;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}div.dragon-list>ul>li,li.dragon-pop{white-space:nowrap;list-style-type:none;border:0 solid #f4f4f4;border-bottom:1px solid #e0e0e0;cursor:move;transition:border-top-width .2s}div.dragon-list>ul>li:last-child{height:0;background-color:#0ff;border-bottom:none}li.dragon-pop{position:fixed;background-color:#fff;border:1px solid #e0e0e0;left:0;top:0;overflow-x:hidden;box-shadow:rgba(0,0,0,.188235) 0 10px 20px,rgba(0,0,0,.227451) 0 6px 6px}",b=document.createElement("style"),head=document.head||document.getElementsByTagName("head")[0];b.type="text/css";if(b.styleSheet)b.styleSheet.cssText=a;else b.appendChild(document.createTextNode(a));head.insertBefore(b,head.firstChild)})();
    /* endinject */

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

        pointInListRects: function (point) {
            return this.modelLists.find(function (modelList) {
                var rect = modelList.element.getBoundingClientRect();

                rect = {
                    left:   window.scrollX + rect.left,
                    top:    window.scrollY + rect.top,
                    right:  window.scrollX + rect.right,
                    bottom: window.scrollY + rect.bottom,
                    width:  rect.width,
                    height: rect.height
                };

                modelList.rect = rect;

                if (pointInRect(point, rect)) {
                    modelList.rect = rect;
                    return true; // found
                } else {
                    return false;
                }
            });
        },

        pointInItemRects: function (point, except1, except2) {
            return this.items.find(function (item) {
                var element = item.element;
                return (
                    element !== except1 &&
                    element !== except2 &&
                    pointInRect(point, item.rect)
                );
            });
        },

        // get positions of all list items in page coords (normalized for window and list scrolling)
        getAllItemBoundingRects: function () {
            var modelLists = this.modelLists, height;
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
                        bottom = rect.bottom;

                    if (itemElement === listElement.lastElementChild) {
                        bottom = listElement.getBoundingClientRect().bottom;
                        if (bottom < rect.top) {
                            bottom = rect.top + (height || 50);
                        }
                    } else {
                        height = rect.height;
                    }

                    rect = {
                        left:   window.scrollX + rect.left,
                        right:  window.scrollX + rect.right,
                        top:    window.scrollY + rect.top    + listElement.scrollTop,
                        bottom: window.scrollY + bottom + listElement.scrollTop
                    };

                    item.rect = rect;
                }
            });
        },

        reinsert: function (target) {
            var style = target.style;
            style.width = style[transform] = style.transition = REVERT_TO_STYLESHEET_VALUE;

            target.classList.remove('dragon-pop');

            this.drop.style.transitionDuration = '0s';
            this.drop.style.borderTopWidth = REVERT_TO_STYLESHEET_VALUE;
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

            dragon.getAllItemBoundingRects();

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
            dragon.drop.style.transition = REVERT_TO_STYLESHEET_VALUE;

            var hoverList = dragon.pointInListRects({ x: evt.clientX, y: evt.clientY }) || dragon.mostRecentHoverList;

            if (hoverList) {
                var dx = evt.clientX - dragon.pin.x,
                    dy = evt.clientY - dragon.pin.y;

                dragon.mostRecentHoverList = hoverList;

                var maxScrollY = hoverList.element.scrollHeight - hoverList.rect.height,
                    y = evt.clientY + window.scrollY,
                    magnitude;

                if (maxScrollY > 0) {
                    // list is scrollable (is taller than rect)
                    if (hoverList.element.scrollTop > 0 && (magnitude = y - (hoverList.rect.top + 5)) < 0) {
                        // mouse near or above top and list is not scrolled to top yet
                        resetTimer(magnitude, 0, hoverList.element);
                    } else if (hoverList.element.scrollTop < maxScrollY && (magnitude = y - (hoverList.rect.bottom - 1 - 5)) > 0) {
                        // mouse near or below bottom and list not scrolled to bottom yet
                        resetTimer(magnitude, maxScrollY, hoverList.element);
                    } else {
                        // mouse inside
                        resetTimer();
                    }
                }

                var other = dragon.pointInItemRects({
                    x: evt.clientX,
                    y: dragon.rect.bottom + window.scrollY + dy + hoverList.element.scrollTop
                }, this, dragon.drop);

                this.style[transform] = translate(
                    dragon.rect.left - window.scrollX + dx,
                    dragon.rect.top - window.scrollY + dy
                );

                if (other) {
                    var element = other.element;
                    element.style.transition = REVERT_TO_STYLESHEET_VALUE;
                    element.style.borderTopWidth = dragon.drop.style.borderTopWidth;
                    dragon.drop.style.borderTopWidth = null;
                    dragon.drop = element;
                }
            }
        },

        mouseup: function (dragon, evt) {
            resetTimer();
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
                this.style.transitionDuration = REVERT_TO_STYLESHEET_VALUE; //reverts to 200ms
                this.style.transitionProperty = transform;
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

                this.style.transitionProperty = REVERT_TO_STYLESHEET_VALUE; //reverts to border-top-width

                var model = dragon.modelLists[dragon.origin.list].splice(dragon.origin.item, 1)[0];
                var destination = dragon.itemCoordinates(this);
                dragon.modelLists[destination.list].splice(destination.item, 0, model);

                if (dragon.callback.dropped) {
                    dragon.callback.dropped.call(this, dragon);
                }
            }
        }
    };

    function resetTimer(magnitude, limit, element) {
        if (!magnitude) {
            clearInterval(timer);
            scrollVelocity = 0;
        } else {
            var changeDirection = Math.sign(scrollVelocity) !== Math.sign(magnitude);
            scrollVelocity = magnitude > 0 ? Math.min(50, magnitude) : Math.max(-50, magnitude);
            if (changeDirection) {
                clearInterval(timer);
                timer = setInterval(function (limit) {
                    var scrollTop = element.scrollTop + scrollVelocity;
                    if (scrollVelocity < 0 && scrollTop < limit || scrollVelocity > 0 && scrollTop > limit) {
                        element.scrollTop = limit;
                        clearInterval(timer);
                    } else {
                        element.scrollTop = scrollTop;
                    }
                }, 125);
            }
        }
    }

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
                throw error('List [{1}] not an array of models (with or without additional properties) OR ' +
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

})(
    typeof window === 'undefined' ? module : window.module || (window.ListDragon = {}),
    typeof window === 'undefined' ? module.exports : window.module && window.module.exports || (window.ListDragon.exports = {})
) || (
    typeof window === 'undefined' || window.module || (window.ListDragon = window.ListDragon.exports)
);

/* About the above IIFE:
 * This file is a "modified node module." It functions as usual in Node.js *and* is also usable directly in the browser.
 * 1. Node.js: The IIFE is superfluous but innocuous.
 * 2. In the browser: The IIFE closure serves to keep internal declarations private.
 * 2.a. In the browser as a global: The logic in the actual parameter expressions + the post-invocation expression
 * will put your API in `window.ListDragon`.
 * 2.b. In the browser as a module: If you predefine a `window.module` object, the results will be in `module.exports`.
 * The bower component `mnm` makes this easy and also provides a global `require()` function for referencing your module
 * from other closures. In either case, this works with both NodeJs-style export mechanisms -- a single API assignment,
 * `module.exports = yourAPI` *or* a series of individual property assignments, `module.exports.property = property`.
 *
 * Before the IIFE runs, the actual parameter expressions are executed:
 * 1. If `window` object undefined, we're in NodeJs so assume there is a `module` object with an `exports` property
 * 2. If `window` object defined, we're in browser
 * 2.a. If `module` object predefined, use it
 * 2.b. If `module` object undefined, create a `ListDragon` object
 *
 * After the IIFE returns:
 * Because it always returns undefined, the expression after the || will execute:
 * 1. If `window` object undefined, then we're in NodeJs so we're done
 * 2. If `window` object defined, then we're in browser
 * 2.a. If `module` object predefined, we're done; results are in `moudule.exports`
 * 2.b. If `module` object undefined, redefine`ListDragon` to be the `ListDragon.exports` object
 */
