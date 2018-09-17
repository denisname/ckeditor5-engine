---
category: framework-deep-dive
---

# Schema

In this article we assume that you have already read the {@link framework/guides/architecture/editing-engine#schema "Schema"} section of the {@link framework/guides/architecture/editing-engine Introduction to the "Editing engine architecture"}.

## Quick recap

Editor's schema is available in {@link module:engine/model/model~Model#schema `editor.model.schema`} property. It defines allowed model structures (how model elements can be nested) and allowed attributes (of both, elements and text nodes). This information is later used by editing features and the editing engine to make decision on how to process the model, where to enable features, etc.

Schema rules can be defined by using the {@link module:engine/model/schema~Schema#register `Schema#register()`} or {@link module:engine/model/schema~Schema#extend `Schema#extend()`} methods. The former can be used only once for a given item name which ensures that only a single editing feature can introduce this item. Similarly, `extend()` can only be used for defined items.

Elements and attributes are checked by features separately by using the {@link module:engine/model/schema~Schema#checkChild `Schema#checkChild()`} and {@link module:engine/model/schema~Schema#checkAttribute `Schema#checkAttribute()`} methods.

## Defining allowed structures

When a feature introduces a model element it should register it in the schema. Besides
defining that such an element may exist in the model, the feature also needs to define where
this element may be placed:

```js
schema.register( 'myElement', {
	allowIn: '$root'
} );
```

This lets the schema know that `<myElement>` may be a child of the `<$root>` element. `$root` is one of the generic nodes defined by the editing framework. By default, the editor names the main root element a `<$root>`, so the above definition allows `<myElement>` in the main editor element.

In other words, this would be correct:

```xml
<$root>
	<myElement></myElement>
</$root>
```

While this would not be correct:

```js
<$root>
	<foo>
		<myElement></myElement>
	</foo>
</$root>
```

## Generic items

There are three basic generic items: `$root`, `$block` and `$text`. They are defined as follows:

```js
schema.register( '$root', {
	isLimit: true
} );
schema.register( '$block', {
	allowIn: '$root',
	isBlock: true
} );
schema.register( '$text', {
	allowIn: '$block'
} );
```

These definitions can then be reused by features to create their own definitions in a more extensible way. For example, the {@link module:paragraph/paragraph~Paragraph} feature will define its item as:

```js
schema.register( 'paragraph', {
	inheritAllFrom: '$block'
} );
```

Which translates to:

```js
schema.register( 'paragraph', {
	allowWhere: '$block',
	allowContentOf: '$block',
	allowAttributesOf: '$block',
	inheritTypesFrom: '$block'
} );
```

Which can be read as:

* The `<paragraph>` element will be allowed in elements in which `<$block>` is allowed (e.g. in `<$root>`).
* The `<paragraph>` element will allow all nodes which are allowed in `<$block>` (e.g. `$text`).
* The `<paragraph>` element will allow all attributes allowed on `<$block>`.
* The `<paragraph>` element will inherit all `is*` properties of `<$block>` (e.g. `isBlock`).

Thanks to the fact that `<paragraph>`'s definition is inherited from `<$block>` other features can use the `<$block>` type to indirectly extend `<paragraph>`'s definition. For example, the {@link module:block-quote/blockquote~BlockQuote} feature does this:

```js
schema.register( 'blockQuote', {
	allowWhere: '$block',
	allowContentOf: '$root'
} );
```

Thanks to that, despite the fact that block quote and paragraph features know nothing about themselves, paragraphs will be allowed in block quotes and block quotes will be allowed in all places where blocks are allowed. So if anyone will register a `<section>` element (with `allowContentOf: '$root'` rule), that `<section>` elements will allow block quotes too.

The side effect of such a definition inheritance is that now `<blockQuote>` is allowed in `<blockQuote>` which needs to be resolved by a callback which will disallow this specific structure.

<info-box>
	You can read more about the format of an item definition in {@link module:engine/model/schema~SchemaItemDefinition}.
</info-box>

## Defining advanced rules in `checkChild()`'s callbacks

The {@link module:engine/model/schema~Schema#checkChild `Schema#checkChild()`} method which is the base method used to check whether some element is allowed in a given structure is {@link module:utils/observablemixin~ObservableMixin#decorate a decorated method}. It means that you can add listeners to implement your specific rules which are not limited by the {@link module:engine/model/schema~SchemaItemDefinition declarative `SchemaItemDefinition` API}.

Those listeners can be added either by listening directly to the {@link module:engine/model/schema~Schema#event:checkChild} event or by using the handy {@link module:engine/model/schema~Schema#addChildCheck `Schema#addChildCheck()`} method.

For instance, the block quote feature defines such a listener to disallow nested `<blockQuote>` structures:

```js
schema.addChildCheck( context, childDefinition ) => {
	// Note that context is automatically normalized to SchemaContext instance and
	// child to its definition (SchemaCompiledItemDefinition).

	// If checkChild() is called with a context that ends with blockQuote and blockQuote as a child
	// to check, make the checkChild() method return false.
	if ( context.endsWith( 'blockQuote' ) && childDefinition.name == 'blockQuote' ) {
		return false;
	}
} );
```

## Defining attributes

TODO

## Implementing additional constraints

Schema's capabilities are limited to simple (and atomic) {@link module:engine/model/schema~Schema#checkChild `Schema#checkChild()`} and {@link module:engine/model/schema~Schema#checkAttribute `Schema#checkAttribute()`} checks on purpose. One may imagine that schema should support defining more complex rules such as "element `<x>` must be always followed by `<y>`". While it is feasible to create an API which would enable feeding the schema with such definitions, it is unfortunately unrealistic to then expect that every editing feature will consider those rules when processing the model. It is also unrealistic to expect that it will be done automatically by the schema and the editing engine themselves.

For instance, let's get back to the "element `<x>` must be always followed by `<y>`" rule and this initial content:

```xml
<$root>
	<x>foo</x>
	<y>bar[bom</y>
	<z>bom]bar</z>
</$root>
```

Now, imagine that the user presses the "block quote" button. Usually it would wrap the two selected blocks (`<y>` and `<z>`) with a `<blockQuote>` element:

```xml
<$root>
	<x>foo</x>
	<blockQuote>
		<y>bar[bom</y>
		<z>bom]bar</z>
	</blockQuote>
</$root>
```

But it turns out that this creates an incorrect structure – `<x>` is not followed by `<y>` anymore.

What should happen instead? There are at least 4 possible solutions: the block quote feature should not be applicable in such a context, someone should create a new `<y>` right after `<x>`, `<x>` should be moved inside `<blockQuote>` together with `<y>` or vice versa.

While this is a relatively simple scenario (unlike most real-time collaboration scenarios),
it turns out that it is already hard to say what should happen and who should react to fix this content.

Therefore, if your editor needs to implement such rules, you should do that through {@link module:engine/model/document~Document#registerPostFixer model's post-fixers} fixing incorrect content or actively prevent such situations (e.g. by disabling certain features). It means that those constraints will be defined specifically for your scenario by your code which makes their implementation much easier.

To sum up, the answer to who and how should implement additional constraints is: your features or your editor through CKEditor 5's API.

## Who checks the schema?

The CKEditor 5 API exposes many ways to work on (change) the model. It can be done {@link framework/guides/architecture/editing-engine#changing-the-model through the writer}, via methods like {@link module:engine/model/model~Model#insertContent `Model#insertContent()`}, via commands and so on.

### Low-level APIs

The lowest-level API is the writer (to be precise, there are also raw operations below, but they are used for very special cases only). It allows applying atomic changes to the content like inserting/removing/moving/splitting nodes, setting/removing an attribute, etc. It is important to know that the **writer does not prevent from applying changes which violates rules defined in the schema**.

The reason for that is that when you implement a command or any other feature you may need to perform multiple operations to do all the necessary changes. The state in the meantime (between these atomic operations) may be incorrect. The writer must allow that.

For instance, you need to move `<foo>` from `<$root>` to `<bar>` and (at the same time) rename it to `<oof>`. But the schema defines that `<oof>` is not allowed in `<$root>` and `<foo>` in `<bar>`. If the writer would check schema it would complain regardless of the order of `rename` and `move` operations.

You can argue that the engine could handle this by checking the schema at the end of a {@link module:engine/model/model~Model#change `Model#change()` block} (it works like a transaction – the state needs to be correct at the end of it). In fact, we [plan to strip disallowed attributes](https://github.com/ckeditor/ckeditor5-engine/issues/1228) at the end of that blocks.

There are problems, though:

* How to fix the content after a transaction is committed? It is impossible to implement a reasonable heuristic that wouldn't break the content from the user's perspective.
* The model can become invalid during collaborative changes. Operational Transformation, while implemented by us in a very rich form (with 11 types of operations instead of the base 3) ensures conflict resolution and eventual consistency, but not model's validity.

Therefore, we chose to handle such situations per case, using more expressive and flexible {@link module:engine/model/document~Document#registerPostFixer model's post-fixers}. Additionally, we moved the responsibility to check the schema to features. They can make a lot better decisions apriori, before doing changes. You can read more about this in ["Implementing additional constraints"](#implementing-additional-constraints) section above.

### High-level APIs

What about other, higher-level methods? **We recommend that all APIs built on top of the writer should check the schema.**

For instance, the {@link module:engine/model/model~Model#insertContent `Model#insertContent()`} method will make sure that inserted nodes are allowed in the place of their insertion. It may also attempt splitting the insertion container (if allowed by the schema) if that will make the element to insert allowed, and so on.

Similarly, commands, if implemented correctly, {@link module:core/command~Command#isEnabled get disabled} if they should not be executed in the current place.

Finally, the schema plays a crucial role during the conversion from the view to the model (called also "upcasting"). During this process converters make decisions whether they can convert specific view elements or attributes to the given positions in the model. Thanks to that if you would try to load an incorrect data to the editor or when you paste a content copied from another website, the structure and attributes of these data get adjusted to the current schema rules.

<info-box>
	Some features may miss schema checks. If you happen to find such a scenario, do not hesitate to [report it to us](https://github.com/ckeditor/ckeditor5/issues).
</info-box>

