'use strict';

/* eslint-env browser */

(function (module, exports) {
    var verses = [
        [
            '&rsquo;Twas brillig, and the slithy toves',
            'Did gyre and gimble in the wabe;',
            'All mimsy were the borogoves,',
            'And the mome raths outgrabe.'
        ], [
            'Beware the Jabberwock, my son!',
            'The jaws that bite, the claws that catch!',
            'Beware the Jubjub bird, and shun',
            'The frumious Bandersnatch!'
        ]
    ];

    verses[0] = { title: 'Jabberwocky', models: verses[0] };
    verses[1].title = 'by Lewis Carroll';

    var sets = [];

    exports.initialize = function () {
        var ListDragon = require('list-dragon');

        // See the constructor docs for model list specs!
        //
        // Strategy 1: Supply your own models and let the API build the HTML
        // 1. Supply a (list of) model list(s).
        // 2. The API creates the  <ul>...</ul> element(s) for you in the .modelLists property.
        // 3. Insert the created elements into the DOM wherever/however you want.
        var container = document.querySelectorAll('.container:first-of-type')[0],
            listSet = new ListDragon(verses);

        listSet.modelLists.forEach(function (list) {
            container.appendChild(list.container);
        });

        sets.push(listSet);

        // Strategy 2: Supply your own HTML and let the API build the models for you
        // 1. Script your <ul>...</ul> elements in HTML.
        // 2. Tell ListDragon where to find them via a CSS selector.
        // You can hang auxiliary data off your <li> tags in attributes, such as `value` or `data-whatever`.
        // But, hey, if you're going to do that, you're essentially using portions of the DOM as data models
        // and maybe you should just consider supplying formal models instead (as in Strategy 1 above)!
        listSet = new ListDragon('.container:last-of-type > div.dragon-list li');

        sets.push(listSet);
    };

    exports.sets = sets;

})(module, module.exports);
