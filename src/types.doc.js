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
 * @property {boolean} [htmlEncode] - If truthy, encode the string. If omitted, inherit value from the property with the same name hanging off of the containing {@link modelListType} array.
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
 * If the `itemModelType.htmlEncode` property is true, the string is encoded first so that it can display markup; otherwise any markup in the string is interpreted by the browser.
 *
 * Examples:
 *
 * Simplest:
 *
 * ```javascript
 *  var set = [
 *      [ // list 1: fruits
 *          'apple',
 *          'orange',
 *          'banana'
 *      ],
 *      [ // list 2: vegetables
 *          'lettuce',
 *          'tomato',
 *          'cucumber'
 *      ]
 *  ];
 * ```
 *
 * If you want to specify other options, such as `title`, you could do this:
 *
 * ```javascript
 *  var list1 = [
 *          'apple',
 *          'orange',
 *          'banana'
 *      ];
 *  list1.title = 'Fruits';
 *
 *  var list 2 = [
 *      'lettuce',
 *      'tomato',
 *      'cucumber'
 *  ];
 *  list2.title = 'Vegitables';
 *
 *  var set = [
 *      list1,
 *      list2
 *  ];
 * ```
 *
 * Or you could keep it all in a single literal by giving an array of objects with `models` attributes (in the following the less-than and greater-than signs are rendered):
 *
 * ```javascript
 *  var set = [
 *      {   // list 1
     *          title: 'Fruits',
     *          models:  [
     *              'apple',
     *              'orange',
     *              'banana'
     *          ]
     *      },
 *      {   // list 2
     *          title: 'Vegetables',
     *          models: [
     *              {
     *                  label: '<lettuce>',
     *                  htmlEncode: true
     *              },
     *              { label: 'tomato' },
     *              'cucumber'
     *          ]
     *      }
 *  ];
 * ```
 * Note how list 2 in the above example shows how you can supply objects rather than string primitives. This allows you to give additional options.
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
