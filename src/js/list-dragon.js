'use strict';

/* eslint-env node, browser */

(function (module) { // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

    var body, transform;

    function ListDragon(selectorOrModelLists) {
        var SELECTOR = 'ul.list > li';
        var self = this;
        var lists, items;

        if (selectorOrModelLists instanceof Array) {
            // model lists
            // build new <ul> element(s) from given array(s) and put in `.lists`;
            // fill `.items` array with <li> elements from these new <ul> elements
            items = [];
            lists = buildListsFromModelLists(selectorOrModelLists);
            lists.forEach(function (list) {
                items = items.concat(toArray(list.element.querySelectorAll(SELECTOR)));
            });
        } else {
            // selector
            // fill `.items` array with <li> elements from selected <ul> elements;
            // fill `.lists` array with these <li> elements' parent <ul> elements
            selectorOrModelLists = (selectorOrModelLists || '\\').replace(/\\/g, SELECTOR);
            items = toArray(document.querySelectorAll(selectorOrModelLists));
            lists = buildListsFromItemList(items);
        }

        items.forEach(function (element, index) {
            items[index] = (element !== element.parentElement.lastElementChild)
                ? self.addEvt(element, 'mousedown', element, true)
                : { element: element };
        });

        body = body || document.getElementsByTagName('body')[0];

        transform = 'transform' in items[0].element.style
            ? 'transform' // Chrome 45 and Firefox 40
            : '-webkit-transform'; // Safari 8

        this.lists = lists;
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
            var lists = this.lists;
            this.items.forEach(function (item) {
                var element = item.element,
                    parent = element.parentElement,
                    list = lists.find(function (list) { return list.element === parent; });

                if (list.isDropTarget) {
                    var rect = element.getBoundingClientRect(),
                        last = element === parent.lastElementChild,
                        fill = last ? parent.getBoundingClientRect() : rect;

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
            style.width = style[transform] = style.transition = null;

            target.classList.remove('dragging');

            this.drop.style.transitionDuration = '0s';
            this.drop.style.borderTopWidth = null;
            this.drop.parentElement.insertBefore(target, this.drop);

            delete this.drop;
        },

        itemCoordinates: function (item) {
            var parent = item.parentElement,
                coords = { item: 0 };

            while ((item = item.previousElementSibling)) {
                ++coords.item;
            }

            this.lists.find(function (list, index) {
                coords.list = index;
                return list.element === parent;
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

            //if (dragon.drop) {
            //    dragon.drop.style.transition = null; //re-inherit from stylesheet (set to 0s last mouseup)
            //}

            if (dragon.callback.grabbed) {
                dragon.callback.grabbed(
                    // TODO: need useful params here
                );
            }

            dragon.getAllBoundingRects();

            dragon.drop = this.nextElementSibling;
            dragon.drop.style.transitionDuration = '0s';
            dragon.drop.style.borderTopWidth = rect.height + 'px';

            this.style.width = rect.width + 'px';
            this.style[transform] = translate(
                rect.left - window.scrollX,
                rect.top  - window.scrollY
            );
            this.classList.add('dragging');

            body.appendChild(this);

            rect.left   += window.scrollX;
            rect.top    += window.scrollY;
            rect.right  += window.scrollX;
            rect.bottom += window.scrollY;

            dragon.addEvt(this, 'mousemove');
            dragon.addEvt(this, 'mouseup');
        },

        mousemove: function (dragon, evt) {
            //dragon.drop.style.transition = null;
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
                element.style.transition = null;
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
                this.style.transition = transform;
                this.style.transitionDuration = '200ms';
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

                var model = dragon.lists[dragon.origin.list].models.splice(dragon.origin.item, 1)[0];
                var destination = dragon.itemCoordinates(this);
                dragon.lists[destination.list].models.splice(destination.item, 0, model);

                if (dragon.callback.dropped) {
                    dragon.callback.dropped(
                        dragon,
                        this,
                        this.parentElement
                    );
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

    function buildListsFromModelLists(modelLists) {
        var lists = [];

        if (modelLists.length) {
            modelLists = modelLists[0] instanceof Array ? modelLists : [modelLists];

            modelLists.forEach(function (modelList, listIndex) {
                var UL = document.createElement('ul');
                UL.classList.add('list');
                modelList.forEach(function (model, modelIndex) {
                    var LI = document.createElement('li');
                    if (typeof model === 'string') {
                        model = { label: model };
                    } else if (!('label' in model)) {
                        throw error('List item [{0}][{1}] must be either a string OR an object with a `label` property.',
                            listIndex, modelIndex);
                    }
                    if (model.htmlEncode !== undefined && model.htmlEncode || modelList.htmlEncode) {
                        LI.innerHTML = document
                            .createElement('a')
                            .appendChild(document.createTextNode(model.label))
                            .parentNode
                            .innerHTML;
                    } else {
                        LI.innerHTML = model.label;
                    }
                    UL.appendChild(LI);
                });
                var LI = document.createElement('li');
                LI.innerHTML = '&nbsp;';
                UL.appendChild(LI);
                lists.push({
                    element: UL,
                    models: modelList,
                    isDropTarget: true //boolean or function
                });
            });
        }

        return lists;
    }

    function buildListsFromItemList(items) {
        var lists = [];

        items.forEach(function (element) {
            var parent = element.parentElement, models = [];
            if (!lists.find(function (list) { return list.element === parent; })) {
                toArray(parent.querySelectorAll('li')).forEach(function (element) {
                    if (element !== element.parentElement.lastElementChild) {
                        models.push(element.innerHTML);
                    }
                });
                lists.push({
                    element: parent,
                    models: models,
                    isDropTarget: true //boolean or function returning boolean
                });
            }
        });

        return lists;
    }

    function error() {
        return 'ListDragon: ' + fmt(String.prototype.slice.call(arguments));
    }

    function fmt(fmt) {
        for (var i = 1; i < arguments.length; ++i) {
            fmt.replace(new RegExp('\\{' + (i - 1) + '\\}', 'g'), arguments[i]);
        }
    }

    // this interface consists solely of the prototypal object constructor
    module.exports = ListDragon;

})(module, module.exports);

