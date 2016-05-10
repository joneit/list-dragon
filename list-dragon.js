(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* eslint-env browser */

/** @namespace cssInjector */

/**
 * @summary Insert base stylesheet into DOM
 *
 * @desc Creates a new `<style>...</style>` element from the named text string(s) and inserts it but only if it does not already exist in the specified container as per `referenceElement`.
 *
 * > Caveat: If stylesheet is for use in a shadow DOM, you must specify a local `referenceElement`.
 *
 * @returns A reference to the newly created `<style>...</style>` element.
 *
 * @param {string|string[]} cssRules
 * @param {string} [ID]
 * @param {undefined|null|Element|string} [referenceElement] - Container for insertion. Overloads:
 * * `undefined` type (or omitted): injects stylesheet at top of `<head>...</head>` element
 * * `null` value: injects stylesheet at bottom of `<head>...</head>` element
 * * `Element` type: injects stylesheet immediately before given element, wherever it is found.
 * * `string` type: injects stylesheet immediately before given first element found that matches the given css selector.
 *
 * @memberOf cssInjector
 */
function cssInjector(cssRules, ID, referenceElement) {
    if (typeof referenceElement === 'string') {
        referenceElement = document.querySelector(referenceElement);
        if (!referenceElement) {
            throw 'Cannot find reference element for CSS injection.';
        }
    } else if (referenceElement && !(referenceElement instanceof Element)) {
        throw 'Given value not a reference element.';
    }

    var container = referenceElement && referenceElement.parentNode || document.head || document.getElementsByTagName('head')[0];

    if (ID) {
        ID = cssInjector.idPrefix + ID;

        if (container.querySelector('#' + ID)) {
            return; // stylesheet already in DOM
        }
    }

    var style = document.createElement('style');
    style.type = 'text/css';
    if (ID) {
        style.id = ID;
    }
    if (cssRules instanceof Array) {
        cssRules = cssRules.join('\n');
    }
    cssRules = '\n' + cssRules + '\n';
    if (style.styleSheet) {
        style.styleSheet.cssText = cssRules;
    } else {
        style.appendChild(document.createTextNode(cssRules));
    }

    if (referenceElement === undefined) {
        referenceElement = container.firstChild;
    }

    container.insertBefore(style, referenceElement);

    return style;
}

/**
 * @summary Optional prefix for `<style>` tag IDs.
 * @desc Defaults to `'injected-stylesheet-'`.
 * @type {string}
 * @memberOf cssInjector
 */
cssInjector.idPrefix = 'injected-stylesheet-';

// Interface
module.exports = cssInjector;

},{}],2:[function(require,module,exports){
// templex node module
// https://github.com/joneit/templex

/* eslint-env node */

/**
 * Merges values of execution context properties named in template by {prop1},
 * {prop2}, etc., or any javascript expression incorporating such prop names.
 * The context always includes the global object. In addition you can specify a single
 * context or an array of contexts to search (in the order given) before finally
 * searching the global context.
 *
 * Merge expressions consisting of simple numeric terms, such as {0}, {1}, etc., deref
 * the first context given, which is assumed to be an array. As a convenience feature,
 * if additional args are given after `template`, `arguments` is unshifted onto the context
 * array, thus making first additional arg available as {1}, second as {2}, etc., as in
 * `templex('Hello, {1}!', 'World')`. ({0} is the template so consider this to be 1-based.)
 *
 * If you prefer something other than braces, redefine `templex.regexp`.
 *
 * See tests for examples.
 *
 * @param {string} template
 * @param {...string} [args]
 */
function templex(template) {
    var contexts = this instanceof Array ? this : [this];
    if (arguments.length > 1) { contexts.unshift(arguments); }
    return template.replace(templex.regexp, templex.merger.bind(contexts));
}

templex.regexp = /\{(.*?)\}/g;

templex.with = function (i, s) {
    return 'with(this[' + i + ']){' + s + '}';
};

templex.cache = [];

templex.deref = function (key) {
    if (!(this.length in templex.cache)) {
        var code = 'return eval(expr)';

        for (var i = 0; i < this.length; ++i) {
            code = templex.with(i, code);
        }

        templex.cache[this.length] = eval('(function(expr){' + code + '})'); // eslint-disable-line no-eval
    }
    return templex.cache[this.length].call(this, key);
};

templex.merger = function (match, key) {
    // Advanced features: Context can be a list of contexts which are searched in order.
    var replacement;

    try {
        replacement = isNaN(key) ? templex.deref.call(this, key) : this[0][key];
    } catch (e) {
        replacement = '{' + key + '}';
    }

    return replacement;
};

// this interface consists solely of the templex function (and it's properties)
module.exports = templex;

},{}],3:[function(require,module,exports){
'use strict';

/* eslint-env node, browser */

if (!window.ListDragon) {
    window.ListDragon = require('./');
}

},{"./":4}],4:[function(require,module,exports){
// list-dragon node module
// https://github.com/joneit/list-dragon

/* eslint-env node, browser */

'use strict';

var cssInjector = require('css-injector');
var format = require('templex');

var REVERT_TO_STYLESHEET_VALUE = null;  // null removes the style

var transform, timer, scrollVelocity, cssListDragon;

/* inject:css */
cssListDragon = 'div.dragon-list{position:relative;background-color:#fff}div.dragon-list>div,div.dragon-list>ul{position:absolute;left:0;right:0}div.dragon-list>div{text-align:center;background-color:#00796b;color:#fff;box-shadow:0 3px 6px rgba(0,0,0,.16),0 3px 6px rgba(0,0,0,.23);overflow:hidden;white-space:nowrap}div.dragon-list>ul{overflow-y:auto;bottom:0;margin:0;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}div.dragon-list>ul>li,li.dragon-pop{white-space:nowrap;list-style-type:none;border:0 solid #f4f4f4;border-bottom:1px solid #e0e0e0;cursor:move;transition:border-top-width .2s}div.dragon-list>ul>li:last-child{height:0;border-bottom:none}li.dragon-pop{position:fixed;background-color:#fff;border:1px solid #e0e0e0;left:0;top:0;overflow-x:hidden;box-shadow:rgba(0,0,0,.188235) 0 10px 20px,rgba(0,0,0,.227451) 0 6px 6px}';
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
 * @param {object} [options={}] - You may supply "global" template variables here, representing the "outer scope," after first searching each model and then each model list.
 * @param {undefined|null|Element|string} [cssStylesheetReferenceElement] - Determines where to insert the stylesheet. (This is the only formal option.) Passed to css-injector, the overloads are (from css-injector docs):
 * * `undefined` type (or omitted): injects stylesheet at top of `<head>...</head>` element
 * * `null` value: injects stylesheet at bottom of `<head>...</head>` element
 * * `Element` type: injects stylesheet immediately before given element, wherever it is found.
 * * `string` type: injects stylesheet immediately before given first element found that matches the given css selector.
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

    // grab wheel events and don't let 'em bubble
    modelLists.forEach(function (modelList) {
        modelList.element.addEventListener('wheel', captureEvent);
    });

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

    transform = 'transform' in items[0].element.style
        ? 'transform' // Chrome 45 and Firefox 40
        : '-webkit-transform'; // Safari 8

    // set up the new object
    this.modelLists = modelLists;
    this.items = items;
    this.bindings = {};
    this.callback = {};

    cssInjector(cssListDragon, 'list-dragon-base', options.cssStylesheetReferenceElement);

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
        // wheel events on the list elements
        this.modelLists.forEach(function (modelList) {
            modelList.element.removeEventListener('wheel', captureEvent);
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
        this.style.zIndex = window.getComputedStyle(dragon.modelLists[0].container.parentElement).zIndex;

        if (!dragon.container) {
            // walk back to closest shadow root OR body tag OR root tag
            var container = this;
            while (container.parentNode) {
                container = container.parentNode;
                if (
                    typeof ShadowRoot !== 'undefined' && container instanceof ShadowRoot ||
                    container.tagName === 'BODY'
                ){
                    break;
                }
            }
            dragon.container = container;
        }

        dragon.container.appendChild(this);

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

            var originList = dragon.modelLists[dragon.origin.list];
            var model = originList.splice(dragon.origin.item, 1)[0];
            var destination = dragon.itemCoordinates(this);
            var destinationList = dragon.modelLists[destination.list];
            var interListDrop = originList !== destinationList;
            var listChanged = interListDrop || dragon.origin.item !== destination.item;
            destinationList.splice(destination.item, 0, model);

            if (listChanged) {
                originList.element.dispatchEvent(new CustomEvent('listchanged'));
                if (interListDrop) {
                    destinationList.element.dispatchEvent(new CustomEvent('listchanged'));
                }
            }

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

function captureEvent(evt) {
    evt.stopPropagation();
}

function error() {
    return 'list-dragon: ' + format.apply(this, Array.prototype.slice.call(arguments));
}

// this interface consists solely of the prototypal object constructor
module.exports = ListDragon;

},{"css-injector":1,"templex":2}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9saXN0LWRyYWdvbi9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2xpc3QtZHJhZ29uL25vZGVfbW9kdWxlcy9jc3MtaW5qZWN0b3IvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvbGlzdC1kcmFnb24vbm9kZV9tb2R1bGVzL3RlbXBsZXgvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvbGlzdC1kcmFnb24vc3JjL2Zha2VfNGQyZDU3NTguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvbGlzdC1kcmFnb24vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4vKiogQG5hbWVzcGFjZSBjc3NJbmplY3RvciAqL1xuXG4vKipcbiAqIEBzdW1tYXJ5IEluc2VydCBiYXNlIHN0eWxlc2hlZXQgaW50byBET01cbiAqXG4gKiBAZGVzYyBDcmVhdGVzIGEgbmV3IGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQgZnJvbSB0aGUgbmFtZWQgdGV4dCBzdHJpbmcocykgYW5kIGluc2VydHMgaXQgYnV0IG9ubHkgaWYgaXQgZG9lcyBub3QgYWxyZWFkeSBleGlzdCBpbiB0aGUgc3BlY2lmaWVkIGNvbnRhaW5lciBhcyBwZXIgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqID4gQ2F2ZWF0OiBJZiBzdHlsZXNoZWV0IGlzIGZvciB1c2UgaW4gYSBzaGFkb3cgRE9NLCB5b3UgbXVzdCBzcGVjaWZ5IGEgbG9jYWwgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqIEByZXR1cm5zIEEgcmVmZXJlbmNlIHRvIHRoZSBuZXdseSBjcmVhdGVkIGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGNzc1J1bGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gW0lEXVxuICogQHBhcmFtIHt1bmRlZmluZWR8bnVsbHxFbGVtZW50fHN0cmluZ30gW3JlZmVyZW5jZUVsZW1lbnRdIC0gQ29udGFpbmVyIGZvciBpbnNlcnRpb24uIE92ZXJsb2FkczpcbiAqICogYHVuZGVmaW5lZGAgdHlwZSAob3Igb21pdHRlZCk6IGluamVjdHMgc3R5bGVzaGVldCBhdCB0b3Agb2YgYDxoZWFkPi4uLjwvaGVhZD5gIGVsZW1lbnRcbiAqICogYG51bGxgIHZhbHVlOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgYm90dG9tIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBFbGVtZW50YCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGVsZW1lbnQsIHdoZXJldmVyIGl0IGlzIGZvdW5kLlxuICogKiBgc3RyaW5nYCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGZpcnN0IGVsZW1lbnQgZm91bmQgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBjc3Mgc2VsZWN0b3IuXG4gKlxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmZ1bmN0aW9uIGNzc0luamVjdG9yKGNzc1J1bGVzLCBJRCwgcmVmZXJlbmNlRWxlbWVudCkge1xuICAgIGlmICh0eXBlb2YgcmVmZXJlbmNlRWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVmZXJlbmNlRWxlbWVudCk7XG4gICAgICAgIGlmICghcmVmZXJlbmNlRWxlbWVudCkge1xuICAgICAgICAgICAgdGhyb3cgJ0Nhbm5vdCBmaW5kIHJlZmVyZW5jZSBlbGVtZW50IGZvciBDU1MgaW5qZWN0aW9uLic7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZUVsZW1lbnQgJiYgIShyZWZlcmVuY2VFbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICAgICAgdGhyb3cgJ0dpdmVuIHZhbHVlIG5vdCBhIHJlZmVyZW5jZSBlbGVtZW50Lic7XG4gICAgfVxuXG4gICAgdmFyIGNvbnRhaW5lciA9IHJlZmVyZW5jZUVsZW1lbnQgJiYgcmVmZXJlbmNlRWxlbWVudC5wYXJlbnROb2RlIHx8IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcblxuICAgIGlmIChJRCkge1xuICAgICAgICBJRCA9IGNzc0luamVjdG9yLmlkUHJlZml4ICsgSUQ7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcjJyArIElEKSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBzdHlsZXNoZWV0IGFscmVhZHkgaW4gRE9NXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgIGlmIChJRCkge1xuICAgICAgICBzdHlsZS5pZCA9IElEO1xuICAgIH1cbiAgICBpZiAoY3NzUnVsZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjc3NSdWxlcyA9IGNzc1J1bGVzLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICBjc3NSdWxlcyA9ICdcXG4nICsgY3NzUnVsZXMgKyAnXFxuJztcbiAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3NSdWxlcztcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3NSdWxlcykpO1xuICAgIH1cblxuICAgIGlmIChyZWZlcmVuY2VFbGVtZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGNvbnRhaW5lci5maXJzdENoaWxkO1xuICAgIH1cblxuICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoc3R5bGUsIHJlZmVyZW5jZUVsZW1lbnQpO1xuXG4gICAgcmV0dXJuIHN0eWxlO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IE9wdGlvbmFsIHByZWZpeCBmb3IgYDxzdHlsZT5gIHRhZyBJRHMuXG4gKiBAZGVzYyBEZWZhdWx0cyB0byBgJ2luamVjdGVkLXN0eWxlc2hlZXQtJ2AuXG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmNzc0luamVjdG9yLmlkUHJlZml4ID0gJ2luamVjdGVkLXN0eWxlc2hlZXQtJztcblxuLy8gSW50ZXJmYWNlXG5tb2R1bGUuZXhwb3J0cyA9IGNzc0luamVjdG9yO1xuIiwiLy8gdGVtcGxleCBub2RlIG1vZHVsZVxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2pvbmVpdC90ZW1wbGV4XG5cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuXG4vKipcbiAqIE1lcmdlcyB2YWx1ZXMgb2YgZXhlY3V0aW9uIGNvbnRleHQgcHJvcGVydGllcyBuYW1lZCBpbiB0ZW1wbGF0ZSBieSB7cHJvcDF9LFxuICoge3Byb3AyfSwgZXRjLiwgb3IgYW55IGphdmFzY3JpcHQgZXhwcmVzc2lvbiBpbmNvcnBvcmF0aW5nIHN1Y2ggcHJvcCBuYW1lcy5cbiAqIFRoZSBjb250ZXh0IGFsd2F5cyBpbmNsdWRlcyB0aGUgZ2xvYmFsIG9iamVjdC4gSW4gYWRkaXRpb24geW91IGNhbiBzcGVjaWZ5IGEgc2luZ2xlXG4gKiBjb250ZXh0IG9yIGFuIGFycmF5IG9mIGNvbnRleHRzIHRvIHNlYXJjaCAoaW4gdGhlIG9yZGVyIGdpdmVuKSBiZWZvcmUgZmluYWxseVxuICogc2VhcmNoaW5nIHRoZSBnbG9iYWwgY29udGV4dC5cbiAqXG4gKiBNZXJnZSBleHByZXNzaW9ucyBjb25zaXN0aW5nIG9mIHNpbXBsZSBudW1lcmljIHRlcm1zLCBzdWNoIGFzIHswfSwgezF9LCBldGMuLCBkZXJlZlxuICogdGhlIGZpcnN0IGNvbnRleHQgZ2l2ZW4sIHdoaWNoIGlzIGFzc3VtZWQgdG8gYmUgYW4gYXJyYXkuIEFzIGEgY29udmVuaWVuY2UgZmVhdHVyZSxcbiAqIGlmIGFkZGl0aW9uYWwgYXJncyBhcmUgZ2l2ZW4gYWZ0ZXIgYHRlbXBsYXRlYCwgYGFyZ3VtZW50c2AgaXMgdW5zaGlmdGVkIG9udG8gdGhlIGNvbnRleHRcbiAqIGFycmF5LCB0aHVzIG1ha2luZyBmaXJzdCBhZGRpdGlvbmFsIGFyZyBhdmFpbGFibGUgYXMgezF9LCBzZWNvbmQgYXMgezJ9LCBldGMuLCBhcyBpblxuICogYHRlbXBsZXgoJ0hlbGxvLCB7MX0hJywgJ1dvcmxkJylgLiAoezB9IGlzIHRoZSB0ZW1wbGF0ZSBzbyBjb25zaWRlciB0aGlzIHRvIGJlIDEtYmFzZWQuKVxuICpcbiAqIElmIHlvdSBwcmVmZXIgc29tZXRoaW5nIG90aGVyIHRoYW4gYnJhY2VzLCByZWRlZmluZSBgdGVtcGxleC5yZWdleHBgLlxuICpcbiAqIFNlZSB0ZXN0cyBmb3IgZXhhbXBsZXMuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRlbXBsYXRlXG4gKiBAcGFyYW0gey4uLnN0cmluZ30gW2FyZ3NdXG4gKi9cbmZ1bmN0aW9uIHRlbXBsZXgodGVtcGxhdGUpIHtcbiAgICB2YXIgY29udGV4dHMgPSB0aGlzIGluc3RhbmNlb2YgQXJyYXkgPyB0aGlzIDogW3RoaXNdO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkgeyBjb250ZXh0cy51bnNoaWZ0KGFyZ3VtZW50cyk7IH1cbiAgICByZXR1cm4gdGVtcGxhdGUucmVwbGFjZSh0ZW1wbGV4LnJlZ2V4cCwgdGVtcGxleC5tZXJnZXIuYmluZChjb250ZXh0cykpO1xufVxuXG50ZW1wbGV4LnJlZ2V4cCA9IC9cXHsoLio/KVxcfS9nO1xuXG50ZW1wbGV4LndpdGggPSBmdW5jdGlvbiAoaSwgcykge1xuICAgIHJldHVybiAnd2l0aCh0aGlzWycgKyBpICsgJ10peycgKyBzICsgJ30nO1xufTtcblxudGVtcGxleC5jYWNoZSA9IFtdO1xuXG50ZW1wbGV4LmRlcmVmID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICghKHRoaXMubGVuZ3RoIGluIHRlbXBsZXguY2FjaGUpKSB7XG4gICAgICAgIHZhciBjb2RlID0gJ3JldHVybiBldmFsKGV4cHIpJztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGNvZGUgPSB0ZW1wbGV4LndpdGgoaSwgY29kZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZW1wbGV4LmNhY2hlW3RoaXMubGVuZ3RoXSA9IGV2YWwoJyhmdW5jdGlvbihleHByKXsnICsgY29kZSArICd9KScpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV2YWxcbiAgICB9XG4gICAgcmV0dXJuIHRlbXBsZXguY2FjaGVbdGhpcy5sZW5ndGhdLmNhbGwodGhpcywga2V5KTtcbn07XG5cbnRlbXBsZXgubWVyZ2VyID0gZnVuY3Rpb24gKG1hdGNoLCBrZXkpIHtcbiAgICAvLyBBZHZhbmNlZCBmZWF0dXJlczogQ29udGV4dCBjYW4gYmUgYSBsaXN0IG9mIGNvbnRleHRzIHdoaWNoIGFyZSBzZWFyY2hlZCBpbiBvcmRlci5cbiAgICB2YXIgcmVwbGFjZW1lbnQ7XG5cbiAgICB0cnkge1xuICAgICAgICByZXBsYWNlbWVudCA9IGlzTmFOKGtleSkgPyB0ZW1wbGV4LmRlcmVmLmNhbGwodGhpcywga2V5KSA6IHRoaXNbMF1ba2V5XTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlcGxhY2VtZW50ID0gJ3snICsga2V5ICsgJ30nO1xuICAgIH1cblxuICAgIHJldHVybiByZXBsYWNlbWVudDtcbn07XG5cbi8vIHRoaXMgaW50ZXJmYWNlIGNvbnNpc3RzIHNvbGVseSBvZiB0aGUgdGVtcGxleCBmdW5jdGlvbiAoYW5kIGl0J3MgcHJvcGVydGllcylcbm1vZHVsZS5leHBvcnRzID0gdGVtcGxleDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50LWVudiBub2RlLCBicm93c2VyICovXG5cbmlmICghd2luZG93Lkxpc3REcmFnb24pIHtcbiAgICB3aW5kb3cuTGlzdERyYWdvbiA9IHJlcXVpcmUoJy4vJyk7XG59XG4iLCIvLyBsaXN0LWRyYWdvbiBub2RlIG1vZHVsZVxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2pvbmVpdC9saXN0LWRyYWdvblxuXG4vKiBlc2xpbnQtZW52IG5vZGUsIGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3NzSW5qZWN0b3IgPSByZXF1aXJlKCdjc3MtaW5qZWN0b3InKTtcbnZhciBmb3JtYXQgPSByZXF1aXJlKCd0ZW1wbGV4Jyk7XG5cbnZhciBSRVZFUlRfVE9fU1RZTEVTSEVFVF9WQUxVRSA9IG51bGw7ICAvLyBudWxsIHJlbW92ZXMgdGhlIHN0eWxlXG5cbnZhciB0cmFuc2Zvcm0sIHRpbWVyLCBzY3JvbGxWZWxvY2l0eSwgY3NzTGlzdERyYWdvbjtcblxuLyogaW5qZWN0OmNzcyAqL1xuY3NzTGlzdERyYWdvbiA9ICdkaXYuZHJhZ29uLWxpc3R7cG9zaXRpb246cmVsYXRpdmU7YmFja2dyb3VuZC1jb2xvcjojZmZmfWRpdi5kcmFnb24tbGlzdD5kaXYsZGl2LmRyYWdvbi1saXN0PnVse3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDtyaWdodDowfWRpdi5kcmFnb24tbGlzdD5kaXZ7dGV4dC1hbGlnbjpjZW50ZXI7YmFja2dyb3VuZC1jb2xvcjojMDA3OTZiO2NvbG9yOiNmZmY7Ym94LXNoYWRvdzowIDNweCA2cHggcmdiYSgwLDAsMCwuMTYpLDAgM3B4IDZweCByZ2JhKDAsMCwwLC4yMyk7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcH1kaXYuZHJhZ29uLWxpc3Q+dWx7b3ZlcmZsb3cteTphdXRvO2JvdHRvbTowO21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2hhZG93OjAgMXB4IDNweCByZ2JhKDAsMCwwLC4xMiksMCAxcHggMnB4IHJnYmEoMCwwLDAsLjI0KX1kaXYuZHJhZ29uLWxpc3Q+dWw+bGksbGkuZHJhZ29uLXBvcHt3aGl0ZS1zcGFjZTpub3dyYXA7bGlzdC1zdHlsZS10eXBlOm5vbmU7Ym9yZGVyOjAgc29saWQgI2Y0ZjRmNDtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjZTBlMGUwO2N1cnNvcjptb3ZlO3RyYW5zaXRpb246Ym9yZGVyLXRvcC13aWR0aCAuMnN9ZGl2LmRyYWdvbi1saXN0PnVsPmxpOmxhc3QtY2hpbGR7aGVpZ2h0OjA7Ym9yZGVyLWJvdHRvbTpub25lfWxpLmRyYWdvbi1wb3B7cG9zaXRpb246Zml4ZWQ7YmFja2dyb3VuZC1jb2xvcjojZmZmO2JvcmRlcjoxcHggc29saWQgI2UwZTBlMDtsZWZ0OjA7dG9wOjA7b3ZlcmZsb3cteDpoaWRkZW47Ym94LXNoYWRvdzpyZ2JhKDAsMCwwLC4xODgyMzUpIDAgMTBweCAyMHB4LHJnYmEoMCwwLDAsLjIyNzQ1MSkgMCA2cHggNnB4fSc7XG4vKiBlbmRpbmplY3QgKi9cblxuLyoqXG4gKiBAY29uc3RydWN0b3IgTGlzdERyYWdvblxuICpcbiAqIEBkZXNjIFRoaXMgb2JqZWN0IHNlcnZpY2VzIGEgc2V0IG9mIGl0ZW0gbGlzdHMgdGhhdCBhbGxvdyBkcmFnZ2luZyBhbmQgZHJvcHBpbmcgaXRlbXMgd2l0aGluIGFuZCBiZXR3ZWVuIGxpc3RzIGluIGEgc2V0LlxuICpcbiAqIFR3byBzdHJhdGVnaWVzIGFyZSBzdXBwb3J0ZWQ6XG4gKlxuICogMS4gU3VwcGx5IHlvdXIgb3duIEhUTUwgbWFya3VwIGFuZCBsZXQgdGhlIEFQSSBidWlsZCB0aGUgaXRlbSBtb2RlbHMgZm9yIHlvdS5cbiAqICAgIFRvIHVzZSB0aGlzIHN0cmF0ZWd5LCBzY3JpcHQgeW91ciBIVE1MIGFuZCBwcm92aWRlIG9uZSBvZiB0aGVzZTpcbiAqICAgICogYW4gYXJyYXkgb2YgYWxsIHRoZSBsaXN0IGl0ZW0gKGA8bGk+YCkgdGFnc1xuICogICAgKiBhIENTUyBzZWxlY3RvciB0aGF0IHBvaW50cyB0byBhbGwgdGhlIGxpc3QgaXRlbSB0YWdzXG4gKiAyLiBTdXBwbHkgeW91ciBvd24gaXRlbSBtb2RlbHMgYW5kIGxldCB0aGUgQVBJIGJ1aWxkIHRoZSBIVE1MIG1hcmt1cCBmb3IgeW91LlxuICogICAgVG8gdXNlIHRoaXMgc3RyYXRlZ3ksIHByb3ZpZGUgYW4gYXJyYXkgb2YgbW9kZWwgbGlzdHMuXG4gKlxuICogVGhlIG5ldyBMaXN0RHJhZ29uIG9iamVjdCdzIGBtb2RlbExpc3RzYCBwcm9wZXJ0eSByZWZlcmVuY2VzIHRoZSBhcnJheSBvZiBtb2RlbCBsaXN0cyB0aGUgQVBJIGNvbnN0cnVjdGVkIGZvciB5b3UgaW4gc3RyYXRlZ3kgIzEgb3IgdGhlIGFycmF5IG9mIG1vZGVsIGxpc3RzIHlvdSBzdXBwbGllZCBmb3Igc3RyYXRlZ3kgIzIuXG4gKlxuICogQWZ0ZXIgdGhlIHVzZXIgcGVyZm9ybXMgYSBzdWNjZXNzZnVsIGRyYWctYW5kLWRyb3Agb3BlcmF0aW9uLCB0aGUgcG9zaXRpb24gb2YgdGhlIG1vZGVsIHJlZmVyZW5jZXMgd2l0aGluIHRoZSBgbW9kZWxMaXN0c2AgYXJyYXkgaXMgcmVhcnJhbmdlZC4gKFRoZSBtb2RlbHMgdGhlbXNlbHZlcyBhcmUgdGhlIG9yaWdpbmFsIG9iamVjdHMgYXMgc3VwcGxpZWQgaW4gdGhlIG1vZGVsIGxpc3RzOyB0aGV5IGFyZSBub3QgcmVidWlsdCBvciBhbHRlcmVkIGluIGFueSB3YXkuIEp1c3QgdGhlIHJlZmVyZW5jZXMgdG8gdGhlbSBhcmUgbW92ZWQgYXJvdW5kLilcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xFbGVtZW50W118bW9kZWxMaXN0VHlwZVtdfSBzZWxlY3Rvck9yTW9kZWxMaXN0cyAtIFlvdSBtdXN0IHN1cHBseSBvbmUgb2YgdGhlIGl0ZW1zIGluICoqYm9sZCoqIGJlbG93OlxuICpcbiAqIDEuIF9Gb3Igc3RyYXRlZ3kgIzEgYWJvdmUgKEFQSSBjcmVhdGVzIG1vZGVscyBmcm9tIHN1cHBsaWVkIGVsZW1lbnRzKTpfIEFsbCB0aGUgbGlzdCBpdGVtIChgPGxpPmApIERPTSBlbGVtZW50cyBvZiBhbGwgdGhlIGxpc3RzIHlvdSB3YW50IHRoZSBuZXcgb2JqZWN0IHRvIG1hbmFnZSwgYXMgZWl0aGVyOlxuICogICAgMS4gKipBIENTUyBzZWxlY3RvcjsqKiBfb3JfXG4gKiAgICAyLiAqKkFuIGFycmF5IG9mIERPTSBlbGVtZW50cyoqXG4gKiAyLiBfRm9yIHN0cmF0ZWd5ICMyIGFib3ZlIChBUEkgY3JlYXRlcyBlbGVtZW50cyBmcm9tIHN1cHBsaWVkIG1vZGVscyk6XyAqKkFuIGFycmF5IG9mIG1vZGVsIGxpc3RzLCoqIGVhY2ggb2Ygd2hpY2ggaXMgaW4gb25lIG9mIHRoZSBmb2xsb3dpbmcgZm9ybXM6XG4gKiAgICAxLiBBbiBhcnJheSBvZiBpdGVtIG1vZGVscyAod2l0aCB2YXJpb3VzIG9wdGlvbiBwcm9wZXJ0aWVzIGhhbmdpbmcgb2ZmIG9mIGl0KTsgX2FuZC9vcl9cbiAqICAgIDIuIEEge0BsaW5rIG1vZGVsTGlzdFR5cGV9IG9iamVjdCB3aXRoIHRob3NlIHNhbWUgdmFyaW91cyBvcHRpb24gcHJvcGVydGllcyBpbmNsdWRpbmcgdGhlIHJlcXVpcmVkIGBtb2RlbHNgIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhhdCBzYW1lIGFycmF5IG9mIGl0ZW0gbW9kZWxzLlxuICpcbiAqIEluIGVpdGhlciBjYXNlICgyLjEgb3IgMi4yKSwgZWFjaCBlbGVtZW50IG9mIHN1Y2ggYXJyYXlzIG9mIGl0ZW0gbW9kZWxzIG1heSB0YWtlIHRoZSBmb3JtIG9mOlxuICogKiBBIHN0cmluZyBwcmltaXRpdmU7IF9vcl9cbiAqICogQSB7QGxpbmsgaXRlbU1vZGVsVHlwZX0gb2JqZWN0IHdpdGggYSB2YXJpb3VzIG9wdGlvbiBwcm9wZXJ0aWVzIGluY2x1ZGluZyB0aGUgcmVxdWlyZWQgYGxhYmVsYCBwcm9wZXJ0eSBjb250YWluaW5nIGEgc3RyaW5nIHByaW1pdGl2ZS5cbiAqXG4gKiBSZWdhcmRpbmcgdGhlc2Ugc3RyaW5nIHByaW1pdGl2ZXMsIGVhY2ggaXMgZWl0aGVyOlxuICogKiBBIHN0cmluZyB0byBiZSBkaXNwbGF5ZWQgaW4gdGhlIGxpc3QgaXRlbTsgX29yX1xuICogKiBBIGZvcm1hdCBzdHJpbmcgd2l0aCBvdGhlciBwcm9wZXJ0eSB2YWx1ZXMgbWVyZ2VkIGluLCB0aGUgcmVzdWx0IG9mIHdoaWNoIGlzIHRvIGJlIGRpc3BsYXllZCBpbiB0aGUgbGlzdCBpdGVtLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucz17fV0gLSBZb3UgbWF5IHN1cHBseSBcImdsb2JhbFwiIHRlbXBsYXRlIHZhcmlhYmxlcyBoZXJlLCByZXByZXNlbnRpbmcgdGhlIFwib3V0ZXIgc2NvcGUsXCIgYWZ0ZXIgZmlyc3Qgc2VhcmNoaW5nIGVhY2ggbW9kZWwgYW5kIHRoZW4gZWFjaCBtb2RlbCBsaXN0LlxuICogQHBhcmFtIHt1bmRlZmluZWR8bnVsbHxFbGVtZW50fHN0cmluZ30gW2Nzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50XSAtIERldGVybWluZXMgd2hlcmUgdG8gaW5zZXJ0IHRoZSBzdHlsZXNoZWV0LiAoVGhpcyBpcyB0aGUgb25seSBmb3JtYWwgb3B0aW9uLikgUGFzc2VkIHRvIGNzcy1pbmplY3RvciwgdGhlIG92ZXJsb2FkcyBhcmUgKGZyb20gY3NzLWluamVjdG9yIGRvY3MpOlxuICogKiBgdW5kZWZpbmVkYCB0eXBlIChvciBvbWl0dGVkKTogaW5qZWN0cyBzdHlsZXNoZWV0IGF0IHRvcCBvZiBgPGhlYWQ+Li4uPC9oZWFkPmAgZWxlbWVudFxuICogKiBgbnVsbGAgdmFsdWU6IGluamVjdHMgc3R5bGVzaGVldCBhdCBib3R0b20gb2YgYDxoZWFkPi4uLjwvaGVhZD5gIGVsZW1lbnRcbiAqICogYEVsZW1lbnRgIHR5cGU6IGluamVjdHMgc3R5bGVzaGVldCBpbW1lZGlhdGVseSBiZWZvcmUgZ2l2ZW4gZWxlbWVudCwgd2hlcmV2ZXIgaXQgaXMgZm91bmQuXG4gKiAqIGBzdHJpbmdgIHR5cGU6IGluamVjdHMgc3R5bGVzaGVldCBpbW1lZGlhdGVseSBiZWZvcmUgZ2l2ZW4gZmlyc3QgZWxlbWVudCBmb3VuZCB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIGNzcyBzZWxlY3Rvci5cbiAqL1xuZnVuY3Rpb24gTGlzdERyYWdvbihzZWxlY3Rvck9yTW9kZWxMaXN0cywgb3B0aW9ucykge1xuXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIExpc3REcmFnb24pKSB7XG4gICAgICAgIHRocm93IGVycm9yKCdOb3QgY2FsbGVkIHdpdGggXCJuZXdcIiBrZXl3b3JkLicpO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcywgbW9kZWxMaXN0cywgaXRlbXM7XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmICh0eXBlb2Ygc2VsZWN0b3JPck1vZGVsTGlzdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGl0ZW1zID0gdG9BcnJheShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yT3JNb2RlbExpc3RzKSk7XG4gICAgICAgIG1vZGVsTGlzdHMgPSBjcmVhdGVNb2RlbExpc3RzRnJvbUxpc3RFbGVtZW50cyhpdGVtcyk7XG4gICAgfSBlbHNlIGlmIChzZWxlY3Rvck9yTW9kZWxMaXN0c1swXSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgaXRlbXMgPSB0b0FycmF5KHNlbGVjdG9yT3JNb2RlbExpc3RzKTtcbiAgICAgICAgbW9kZWxMaXN0cyA9IGNyZWF0ZU1vZGVsTGlzdHNGcm9tTGlzdEVsZW1lbnRzKGl0ZW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBwYXJhbSBpcyBhcnJheSBvZiBtb2RlbCBsaXN0c1xuICAgICAgICAvLyBidWlsZCBuZXcgPHVsPiBlbGVtZW50KHMpIGZvciBlYWNoIGxpc3QgYW5kIHB1dCBpbiBgLm1vZGVsTGlzdHNgO1xuICAgICAgICAvLyBmaWxsIGAuaXRlbXNgIGFycmF5IHdpdGggPGxpPiBlbGVtZW50cyBmcm9tIHRoZXNlIG5ldyA8dWw+IGVsZW1lbnRzXG4gICAgICAgIGl0ZW1zID0gW107XG4gICAgICAgIG1vZGVsTGlzdHMgPSBjcmVhdGVMaXN0RWxlbWVudHNGcm9tTW9kZWxMaXN0cyhzZWxlY3Rvck9yTW9kZWxMaXN0cywgb3B0aW9ucyk7XG4gICAgICAgIG1vZGVsTGlzdHMuZm9yRWFjaChmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICAgICAgaXRlbXMgPSBpdGVtcy5jb25jYXQodG9BcnJheShsaXN0LmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnbGknKSkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBncmFiIHdoZWVsIGV2ZW50cyBhbmQgZG9uJ3QgbGV0ICdlbSBidWJibGVcbiAgICBtb2RlbExpc3RzLmZvckVhY2goZnVuY3Rpb24gKG1vZGVsTGlzdCkge1xuICAgICAgICBtb2RlbExpc3QuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd3aGVlbCcsIGNhcHR1cmVFdmVudCk7XG4gICAgfSk7XG5cbiAgICBpdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtRWxlbWVudCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGl0ZW0gPSAoaXRlbUVsZW1lbnQgIT09IGl0ZW1FbGVtZW50LnBhcmVudEVsZW1lbnQubGFzdEVsZW1lbnRDaGlsZClcbiAgICAgICAgICAgID8gc2VsZi5hZGRFdnQoaXRlbUVsZW1lbnQsICdtb3VzZWRvd24nLCBpdGVtRWxlbWVudCwgdHJ1ZSlcbiAgICAgICAgICAgIDogeyBlbGVtZW50OiBpdGVtRWxlbWVudCB9O1xuXG4gICAgICAgIC8qIGBpdGVtLm1vZGVsYCBub3QgY3VycmVudGx5IG5lZWRlZCBzbyBjb21tZW50ZWQgb3V0IGhlcmUuXG4gICAgICAgICAqIChPcmlnaW5hbGx5IHVzZWQgZm9yIHJlYnVpbGRpbmcgbW9kZWxMaXN0cyBmb3IgZmluYWxcbiAgICAgICAgICogcmVwb3J0aW5nLCBtb2RlbExpc3RzIGFyZSBub3cgc3BsaWNlZCBvbiBldmVyeSBzdWNjZXNzZnVsXG4gICAgICAgICAqIGRyYWctYW5kLWRyb3Agb3BlcmF0aW9uIHNvIHRoZXkncmUgYWx3YXlzIHVwIHRvIGRhdGUuKVxuXG4gICAgICAgICB2YXIgb3JpZ2luID0gdGhpcy5pdGVtQ29vcmRpbmF0ZXMoaXRlbUVsZW1lbnQpO1xuICAgICAgICAgaXRlbS5tb2RlbCA9IHRoaXMubW9kZWxMaXN0c1tvcmlnaW4ubGlzdF0ubW9kZWxzW29yaWdpbi5pdGVtXTtcblxuICAgICAgICAgKi9cblxuICAgICAgICBpdGVtc1tpbmRleF0gPSBpdGVtO1xuICAgIH0pO1xuXG4gICAgdHJhbnNmb3JtID0gJ3RyYW5zZm9ybScgaW4gaXRlbXNbMF0uZWxlbWVudC5zdHlsZVxuICAgICAgICA/ICd0cmFuc2Zvcm0nIC8vIENocm9tZSA0NSBhbmQgRmlyZWZveCA0MFxuICAgICAgICA6ICctd2Via2l0LXRyYW5zZm9ybSc7IC8vIFNhZmFyaSA4XG5cbiAgICAvLyBzZXQgdXAgdGhlIG5ldyBvYmplY3RcbiAgICB0aGlzLm1vZGVsTGlzdHMgPSBtb2RlbExpc3RzO1xuICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcbiAgICB0aGlzLmJpbmRpbmdzID0ge307XG4gICAgdGhpcy5jYWxsYmFjayA9IHt9O1xuXG4gICAgY3NzSW5qZWN0b3IoY3NzTGlzdERyYWdvbiwgJ2xpc3QtZHJhZ29uLWJhc2UnLCBvcHRpb25zLmNzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50KTtcblxufVxuXG5MaXN0RHJhZ29uLnByb3RvdHlwZSA9IHtcblxuICAgIGFkZEV2dDogZnVuY3Rpb24gKHRhcmdldCwgdHlwZSwgbGlzdGVuZXIsIGRvTm90QmluZCkge1xuICAgICAgICB2YXIgYmluZGluZyA9IHtcbiAgICAgICAgICAgIGhhbmRsZXI6IGhhbmRsZXJzW3R5cGVdLmJpbmQodGFyZ2V0LCB0aGlzKSxcbiAgICAgICAgICAgIGVsZW1lbnQ6IGxpc3RlbmVyIHx8IHdpbmRvd1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghZG9Ob3RCaW5kKSB7XG4gICAgICAgICAgICB0aGlzLmJpbmRpbmdzW3R5cGVdID0gYmluZGluZztcbiAgICAgICAgfVxuXG4gICAgICAgIGJpbmRpbmcuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGJpbmRpbmcuaGFuZGxlcik7XG5cbiAgICAgICAgcmV0dXJuIGJpbmRpbmc7XG4gICAgfSxcblxuICAgIHJlbW92ZUV2dDogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgdmFyIGJpbmRpbmcgPSB0aGlzLmJpbmRpbmdzW3R5cGVdO1xuICAgICAgICBkZWxldGUgdGhpcy5iaW5kaW5nc1t0eXBlXTtcbiAgICAgICAgYmluZGluZy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgYmluZGluZy5oYW5kbGVyKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQWxsRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gcmVtb3ZlIGRyYWcgJiBkcm9wIGV2ZW50cyAobW91c2Vtb3ZlLCBtb3VzZXVwLCBhbmQgdHJhbnNpdGlvbmVuZClcbiAgICAgICAgZm9yICh2YXIgdHlwZSBpbiB0aGlzLmJpbmRpbmdzKSB7XG4gICAgICAgICAgICB2YXIgYmluZGluZyA9IHRoaXMuYmluZGluZ3NbdHlwZV07XG4gICAgICAgICAgICBiaW5kaW5nLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBiaW5kaW5nLmhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJlbW92ZSB0aGUgbW91c2Vkb3duIGV2ZW50cyBmcm9tIGFsbCBsaXN0IGl0ZW1zXG4gICAgICAgIHRoaXMuaXRlbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgaWYgKGl0ZW0uaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGl0ZW0uZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBpdGVtLmhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gd2hlZWwgZXZlbnRzIG9uIHRoZSBsaXN0IGVsZW1lbnRzXG4gICAgICAgIHRoaXMubW9kZWxMaXN0cy5mb3JFYWNoKGZ1bmN0aW9uIChtb2RlbExpc3QpIHtcbiAgICAgICAgICAgIG1vZGVsTGlzdC5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3doZWVsJywgY2FwdHVyZUV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHBvaW50SW5MaXN0UmVjdHM6IGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb2RlbExpc3RzLmZpbmQoZnVuY3Rpb24gKG1vZGVsTGlzdCkge1xuICAgICAgICAgICAgdmFyIHJlY3QgPSBtb2RlbExpc3QuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICAgICAgcmVjdCA9IHtcbiAgICAgICAgICAgICAgICBsZWZ0OiAgIHdpbmRvdy5zY3JvbGxYICsgcmVjdC5sZWZ0LFxuICAgICAgICAgICAgICAgIHRvcDogICAgd2luZG93LnNjcm9sbFkgKyByZWN0LnRvcCxcbiAgICAgICAgICAgICAgICByaWdodDogIHdpbmRvdy5zY3JvbGxYICsgcmVjdC5yaWdodCxcbiAgICAgICAgICAgICAgICBib3R0b206IHdpbmRvdy5zY3JvbGxZICsgcmVjdC5ib3R0b20sXG4gICAgICAgICAgICAgICAgd2lkdGg6ICByZWN0LndpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodDogcmVjdC5oZWlnaHRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIG1vZGVsTGlzdC5yZWN0ID0gcmVjdDtcblxuICAgICAgICAgICAgaWYgKHBvaW50SW5SZWN0KHBvaW50LCByZWN0KSkge1xuICAgICAgICAgICAgICAgIG1vZGVsTGlzdC5yZWN0ID0gcmVjdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gZm91bmRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcG9pbnRJbkl0ZW1SZWN0czogZnVuY3Rpb24gKHBvaW50LCBleGNlcHQxLCBleGNlcHQyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmZpbmQoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gaXRlbS5lbGVtZW50O1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICBlbGVtZW50ICE9PSBleGNlcHQxICYmXG4gICAgICAgICAgICAgICAgZWxlbWVudCAhPT0gZXhjZXB0MiAmJlxuICAgICAgICAgICAgICAgIHBvaW50SW5SZWN0KHBvaW50LCBpdGVtLnJlY3QpXG4gICAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gZ2V0IHBvc2l0aW9ucyBvZiBhbGwgbGlzdCBpdGVtcyBpbiBwYWdlIGNvb3JkcyAobm9ybWFsaXplZCBmb3Igd2luZG93IGFuZCBsaXN0IHNjcm9sbGluZylcbiAgICBnZXRBbGxJdGVtQm91bmRpbmdSZWN0czogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbW9kZWxMaXN0cyA9IHRoaXMubW9kZWxMaXN0cywgaGVpZ2h0O1xuICAgICAgICB0aGlzLml0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBpdGVtRWxlbWVudCA9IGl0ZW0uZWxlbWVudCxcbiAgICAgICAgICAgICAgICBsaXN0RWxlbWVudCA9IGl0ZW1FbGVtZW50LnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgbGlzdCA9IG1vZGVsTGlzdHMuZmluZChmdW5jdGlvbiAobGlzdCkgeyByZXR1cm4gbGlzdC5lbGVtZW50ID09PSBsaXN0RWxlbWVudDsgfSk7XG5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAvLyBvbWl0dGVkOiBkZWZhdWx0IHRvIHRydWVcbiAgICAgICAgICAgICAgICBsaXN0LmlzRHJvcFRhcmdldCA9PT0gdW5kZWZpbmVkIHx8XG5cbiAgICAgICAgICAgICAgICAvLyBmdW5jdGlvbjogdXNlIHJldHVybiB2YWx1ZVxuICAgICAgICAgICAgICAgIHR5cGVvZiBsaXN0LmlzRHJvcFRhcmdldCA9PT0gJ2Z1bmN0aW9uJyAmJiBsaXN0LmlzRHJvcFRhcmdldCgpIHx8XG5cbiAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2U6IHVzZSB0cnV0aGluZXNzIG9mIGdpdmVuIHZhbHVlXG4gICAgICAgICAgICAgICAgbGlzdC5pc0Ryb3BUYXJnZXRcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHZhciByZWN0ID0gaXRlbUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbSA9IHJlY3QuYm90dG9tO1xuXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW1FbGVtZW50ID09PSBsaXN0RWxlbWVudC5sYXN0RWxlbWVudENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbSA9IGxpc3RFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmJvdHRvbTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvdHRvbSA8IHJlY3QudG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3R0b20gPSByZWN0LnRvcCArIChoZWlnaHQgfHwgNTApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVjdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogICB3aW5kb3cuc2Nyb2xsWCArIHJlY3QubGVmdCxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6ICB3aW5kb3cuc2Nyb2xsWCArIHJlY3QucmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogICAgd2luZG93LnNjcm9sbFkgKyByZWN0LnRvcCAgICArIGxpc3RFbGVtZW50LnNjcm9sbFRvcCxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiB3aW5kb3cuc2Nyb2xsWSArIGJvdHRvbSArIGxpc3RFbGVtZW50LnNjcm9sbFRvcFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpdGVtLnJlY3QgPSByZWN0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVpbnNlcnQ6IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICAgICAgdmFyIHN0eWxlID0gdGFyZ2V0LnN0eWxlO1xuICAgICAgICBzdHlsZS53aWR0aCA9IHN0eWxlW3RyYW5zZm9ybV0gPSBzdHlsZS50cmFuc2l0aW9uID0gUkVWRVJUX1RPX1NUWUxFU0hFRVRfVkFMVUU7XG5cbiAgICAgICAgdGFyZ2V0LmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdvbi1wb3AnKTtcblxuICAgICAgICB0aGlzLmRyb3Auc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gJzBzJztcbiAgICAgICAgdGhpcy5kcm9wLnN0eWxlLmJvcmRlclRvcFdpZHRoID0gUkVWRVJUX1RPX1NUWUxFU0hFRVRfVkFMVUU7XG4gICAgICAgIHRoaXMuZHJvcC5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZSh0YXJnZXQsIHRoaXMuZHJvcCk7XG5cbiAgICAgICAgZGVsZXRlIHRoaXMuZHJvcDtcbiAgICB9LFxuXG4gICAgLy8gcmV0dXJuIGFuIG9iamVjdCB7IGl0ZW06IDxpdGVtIGluZGV4IHdpdGhpbiBsaXN0PiwgbGlzdDogPGxpc3QgaW5kZXggd2l0aGluIGxpc3Qgb2YgbGlzdHM+IH1cbiAgICBpdGVtQ29vcmRpbmF0ZXM6IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHZhciBsaXN0RWxlbWVudCA9IGl0ZW0ucGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgIGNvb3JkcyA9IHsgaXRlbTogMCB9O1xuXG4gICAgICAgIHdoaWxlICgoaXRlbSA9IGl0ZW0ucHJldmlvdXNFbGVtZW50U2libGluZykpIHtcbiAgICAgICAgICAgICsrY29vcmRzLml0ZW07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1vZGVsTGlzdHMuZmluZChmdW5jdGlvbiAobGlzdCwgaW5kZXgpIHtcbiAgICAgICAgICAgIGNvb3Jkcy5saXN0ID0gaW5kZXg7XG4gICAgICAgICAgICByZXR1cm4gbGlzdC5lbGVtZW50ID09PSBsaXN0RWxlbWVudDsgLy8gc3RvcCB3aGVuIHdlIGZpbmQgdGhlIG9uZSB3ZSBiZWxvbmcgdG9cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGNvb3JkcztcbiAgICB9XG5cbn07XG5cbnZhciBoYW5kbGVycyA9IHtcbiAgICBtb3VzZWRvd246IGZ1bmN0aW9uIChkcmFnb24sIGV2dCkge1xuXG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7ICAvL3ByZXZlbnRzIHVzZXIgc2VsZWN0aW9uIG9mIHJlbmRlcmVkIG5vZGVzIGR1cmluZyBkcmFnXG5cbiAgICAgICAgaWYgKGRyYWdvbi5kcm9wKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVjdCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgZHJhZ29uLnJlY3QgPSByZWN0ID0ge1xuICAgICAgICAgICAgbGVmdDogICBNYXRoLnJvdW5kKHJlY3QubGVmdCAtIDEpLFxuICAgICAgICAgICAgdG9wOiAgICBNYXRoLnJvdW5kKHJlY3QudG9wIC0gMSksXG4gICAgICAgICAgICByaWdodDogIE1hdGgucm91bmQocmVjdC5yaWdodCksXG4gICAgICAgICAgICBib3R0b206IE1hdGgucm91bmQocmVjdC5ib3R0b20pLFxuICAgICAgICAgICAgd2lkdGg6ICBNYXRoLnJvdW5kKHJlY3Qud2lkdGgpLFxuICAgICAgICAgICAgaGVpZ2h0OiBNYXRoLnJvdW5kKHJlY3QuaGVpZ2h0KVxuICAgICAgICB9O1xuXG4gICAgICAgIGRyYWdvbi5waW4gPSB7XG4gICAgICAgICAgICB4OiB3aW5kb3cuc2Nyb2xsWCArIGV2dC5jbGllbnRYLFxuICAgICAgICAgICAgeTogd2luZG93LnNjcm9sbFkgKyBldnQuY2xpZW50WVxuICAgICAgICB9O1xuXG4gICAgICAgIGRyYWdvbi5vcmlnaW4gPSBkcmFnb24uaXRlbUNvb3JkaW5hdGVzKHRoaXMpO1xuXG4gICAgICAgIGlmIChkcmFnb24uY2FsbGJhY2suZ3JhYmJlZCkge1xuICAgICAgICAgICAgZHJhZ29uLmNhbGxiYWNrLmdyYWJiZWQuY2FsbCh0aGlzLCBkcmFnb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJhZ29uLmdldEFsbEl0ZW1Cb3VuZGluZ1JlY3RzKCk7XG5cbiAgICAgICAgZHJhZ29uLmRyb3AgPSB0aGlzLm5leHRFbGVtZW50U2libGluZztcbiAgICAgICAgZHJhZ29uLmRyb3Auc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gJzBzJztcbiAgICAgICAgZHJhZ29uLmRyb3Auc3R5bGUuYm9yZGVyVG9wV2lkdGggPSByZWN0LmhlaWdodCArICdweCc7XG5cbiAgICAgICAgdGhpcy5zdHlsZS53aWR0aCA9IHJlY3Qud2lkdGggKyAncHgnO1xuICAgICAgICB0aGlzLnN0eWxlLnRyYW5zaXRpb25EdXJhdGlvbiA9ICcwcyc7XG4gICAgICAgIHRoaXMuc3R5bGVbdHJhbnNmb3JtXSA9IHRyYW5zbGF0ZShcbiAgICAgICAgICAgIHJlY3QubGVmdCAtIHdpbmRvdy5zY3JvbGxYLFxuICAgICAgICAgICAgcmVjdC50b3AgIC0gd2luZG93LnNjcm9sbFlcbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdkcmFnb24tcG9wJyk7XG4gICAgICAgIHRoaXMuc3R5bGUuekluZGV4ID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZHJhZ29uLm1vZGVsTGlzdHNbMF0uY29udGFpbmVyLnBhcmVudEVsZW1lbnQpLnpJbmRleDtcblxuICAgICAgICBpZiAoIWRyYWdvbi5jb250YWluZXIpIHtcbiAgICAgICAgICAgIC8vIHdhbGsgYmFjayB0byBjbG9zZXN0IHNoYWRvdyByb290IE9SIGJvZHkgdGFnIE9SIHJvb3QgdGFnXG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcztcbiAgICAgICAgICAgIHdoaWxlIChjb250YWluZXIucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lciA9IGNvbnRhaW5lci5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIFNoYWRvd1Jvb3QgIT09ICd1bmRlZmluZWQnICYmIGNvbnRhaW5lciBpbnN0YW5jZW9mIFNoYWRvd1Jvb3QgfHxcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnRhZ05hbWUgPT09ICdCT0RZJ1xuICAgICAgICAgICAgICAgICl7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRyYWdvbi5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgICAgIH1cblxuICAgICAgICBkcmFnb24uY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMpO1xuXG4gICAgICAgIHJlY3QubGVmdCAgICs9IHdpbmRvdy5zY3JvbGxYO1xuICAgICAgICByZWN0LnRvcCAgICArPSB3aW5kb3cuc2Nyb2xsWTtcbiAgICAgICAgcmVjdC5yaWdodCAgKz0gd2luZG93LnNjcm9sbFg7XG4gICAgICAgIHJlY3QuYm90dG9tICs9IHdpbmRvdy5zY3JvbGxZO1xuXG4gICAgICAgIGRyYWdvbi5hZGRFdnQodGhpcywgJ21vdXNlbW92ZScpO1xuICAgICAgICBkcmFnb24uYWRkRXZ0KHRoaXMsICdtb3VzZXVwJyk7XG4gICAgfSxcblxuICAgIG1vdXNlbW92ZTogZnVuY3Rpb24gKGRyYWdvbiwgZXZ0KSB7XG4gICAgICAgIGRyYWdvbi5kcm9wLnN0eWxlLnRyYW5zaXRpb24gPSBSRVZFUlRfVE9fU1RZTEVTSEVFVF9WQUxVRTtcblxuICAgICAgICB2YXIgaG92ZXJMaXN0ID0gZHJhZ29uLnBvaW50SW5MaXN0UmVjdHMoeyB4OiBldnQuY2xpZW50WCwgeTogZXZ0LmNsaWVudFkgfSkgfHwgZHJhZ29uLm1vc3RSZWNlbnRIb3Zlckxpc3Q7XG5cbiAgICAgICAgaWYgKGhvdmVyTGlzdCkge1xuICAgICAgICAgICAgdmFyIGR4ID0gZXZ0LmNsaWVudFggLSBkcmFnb24ucGluLngsXG4gICAgICAgICAgICAgICAgZHkgPSBldnQuY2xpZW50WSAtIGRyYWdvbi5waW4ueTtcblxuICAgICAgICAgICAgZHJhZ29uLm1vc3RSZWNlbnRIb3Zlckxpc3QgPSBob3Zlckxpc3Q7XG5cbiAgICAgICAgICAgIHZhciBtYXhTY3JvbGxZID0gaG92ZXJMaXN0LmVsZW1lbnQuc2Nyb2xsSGVpZ2h0IC0gaG92ZXJMaXN0LnJlY3QuaGVpZ2h0LFxuICAgICAgICAgICAgICAgIHkgPSBldnQuY2xpZW50WSArIHdpbmRvdy5zY3JvbGxZLFxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZTtcblxuICAgICAgICAgICAgaWYgKG1heFNjcm9sbFkgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gbGlzdCBpcyBzY3JvbGxhYmxlIChpcyB0YWxsZXIgdGhhbiByZWN0KVxuICAgICAgICAgICAgICAgIGlmIChob3Zlckxpc3QuZWxlbWVudC5zY3JvbGxUb3AgPiAwICYmIChtYWduaXR1ZGUgPSB5IC0gKGhvdmVyTGlzdC5yZWN0LnRvcCArIDUpKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW91c2UgbmVhciBvciBhYm92ZSB0b3AgYW5kIGxpc3QgaXMgbm90IHNjcm9sbGVkIHRvIHRvcCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgcmVzZXRBdXRvU2Nyb2xsVGltZXIobWFnbml0dWRlLCAwLCBob3Zlckxpc3QuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChob3Zlckxpc3QuZWxlbWVudC5zY3JvbGxUb3AgPCBtYXhTY3JvbGxZICYmIChtYWduaXR1ZGUgPSB5IC0gKGhvdmVyTGlzdC5yZWN0LmJvdHRvbSAtIDEgLSA1KSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vdXNlIG5lYXIgb3IgYmVsb3cgYm90dG9tIGFuZCBsaXN0IG5vdCBzY3JvbGxlZCB0byBib3R0b20geWV0XG4gICAgICAgICAgICAgICAgICAgIHJlc2V0QXV0b1Njcm9sbFRpbWVyKG1hZ25pdHVkZSwgbWF4U2Nyb2xsWSwgaG92ZXJMaXN0LmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vdXNlIGluc2lkZVxuICAgICAgICAgICAgICAgICAgICByZXNldEF1dG9TY3JvbGxUaW1lcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG90aGVyID0gZHJhZ29uLnBvaW50SW5JdGVtUmVjdHMoe1xuICAgICAgICAgICAgICAgIHg6IGV2dC5jbGllbnRYLFxuICAgICAgICAgICAgICAgIHk6IGRyYWdvbi5yZWN0LmJvdHRvbSArIHdpbmRvdy5zY3JvbGxZICsgZHkgKyBob3Zlckxpc3QuZWxlbWVudC5zY3JvbGxUb3BcbiAgICAgICAgICAgIH0sIHRoaXMsIGRyYWdvbi5kcm9wKTtcblxuICAgICAgICAgICAgdGhpcy5zdHlsZVt0cmFuc2Zvcm1dID0gdHJhbnNsYXRlKFxuICAgICAgICAgICAgICAgIGRyYWdvbi5yZWN0LmxlZnQgLSB3aW5kb3cuc2Nyb2xsWCArIGR4LFxuICAgICAgICAgICAgICAgIGRyYWdvbi5yZWN0LnRvcCAtIHdpbmRvdy5zY3JvbGxZICsgZHlcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmIChvdGhlcikge1xuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50ID0gb3RoZXIuZWxlbWVudDtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLnRyYW5zaXRpb24gPSBSRVZFUlRfVE9fU1RZTEVTSEVFVF9WQUxVRTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLmJvcmRlclRvcFdpZHRoID0gZHJhZ29uLmRyb3Auc3R5bGUuYm9yZGVyVG9wV2lkdGg7XG4gICAgICAgICAgICAgICAgZHJhZ29uLmRyb3Auc3R5bGUuYm9yZGVyVG9wV2lkdGggPSBudWxsO1xuICAgICAgICAgICAgICAgIGRyYWdvbi5kcm9wID0gZWxlbWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBtb3VzZXVwOiBmdW5jdGlvbiAoZHJhZ29uLCBldnQpIHtcbiAgICAgICAgcmVzZXRBdXRvU2Nyb2xsVGltZXIoKTtcbiAgICAgICAgZHJhZ29uLnJlbW92ZUV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgIGRyYWdvbi5yZW1vdmVFdnQoJ21vdXNldXAnKTtcblxuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgdmFyIG5ld1JlY3QgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHdpbmRvdy5zY3JvbGxYICsgbmV3UmVjdC5sZWZ0ID09PSBkcmFnb24ucmVjdC5sZWZ0ICYmXG4gICAgICAgICAgICB3aW5kb3cuc2Nyb2xsWSArIG5ld1JlY3QudG9wID09PSBkcmFnb24ucmVjdC50b3BcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBkcmFnb24ucmVpbnNlcnQodGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZHJvcFJlY3QgPSBkcmFnb24uZHJvcC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICAgICAgZHJhZ29uLmFkZEV2dCh0aGlzLCAndHJhbnNpdGlvbmVuZCcsIHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSBSRVZFUlRfVE9fU1RZTEVTSEVFVF9WQUxVRTsgLy9yZXZlcnRzIHRvIDIwMG1zXG4gICAgICAgICAgICB0aGlzLnN0eWxlLnRyYW5zaXRpb25Qcm9wZXJ0eSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIHRoaXMuc3R5bGVbdHJhbnNmb3JtXSA9IHRyYW5zbGF0ZShcbiAgICAgICAgICAgICAgICBkcm9wUmVjdC5sZWZ0IC0gd2luZG93LnNjcm9sbFgsXG4gICAgICAgICAgICAgICAgZHJvcFJlY3QudG9wIC0gd2luZG93LnNjcm9sbFlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdHJhbnNpdGlvbmVuZDogZnVuY3Rpb24gKGRyYWdvbiwgZXZ0KSB7XG4gICAgICAgIGlmIChldnQucHJvcGVydHlOYW1lID09PSB0cmFuc2Zvcm0pIHtcbiAgICAgICAgICAgIGRyYWdvbi5yZW1vdmVFdnQoJ3RyYW5zaXRpb25lbmQnKTtcbiAgICAgICAgICAgIGRyYWdvbi5yZWluc2VydCh0aGlzKTtcblxuICAgICAgICAgICAgdGhpcy5zdHlsZS50cmFuc2l0aW9uUHJvcGVydHkgPSBSRVZFUlRfVE9fU1RZTEVTSEVFVF9WQUxVRTsgLy9yZXZlcnRzIHRvIGJvcmRlci10b3Atd2lkdGhcblxuICAgICAgICAgICAgdmFyIG9yaWdpbkxpc3QgPSBkcmFnb24ubW9kZWxMaXN0c1tkcmFnb24ub3JpZ2luLmxpc3RdO1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gb3JpZ2luTGlzdC5zcGxpY2UoZHJhZ29uLm9yaWdpbi5pdGVtLCAxKVswXTtcbiAgICAgICAgICAgIHZhciBkZXN0aW5hdGlvbiA9IGRyYWdvbi5pdGVtQ29vcmRpbmF0ZXModGhpcyk7XG4gICAgICAgICAgICB2YXIgZGVzdGluYXRpb25MaXN0ID0gZHJhZ29uLm1vZGVsTGlzdHNbZGVzdGluYXRpb24ubGlzdF07XG4gICAgICAgICAgICB2YXIgaW50ZXJMaXN0RHJvcCA9IG9yaWdpbkxpc3QgIT09IGRlc3RpbmF0aW9uTGlzdDtcbiAgICAgICAgICAgIHZhciBsaXN0Q2hhbmdlZCA9IGludGVyTGlzdERyb3AgfHwgZHJhZ29uLm9yaWdpbi5pdGVtICE9PSBkZXN0aW5hdGlvbi5pdGVtO1xuICAgICAgICAgICAgZGVzdGluYXRpb25MaXN0LnNwbGljZShkZXN0aW5hdGlvbi5pdGVtLCAwLCBtb2RlbCk7XG5cbiAgICAgICAgICAgIGlmIChsaXN0Q2hhbmdlZCkge1xuICAgICAgICAgICAgICAgIG9yaWdpbkxpc3QuZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdGNoYW5nZWQnKSk7XG4gICAgICAgICAgICAgICAgaWYgKGludGVyTGlzdERyb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25MaXN0LmVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RjaGFuZ2VkJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRyYWdvbi5jYWxsYmFjay5kcm9wcGVkKSB7XG4gICAgICAgICAgICAgICAgZHJhZ29uLmNhbGxiYWNrLmRyb3BwZWQuY2FsbCh0aGlzLCBkcmFnb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZnVuY3Rpb24gcmVzZXRBdXRvU2Nyb2xsVGltZXIobWFnbml0dWRlLCBsaW1pdCwgZWxlbWVudCkge1xuICAgIGlmICghbWFnbml0dWRlKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xuICAgICAgICBzY3JvbGxWZWxvY2l0eSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNoYW5nZURpcmVjdGlvbiA9XG4gICAgICAgICAgICBzY3JvbGxWZWxvY2l0eSAgPCAgMCAmJiBtYWduaXR1ZGUgID49IDAgfHxcbiAgICAgICAgICAgIHNjcm9sbFZlbG9jaXR5ID09PSAwICYmIG1hZ25pdHVkZSAhPT0gMCB8fFxuICAgICAgICAgICAgc2Nyb2xsVmVsb2NpdHkgID4gIDAgJiYgbWFnbml0dWRlICA8PSAwO1xuICAgICAgICBzY3JvbGxWZWxvY2l0eSA9IG1hZ25pdHVkZSA+IDAgPyBNYXRoLm1pbig1MCwgbWFnbml0dWRlKSA6IE1hdGgubWF4KC01MCwgbWFnbml0dWRlKTtcbiAgICAgICAgaWYgKGNoYW5nZURpcmVjdGlvbikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgICAgICB0aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uIChsaW1pdCkge1xuICAgICAgICAgICAgICAgIHZhciBzY3JvbGxUb3AgPSBlbGVtZW50LnNjcm9sbFRvcCArIHNjcm9sbFZlbG9jaXR5O1xuICAgICAgICAgICAgICAgIGlmIChzY3JvbGxWZWxvY2l0eSA8IDAgJiYgc2Nyb2xsVG9wIDwgbGltaXQgfHwgc2Nyb2xsVmVsb2NpdHkgPiAwICYmIHNjcm9sbFRvcCA+IGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2Nyb2xsVG9wID0gbGltaXQ7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2Nyb2xsVG9wID0gc2Nyb2xsVG9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEyNSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRvQXJyYXkoYXJyYXlMaWtlT2JqZWN0KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycmF5TGlrZU9iamVjdCk7XG59XG5cbmZ1bmN0aW9uIHBvaW50SW5SZWN0KHBvaW50LCByZWN0KSB7XG4gICAgcmV0dXJuIHJlY3QudG9wIDw9IHBvaW50LnkgJiYgcG9pbnQueSA8PSByZWN0LmJvdHRvbVxuICAgICAgICAmJiByZWN0LmxlZnQgPD0gcG9pbnQueCAmJiBwb2ludC54IDw9IHJlY3QucmlnaHQ7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZShsZWZ0LCB0b3ApIHtcbiAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnXG4gICAgICAgICsgTWF0aC5mbG9vcihsZWZ0ICsgd2luZG93LnNjcm9sbFgpICsgJ3B4LCdcbiAgICAgICAgKyBNYXRoLmZsb29yKHRvcCArIHdpbmRvdy5zY3JvbGxZKSArICdweCknO1xufVxuXG5mdW5jdGlvbiBodG1sRW5jb2RlKHN0cmluZykge1xuICAgIHZhciB0ZXh0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZyk7XG5cbiAgICByZXR1cm4gZG9jdW1lbnRcbiAgICAgICAgLmNyZWF0ZUVsZW1lbnQoJ2EnKVxuICAgICAgICAuYXBwZW5kQ2hpbGQodGV4dE5vZGUpXG4gICAgICAgIC5wYXJlbnROb2RlXG4gICAgICAgIC5pbm5lckhUTUw7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBgPHVsPi4uLjwvdWw+YCBlbGVtZW50cyBhbmQgaW5zZXJ0cyB0aGVtIGludG8gYW4gYGVsZW1lbnRgIHByb3BlcnR5IG9uIGVhY2ggbW9kZWwuXG4gKiBAcGFyYW0ge29iamVjdH0gbW9kZWxMaXN0c1xuICogQHJldHVybnMgYG1vZGVsTGlzdHNgXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUxpc3RFbGVtZW50c0Zyb21Nb2RlbExpc3RzKG1vZGVsTGlzdHMsIG9wdGlvbnMpIHtcbiAgICB2YXIgdGVtcGxhdGVMYWJlbCA9IG9wdGlvbnMubGFiZWwgfHwgJ3tsYWJlbH0nO1xuXG4gICAgbW9kZWxMaXN0cy5mb3JFYWNoKGZ1bmN0aW9uIChtb2RlbExpc3QsIGxpc3RJbmRleCkge1xuICAgICAgICB2YXIgbGlzdExhYmVsID0gbW9kZWxMaXN0LmxhYmVsIHx8IHRlbXBsYXRlTGFiZWwsXG4gICAgICAgICAgICBsaXN0SHRtbEVuY29kZSA9IG1vZGVsTGlzdC5odG1sRW5jb2RlICE9PSB1bmRlZmluZWQgJiYgbW9kZWxMaXN0Lmh0bWxFbmNvZGUgfHwgb3B0aW9ucy5odG1sRW5jb2RlLFxuICAgICAgICAgICAgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgICAgICBsaXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG5cbiAgICAgICAgaWYgKG1vZGVsTGlzdC5tb2RlbHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG1vZGVsTGlzdCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gJ21vZGVscycpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxMaXN0Lm1vZGVsc1trZXldID0gbW9kZWxMaXN0W2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBtb2RlbExpc3RzW2xpc3RJbmRleF0gPSBtb2RlbExpc3QgPSBtb2RlbExpc3QubW9kZWxzO1xuICAgICAgICB9IGVsc2UgaWYgKG1vZGVsTGlzdCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBtb2RlbExpc3QubW9kZWxzID0gbW9kZWxMaXN0OyAvLyBwb2ludCB0byBzZWxmXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcignTGlzdCBbezF9XSBub3QgYW4gYXJyYXkgb2YgbW9kZWxzICh3aXRoIG9yIHdpdGhvdXQgYWRkaXRpb25hbCBwcm9wZXJ0aWVzKSBPUiAnICtcbiAgICAgICAgICAgICAgICAnYW4gb2JqZWN0ICh3aXRoIGEgYG1vZGVsc2AgcHJvcGVydHkgY29udGFpbmluZyBhbiBhcnJheSBvZiBtb2RlbHMpLicsIGxpc3RJbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICBtb2RlbExpc3QuZm9yRWFjaChmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgICAgIHZhciBtb2RlbExhYmVsID0gbW9kZWwubGFiZWwgfHwgbGlzdExhYmVsLFxuICAgICAgICAgICAgICAgIG1vZGVsSHRtbEVuY29kZSA9IG1vZGVsLmh0bWxFbmNvZGUgIT09IHVuZGVmaW5lZCAmJiBtb2RlbC5odG1sRW5jb2RlIHx8IGxpc3RIdG1sRW5jb2RlLFxuICAgICAgICAgICAgICAgIG1vZGVsT2JqZWN0ID0gdHlwZW9mIG1vZGVsID09PSAnb2JqZWN0JyA/IG1vZGVsIDogeyBsYWJlbDogbW9kZWx9LFxuICAgICAgICAgICAgICAgIGxhYmVsID0gZm9ybWF0LmNhbGwoW21vZGVsT2JqZWN0LCBtb2RlbExpc3QsIG9wdGlvbnNdLCBtb2RlbExhYmVsKSxcbiAgICAgICAgICAgICAgICBpdGVtRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cbiAgICAgICAgICAgIGl0ZW1FbGVtZW50LmlubmVySFRNTCA9IG1vZGVsSHRtbEVuY29kZSA/IGh0bWxFbmNvZGUobGFiZWwpIDogbGFiZWw7XG5cbiAgICAgICAgICAgIGxpc3RFbGVtZW50LmFwcGVuZENoaWxkKGl0ZW1FbGVtZW50KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYXBwZW5kIHRoZSBmaW5hbCBcImZlbmNlcG9zdFwiIGl0ZW0gLS0gZHJvcCB0YXJnZXQgYXQgYm90dG9tIG9mIGxpc3QgYWZ0ZXIgYWxsIGl0ZW1zXG4gICAgICAgIHZhciBpdGVtRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIGl0ZW1FbGVtZW50LmlubmVySFRNTCA9ICcmbmJzcDsnO1xuICAgICAgICBsaXN0RWxlbWVudC5hcHBlbmRDaGlsZChpdGVtRWxlbWVudCk7XG5cbiAgICAgICAgLy8gYXBwZW5kIGhlYWRlciB0byBjb250YWluZXJcbiAgICAgICAgaWYgKG1vZGVsTGlzdC50aXRsZSkge1xuICAgICAgICAgICAgdmFyIGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgaGVhZGVyLmlubmVySFRNTCA9IGxpc3RIdG1sRW5jb2RlID8gaHRtbEVuY29kZShtb2RlbExpc3QudGl0bGUpIDogbW9kZWxMaXN0LnRpdGxlO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGhlYWRlcik7XG4gICAgICAgIH1cblxuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGlzdEVsZW1lbnQpO1xuICAgICAgICBjb250YWluZXIuY2xhc3NOYW1lID0gbW9kZWxMaXN0LmNzc0NsYXNzTmFtZXMgfHwgb3B0aW9ucy5jc3NDbGFzc05hbWVzIHx8ICdkcmFnb24tbGlzdCc7XG4gICAgICAgIG1vZGVsTGlzdC5lbGVtZW50ID0gbGlzdEVsZW1lbnQ7XG4gICAgICAgIG1vZGVsTGlzdC5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbW9kZWxMaXN0cztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgLm1vZGVsTGlzdHNgIGFycmF5IHdpdGggdGhlc2UgPGxpPiBlbGVtZW50cycgcGFyZW50IDx1bD4gZWxlbWVudHNcbiAqIEBwYXJhbSB7RWxlbWVudFtdfSBsaXN0SXRlbUVsZW1lbnRzXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1vZGVsTGlzdHNGcm9tTGlzdEVsZW1lbnRzKGxpc3RJdGVtRWxlbWVudHMpIHtcbiAgICB2YXIgbW9kZWxMaXN0cyA9IFtdO1xuXG4gICAgbGlzdEl0ZW1FbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtRWxlbWVudCkge1xuICAgICAgICB2YXIgbGlzdEVsZW1lbnQgPSBpdGVtRWxlbWVudC5wYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgY29udGFpbmVyID0gbGlzdEVsZW1lbnQucGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgIG1vZGVscyA9IFtdO1xuICAgICAgICBpZiAoIW1vZGVsTGlzdHMuZmluZChmdW5jdGlvbiAobGlzdCkgeyByZXR1cm4gbGlzdC5lbGVtZW50ID09PSBsaXN0RWxlbWVudDsgfSkpIHtcbiAgICAgICAgICAgIHRvQXJyYXkobGlzdEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnbGknKSkuZm9yRWFjaChmdW5jdGlvbiAoaXRlbUVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbUVsZW1lbnQgIT09IGxpc3RFbGVtZW50Lmxhc3RFbGVtZW50Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxzLnB1c2goaXRlbUVsZW1lbnQuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG1vZGVscy5lbGVtZW50ID0gbGlzdEVsZW1lbnQ7XG4gICAgICAgICAgICBtb2RlbHMuY29udGFpbmVyID0gY29udGFpbmVyO1xuICAgICAgICAgICAgbW9kZWxMaXN0cy5wdXNoKG1vZGVscyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBtb2RlbExpc3RzO1xufVxuXG5mdW5jdGlvbiBjYXB0dXJlRXZlbnQoZXZ0KSB7XG4gICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xufVxuXG5mdW5jdGlvbiBlcnJvcigpIHtcbiAgICByZXR1cm4gJ2xpc3QtZHJhZ29uOiAnICsgZm9ybWF0LmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xufVxuXG4vLyB0aGlzIGludGVyZmFjZSBjb25zaXN0cyBzb2xlbHkgb2YgdGhlIHByb3RvdHlwYWwgb2JqZWN0IGNvbnN0cnVjdG9yXG5tb2R1bGUuZXhwb3J0cyA9IExpc3REcmFnb247XG4iXX0=
