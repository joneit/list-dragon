'use strict';

/* eslint-env node, browser */

(function (module, exports) { // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

    var body, rect, pin, drop, boundingRects, transform;
    var bindings = {}, items = [];

    exports.initialize = function (selector) {
        body = document.getElementsByTagName('body')[0];
        items = toArray(document.querySelectorAll(selector || 'ul.list > li'));

        transform = 'transform' in items[0].style
            ? 'transform' // Chrome 45 and Firefox 40
            : '-webkit-transform'; // Safari 8

        items.forEach(function (item) {
            if (item !== item.parentElement.lastElementChild) {
                addEvt(item, 'mousedown', item, false);
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

    function addEvt(target, type, listener, removable) {
        var handler = handlers[type].bind(target);

        listener = listener || window;

        if (removable === undefined || removable) {
            bindings[type] = {
                handler: handler,
                listener: listener
            };
        }

        listener.addEventListener(type, handler);
    }

    function getAllBoundingRects() {
        // get positions of all list items in page coords
        var rects = [];
        items.forEach(function (item) {
            var rect = item.getBoundingClientRect(),
                last = item === item.parentElement.lastElementChild,
                fill = last ? item.parentElement.getBoundingClientRect() : rect;

            rect = {
                left:   window.scrollX + rect.left,
                top:    window.scrollY + rect.top,
                right:  window.scrollX + rect.right,
                bottom: window.scrollY + fill.bottom
            };

            rects.push({
                item: item,
                rect: rect
            });
        });

        return rects;
    }

    function removeEvt(type) {
        var binding = bindings[type];
        binding.listener.removeEventListener(type, binding.handler);
    }

    var handlers = {
        mousedown: function (evt) {

            evt.stopPropagation();
            //evt.preventDefault();

            if (drop) {
                return;
            }

            rect = this.getBoundingClientRect();
            rect = {
                left:   Math.round(rect.left - 1),
                top:    Math.round(rect.top - 1),
                right:  Math.round(rect.right ),
                bottom: Math.round(rect.bottom),
                width:  Math.round(rect.width),
                height: Math.round(rect.height)
            };

            pin = {
                x: window.scrollX + evt.clientX,
                y: window.scrollY + evt.clientY
            };

            if (drop) {
                drop.style.transition = null; //reinstate transition (set to 0 last mouseup)
            }

            boundingRects = getAllBoundingRects();

            drop = this.nextElementSibling;
            drop.style.transition = 'border-top-width 0s';
            drop.style.borderTopWidth = rect.height + 'px';

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

                addEvt(this, 'mousemove');
            addEvt(this, 'mouseup');
        },

        mousemove: function (evt) {
            drop.style.transition = null;
            var dx = evt.clientX - pin.x,
                dy = evt.clientY - pin.y,
                bottom = {
                    x: evt.clientX,
                    y: rect.bottom + window.scrollY + dy
                },
                other = pointInRects(bottom, this, drop);

            this.style[transform] = translate(
                rect.left - window.scrollX + dx,
                rect.top  - window.scrollY + dy
            );

            if (other) {
                other.item.style.borderTopWidth = drop.style.borderTopWidth;
                drop.style.borderTopWidth = null;
                drop = other.item;
            }
        },

        mouseup: function (evt) {
            removeEvt('mousemove');
            removeEvt('mouseup');

            evt.stopPropagation();

            var newRect = this.getBoundingClientRect();
            if (
                window.scrollX + newRect.left === rect.left &&
                window.scrollY + newRect.top === rect.top
            ) {
                handlers.transitionend.call(this);
            } else {
                var dropRect = drop.getBoundingClientRect();

                addEvt(this, 'transitionend', this);
                this.style.transition = transform + ' 200ms ease';
                this.style[transform] = translate(
                    dropRect.left - window.scrollX,
                    dropRect.top - window.scrollY
                );
            }
        },

        transitionend: function (evt) {
            if (evt) {
                if (evt.propertyName !== transform) {
                    return;
                }
                removeEvt('transitionend');
            }

            this.style.width = this.style[transform] = this.style.transition = null;
            this.classList.remove('dragging');

            drop.style.transition = 'border-top-width 0s';
            drop.style.borderTopWidth = null;
            drop.parentElement.insertBefore(this, drop);

            drop = undefined;
        }
    };

})(module, module.exports);

