'use strict';

/* eslint-env node, browser */

(function (module, exports) { // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

    var body, rect, pin, drop, bindings = {}, items = [], boundingRects;

    exports.initialize = function () {
        body = document.getElementsByTagName('body')[0];
        items = toArray(document.querySelectorAll('ul.list > li'));

        items.forEach(function (item) {
            if (item !== item.parentElement.lastElementChild) {
                addEvt.call(item, item, 'mousedown');
            }
        });
    };

    function toArray(arrayLikeObject) {
        return Array.prototype.slice.call(arrayLikeObject);
    }

    function pointInRects(point, except1, except2) {
        return boundingRects.find(function (rect) {
            return (
                rect.item !== except1 &&
                rect.item !== except2 &&
                pointInRect(point, rect.rect)
            );
        });
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

    function addEvt(target, type) {
        var listener = this || window;
        var handler = handlers[type].bind(target);

        bindings[type] = {
            handler: handler,
            listener: listener
        };

        listener.addEventListener(type, handler);
    }

    function removeEvt(type) {
        var binding = bindings[type];
        binding.listener.removeEventListener(type, binding.handler);
    }

    var handlers = {
        mousedown: function (evt) {
            rect = this.getBoundingClientRect();
            pin = {
                x: evt.x,
                y: evt.y
            };

            if (drop) {
                drop.style.transition = null; //reinstate transition (set to 0 last mouseup)
            }

            drop = this.nextElementSibling;
            drop.style.transition = 'borderTopWidth 0s';
            drop.style.borderTopWidth = rect.height + 'px';

            this.style.width = rect.width + 'px';
            this.style.transform = translate(rect.left, rect.top);
            this.classList.add('dragging');

            boundingRects = [];
            items.forEach(function (item) {
                var rect = item.getBoundingClientRect();

                if (item === item.parentElement.lastElementChild) {
                    rect = {
                        left:   rect.left,
                        top:    rect.top,
                        right:  rect.right,
                        bottom: item.parentElement.getBoundingClientRect().bottom
                    };
                }

                boundingRects.push({
                    item: item,
                    rect: rect
                });
            });

            body.appendChild(this);

            evt.stopPropagation();
            //evt.preventDefault();

            addEvt(this, 'mousemove');
            addEvt(this, 'mouseup');
        },

        mousemove: function (evt) {
            drop.style.transition = null;
            var dx = evt.x - pin.x,
                dy = evt.y - pin.y,
                bottom = { x: evt.x, y: rect.bottom + dy},
                other = pointInRects(bottom, this, drop);

            this.style.transform = translate(rect.left + dx, rect.top + dy);

            if (other) {
                other.item.style.borderTopWidth = drop.style.borderTopWidth;
                drop.style.borderTopWidth = null;
                drop = other.item;
            }
        },

        mouseup: function (evt) {
            removeEvt('mousemove');
            removeEvt('mouseup');

            var dropRect = drop.getBoundingClientRect();

            addEvt(this, 'transitionend');
            this.style.transition = 'transform 333ms ease';
            this.style.transform = translate(dropRect.left, dropRect.top);

            evt.stopPropagation();
        },

        transitionend: function () {
            removeEvt('transitionend');
            this.style.width = this.style.transition = this.style.transform = null;
            this.classList.remove('dragging');
            drop.style.transition = 'borderTopWidth 0s';
            drop.style.borderTopWidth = null;
            drop.parentElement.insertBefore(this, drop);
        }
    };

})(module, module.exports);

