// list-dragon node module
// https://github.com/openfin/list-dragon

'use strict';

/* eslint-env node, browser */

(function (module) {  // eslint-disable-line no-unused-expressions

    // This closure supports NodeJS-less client side includes with <script> tags. See notes at bottom of this file.

    var format = window.templex || require('templex');

    var REVERT_TO_STYLESHEET_VALUE = null;  // null removes the style

    var body, transform, timer, scrollVelocity;

    /* inject:css */
    (function(){var a="div.dragon-list{position:relative;background-color:#fff}div.dragon-list>div,div.dragon-list>ul{position:absolute;left:0;right:0}div.dragon-list>div{text-align:center;background-color:#00796b;color:#fff;box-shadow:0 3px 6px rgba(0,0,0,.16),0 3px 6px rgba(0,0,0,.23);overflow:hidden;white-space:nowrap}div.dragon-list>ul{overflow-y:auto;bottom:0;margin:0;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}div.dragon-list>ul>li,li.dragon-pop{white-space:nowrap;list-style-type:none;border:0 solid #f4f4f4;border-bottom:1px solid #e0e0e0;cursor:move;transition:border-top-width .2s}div.dragon-list>ul>li:last-child{height:0;border-bottom:none}li.dragon-pop{position:fixed;background-color:#fff;border:1px solid #e0e0e0;left:0;top:0;overflow-x:hidden;box-shadow:rgba(0,0,0,.188235) 0 10px 20px,rgba(0,0,0,.227451) 0 6px 6px}",b=document.createElement("style"),head=document.head||document.getElementsByTagName("head")[0];b.type="text/css";if(b.styleSheet)b.styleSheet.cssText=a;else b.appendChild(document.createTextNode(a));head.insertBefore(b,head.firstChild)})();
    /* endinject */

    /**
     * @constructor ListDragon
     *
     * @desc This object services a set of item lists that allow dragging and dropping items within and between lists in a set.
     *
     * Two strategies are supported:
     *
     * 1. Supply your own HTML markup and let the API build the item models for you.
     *    To use this strategy, script your HTML and provide one of these:
     *    * an array of all the list item (`<li>`) tags
     *    * a CSS selector that points to all the list item tags
     * 2. Supply your own item models and let the API build the HTML markup for you.
     *    To use this strategy, provide an array of model lists.
     *
     * The new ListDragon object's `modelLists` property references the array of model lists the API constructed for you in strategy #1 or the array of model lists you supplied for strategy #2.
     *
     * After the user performs a successful drag-and-drop operation, the position of the model references within the `modelLists` array is rearranged. (The models themselves are the original objects as supplied in the model lists; they are not rebuilt or altered in any way. Just the references to them are moved around.)
     *
     * @param {string|Element[]|modelListType[]} selectorOrModelLists - You must supply one of the items in **bold** below:
     *
     * 1. _For strategy #1 above (API creates models from supplied elements):_ All the list item (`<li>`) DOM elements of all the lists you want the new object to manage, as either:
     *    1. **A CSS selector;** _or_
     *    2. **An array of DOM elements**
     * 2. _For strategy #2 above (API creates elements from supplied models):_ **An array of model lists,** each of which is in one of the following forms:
     *    1. An array of item models (with various option properties hanging off of it); _and/or_
     *    2. A {@link modelListType} object with those same various option properties including the required `models` property containing that same array of item models.
     *
     * In either case (2.1 or 2.2), each element of such arrays of item models may take the form of:
     * * A string primitive; _or_
     * * A {@link itemModelType} object with a various option properties including the required `label` property containing a string primitive.
     *
     * Regarding these string primitives, each is either:
     * * A string to be displayed in the list item; _or_
     * * A format string with other property values merged in, the result of which is to be displayed in the list item.
     *
     * @param {object} [options={}] - There are no formal options, but you can supply "global" template variables here, representing the "outer scope," after first searching each model and then each model list.
     */
    function ListDragon(selectorOrModelLists, options) {

        if (!(this instanceof ListDragon)) {
            throw error('Not called with "new" keyword.');
        }

        var self = this, modelLists, items;

        options = options || {};

        if (typeof selectorOrModelLists === 'string') {
            items = toArray(document.querySelectorAll(selectorOrModelLists));
            modelLists = createModelListsFromListElements(items);
        } else if (selectorOrModelLists[0] instanceof Element) {
            items = toArray(selectorOrModelLists);
            modelLists = createModelListsFromListElements(items);
        } else {
            // param is array of model lists
            // build new <ul> element(s) for each list and put in `.modelLists`;
            // fill `.items` array with <li> elements from these new <ul> elements
            items = [];
            modelLists = createListElementsFromModelLists(selectorOrModelLists, options);
            modelLists.forEach(function (list) {
                items = items.concat(toArray(list.element.querySelectorAll('li')));
            });
        }

        items.forEach(function (itemElement, index) {
            var item = (itemElement !== itemElement.parentElement.lastElementChild)
                ? self.addEvt(itemElement, 'mousedown', itemElement, true)
                : { element: itemElement };

            /* `item.model` not currently needed so commented out here.
             * (Originally used for rebuilding modelLists for final
             * reporting, modelLists are now spliced on every successful
             * drag-and-drop operation so they're always up to date.)

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
                        resetAutoScrollTimer(magnitude, 0, hoverList.element);
                    } else if (hoverList.element.scrollTop < maxScrollY && (magnitude = y - (hoverList.rect.bottom - 1 - 5)) > 0) {
                        // mouse near or below bottom and list not scrolled to bottom yet
                        resetAutoScrollTimer(magnitude, maxScrollY, hoverList.element);
                    } else {
                        // mouse inside
                        resetAutoScrollTimer();
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
            resetAutoScrollTimer();
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

    function resetAutoScrollTimer(magnitude, limit, element) {
        if (!magnitude) {
            clearInterval(timer);
            scrollVelocity = 0;
        } else {
            var changeDirection =
                scrollVelocity  <  0 && magnitude  >= 0 ||
                scrollVelocity === 0 && magnitude !== 0 ||
                scrollVelocity  >  0 && magnitude  <= 0;
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

    /**
     * Create a `.modelLists` array with these <li> elements' parent <ul> elements
     * @param {Element[]} listItemElements
     * @returns {Array}
     */
    function createModelListsFromListElements(listItemElements) {
        var modelLists = [];

        listItemElements.forEach(function (itemElement) {
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
        return 'list-dragon: ' + format.apply(this, Array.prototype.slice.call(arguments));
    }

    // this interface consists solely of the prototypal object constructor
    module.exports = ListDragon;

})(
    typeof module === 'object' && module || (window.ListDragon = {}),
    typeof module === 'object' && module.exports || (window.ListDragon.exports = {})
) || (
    typeof module === 'object' || (window.ListDragon = window.ListDragon.exports)
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
