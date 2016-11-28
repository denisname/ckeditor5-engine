/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/view/element
 */

import Node from './node.js';
import Text from './text.js';
import objectToMap from '../../utils/objecttomap.js';
import isIterable from '../../utils/isiterable.js';
import isPlainObject from '../../utils/lib/lodash/isPlainObject.js';
import Matcher from './matcher.js';

/**
 * View element.
 *
 * Editing engine does not define fixed HTML DTD. This is why the type of the {@link module:engine/view/element~Element} need to
 * be defined by the feature developer. Creating an element you should use {@link module:engine/view/containerelement~ContainerElement}
 * class, {@link module:engine/view/attributeelement~AttributeElement} class or {@link module:engine/view/emptyelement~EmptyElement} class.
 *
 * Note that for view elements which are not created from model, like elements from mutations, paste or
 * {@link module:engine/controller/datacontroller~DataController#set data.set} it is not possible to define the type of the element, so
 * these will be instances of the {@link module:engine/view/element~Element}.
 *
 * @extends module:engine/view/node~Node
 */
export default class Element extends Node {
	/**
	 * Creates a view element.
	 *
	 * Attributes can be passed in various formats:
	 *
	 *		new Element( 'div', { 'class': 'editor', 'contentEditable': 'true' } ); // object
	 *		new Element( 'div', [ [ 'class', 'editor' ], [ 'contentEditable', 'true' ] ] ); // map-like iterator
	 *		new Element( 'div', mapOfAttributes ); // map
	 *
	 * @param {String} name Node name.
	 * @param {Object|Iterable} [attrs] Collection of attributes.
	 * @param {module:engine/view/node~Node|Iterable.<module:engine/view/node~Node>} [children]
	 * List of nodes to be inserted into created element.
	 */
	constructor( name, attrs, children ) {
		super();

		/**
		 * Name of the element.
		 *
		 * @readonly
		 * @member {String}
		 */
		this.name = name;

		/**
		 * Map of attributes, where attributes names are keys and attributes values are values.
		 *
		 * @protected
		 * @member {Map} #_attrs
		 */
		if ( isPlainObject( attrs ) ) {
			this._attrs = objectToMap( attrs );
		} else {
			this._attrs = new Map( attrs );
		}

		/**
		 * Array of child nodes.
		 *
		 * @protected
		 * @member {Array.<module:engine/view/node~Node>}
		 */
		this._children = [];

		if ( children ) {
			this.insertChildren( 0, children );
		}

		/**
		 * Set of classes associated with element instance.
		 *
		 * @protected
		 * @member {Set}
		 */
		this._classes = new Set();

		if ( this._attrs.has( 'class' ) ) {
			// Remove class attribute and handle it by class set.
			const classString = this._attrs.get( 'class' );
			parseClasses( this._classes, classString );
			this._attrs.delete( 'class' );
		}

		/**
		 * Map of styles.
		 *
		 * @protected
		 * @member {Set} module:engine/view/element~Element#_styles
		 */
		this._styles = new Map();

		if ( this._attrs.has( 'style' ) ) {
			// Remove style attribute and handle it by styles map.
			parseInlineStyles( this._styles, this._attrs.get( 'style' ) );
			this._attrs.delete( 'style' );
		}
	}

	/**
	 * Number of element's children.
	 *
	 * @readonly
	 * @type {Number}
	 */
	get childCount() {
		return this._children.length;
	}

	/**
	 * Is `true` if there are no nodes inside this element, `false` otherwise.
	 *
	 * @readonly
	 * @type {Boolean}
	 */
	get isEmpty() {
		return this._children.length === 0;
	}

	/**
	 * Clones provided element.
	 *
	 * @param {Boolean} deep If set to `true` clones element and all its children recursively. When set to `false`,
	 * element will be cloned without any children.
	 * @returns {module:engine/view/element~Element} Clone of this element.
	 */
	clone( deep ) {
		const childrenClone = [];

		if ( deep ) {
			for ( let child of this.getChildren() ) {
				childrenClone.push( child.clone( deep ) );
			}
		}

		// ContainerElement and AttributeElement should be also cloned properly.
		const cloned = new this.constructor( this.name, this._attrs, childrenClone );

		// Classes and styles are cloned separately - this solution is faster than adding them back to attributes and
		// parse once again in constructor.
		cloned._classes = new Set( this._classes );
		cloned._styles = new Map( this._styles );

		return cloned;
	}

	/**
	 * {@link module:engine/view/element~Element#insertChildren Insert} a child node or a list of child nodes at the end of this node and sets
	 * the parent of these nodes to this element.
	 *
	 * @fires module:engine/view/node~Node#change
	 * @param {module:engine/view/node~Node|Iterable.<module:engine/view/node~Node>} nodes Node or the list of nodes to be inserted.
	 * @returns {Number} Number of appended nodes.
	 */
	appendChildren( nodes ) {
		return this.insertChildren( this.childCount, nodes );
	}

	/**
	 * Gets child at the given index.
	 *
	 * @param {Number} index Index of child.
	 * @returns {module:engine/view/node~Node} Child node.
	 */
	getChild( index ) {
		return this._children[ index ];
	}

	/**
	 * Gets index of the given child node. Returns `-1` if child node is not found.
	 *
	 * @param {module:engine/view/node~Node} node Child node.
	 * @returns {Number} Index of the child node.
	 */
	getChildIndex( node ) {
		return this._children.indexOf( node );
	}

	/**
	 * Gets child nodes iterator.
	 *
	 * @returns {Iterable.<module:engine/view/node~Node>} Child nodes iterator.
	 */
	getChildren() {
		return this._children[ Symbol.iterator ]();
	}

	/**
	 * Returns an iterator that contains the keys for attributes. Order of inserting attributes is not preserved.
	 *
	 * @returns {Iterator.<String>} Keys for attributes.
	 */
	*getAttributeKeys() {
		if ( this._classes.size > 0 ) {
			yield 'class';
		}

		if ( this._styles.size > 0 ) {
			yield 'style';
		}

		// This is not an optimal solution because of https://github.com/ckeditor/ckeditor5-engine/issues/454.
		// It can be simplified to `yield* this._attrs.keys();`.
		for ( let key of this._attrs.keys() ) {
			yield key;
		}
	}

	/**
	 * Returns iterator that iterates over this element's attributes.
	 *
	 * Attributes are returned as arrays containing two items. First one is attribute key and second is attribute value.
	 * This format is accepted by native `Map` object and also can be passed in `Node` constructor.
	 *
	 * @returns {Iterable.<*>}
	 */
	*getAttributes() {
		yield* this._attrs.entries();

		if ( this._classes.size > 0 ) {
			yield [ 'class', this.getAttribute( 'class' ) ];
		}

		if ( this._styles.size > 0 ) {
			yield [ 'style', this.getAttribute( 'style' ) ];
		}
	}

	/**
	 * Gets attribute by key. If attribute is not present - returns undefined.
	 *
	 * @param {String} key Attribute key.
	 * @returns {String|undefined} Attribute value.
	 */
	getAttribute( key ) {
		if ( key == 'class' ) {
			if ( this._classes.size > 0 ) {
				return [ ...this._classes ].join( ' ' );
			}

			return undefined;
		}

		if ( key == 'style' ) {
			if ( this._styles.size > 0 ) {
				let styleString = '';

				for ( let [ property, value ] of this._styles ) {
					styleString += `${ property }:${ value };`;
				}

				return styleString;
			}

			return undefined;
		}

		return this._attrs.get( key );
	}

	/**
	 * Returns a boolean indicating whether an attribute with the specified key exists in the element.
	 *
	 * @param {String} key Attribute key.
	 * @returns {Boolean} `true` if attribute with the specified key exists in the element, false otherwise.
	 */
	hasAttribute( key ) {
		if ( key == 'class' ) {
			return this._classes.size  > 0;
		}

		if ( key == 'style' ) {
			return this._styles.size > 0;
		}

		return this._attrs.has( key );
	}

	/**
	 * Adds or overwrite attribute with a specified key and value.
	 *
	 * @param {String} key Attribute key.
	 * @param {String} value Attribute value.
	 * @fires module:engine/view/node~Node#change
	 */
	setAttribute( key, value ) {
		this._fireChange( 'attributes', this );

		if ( key == 'class' ) {
			parseClasses( this._classes, value );
		} else if ( key == 'style' ) {
			parseInlineStyles( this._styles, value );
		} else {
			this._attrs.set( key, value );
		}
	}

	/**
	 * Inserts a child node or a list of child nodes on the given index and sets the parent of these nodes to
	 * this element.
	 *
	 * @param {Number} index Position where nodes should be inserted.
	 * @param {module:engine/view/node~Node|Iterable.<module:engine/view/node~Node>} nodes Node or the list of nodes to be inserted.
	 * @fires module:engine/view/node~Node#change
	 * @returns {Number} Number of inserted nodes.
	 */
	insertChildren( index, nodes ) {
		this._fireChange( 'children', this );
		let count = 0;

		nodes = normalize( nodes );

		for ( let node of nodes ) {
			node.parent = this;

			this._children.splice( index, 0, node );
			index++;
			count++;
		}

		return count;
	}

	/**
	 * Removes attribute from the element.
	 *
	 * @param {String} key Attribute key.
	 * @returns {Boolean} Returns true if an attribute existed and has been removed.
	 * @fires module:engine/view/node~Node#change
	 */
	removeAttribute( key ) {
		this._fireChange( 'attributes', this );

		// Remove class attribute.
		if ( key == 'class' ) {
			if ( this._classes.size > 0 ) {
				this._classes.clear();

				return true;
			}

			return false;
		}

		// Remove style attribute.
		if ( key == 'style' ) {
			if ( this._styles.size > 0 ) {
				this._styles.clear();

				return true;
			}

			return false;
		}

		// Remove other attributes.
		return this._attrs.delete( key );
	}

	/**
	 * Removes number of child nodes starting at the given index and set the parent of these nodes to `null`.
	 *
	 * @param {Number} index Number of the first node to remove.
	 * @param {Number} [howMany=1] Number of nodes to remove.
	 * @returns {Array.<module:engine/view/node~Node>} The array of removed nodes.
	 * @fires module:engine/view/node~Node#change
	 */
	removeChildren( index, howMany = 1 ) {
		this._fireChange( 'children', this );

		for ( let i = index; i < index + howMany; i++ ) {
			this._children[ i ].parent = null;
		}

		return this._children.splice( index, howMany );
	}

	/**
	 * Checks if this element is similar to other element.
	 * Both elements should have the same name and attributes to be considered as similar. Two similar elements
	 * can contain different set of children nodes.
	 *
	 * @param {module:engine/view/element~Element} otherElement
	 * @returns {Boolean}
	 */
	isSimilar( otherElement ) {
		if ( !( otherElement instanceof Element ) ) {
			return false;
		}

		// If exactly the same Element is provided - return true immediately.
		if ( this === otherElement ) {
			return true;
		}

		// Check element name.
		if ( this.name != otherElement.name ) {
			return false;
		}

		// Check number of attributes, classes and styles.
		if ( this._attrs.size !== otherElement._attrs.size || this._classes.size !== otherElement._classes.size ||
			this._styles.size !== otherElement._styles.size ) {
			return false;
		}

		// Check if attributes are the same.
		for ( let [ key, value ] of this._attrs ) {
			if ( !otherElement._attrs.has( key ) || otherElement._attrs.get( key ) !== value ) {
				return false;
			}
		}

		// Check if classes are the same.
		for ( let className of this._classes ) {
			if ( !otherElement._classes.has( className ) ) {
				return false;
			}
		}

		// Check if styles are the same.
		for ( let [ property, value ] of this._styles ) {
			if ( !otherElement._styles.has( property ) || otherElement._styles.get( property ) !== value ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Adds specified class.
	 *
	 *		element.addClass( 'foo' ); // Adds 'foo' class.
	 *		element.addClass( 'foo', 'bar' ); // Adds 'foo' and 'bar' classes.
	 *
	 * @param {...String} className
	 * @fires module:engine/view/node~Node#change
	 */
	addClass( ...className ) {
		this._fireChange( 'attributes', this );
		className.forEach( name => this._classes.add( name ) );
	}

	/**
	 * Removes specified class.
	 *
 	 *		element.removeClass( 'foo' );  // Removes 'foo' class.
	 *		element.removeClass( 'foo', 'bar' ); // Removes both 'foo' and 'bar' classes.
	 *
	 * @param {...String} className
	 * @fires module:engine/view/node~Node#change
	 */
	removeClass( ...className ) {
		this._fireChange( 'attributes', this );
		className.forEach( name => this._classes.delete( name ) );
	}

	/**
	 * Returns true if class is present.
	 * If more then one class is provided - returns true only when all classes are present.
	 *
	 *		element.hasClass( 'foo' ); // Returns true if 'foo' class is present.
	 *		element.hasClass( 'foo', 'bar' ); // Returns true if 'foo' and 'bar' classes are both present.
	 *
	 * @param {...String} className
	 */
	hasClass( ...className ) {
		for ( let name of className ) {
			if ( !this._classes.has( name ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Returns iterator that contains all class names.
	 *
	 * @returns {Iterator.<String>}
	 */
	getClassNames() {
		return this._classes.keys();
	}

	/**
	 * Adds style to the element.
	 *
	 *		element.setStyle( 'color', 'red' );
	 *		element.setStyle( {
	 *			color: 'red',
	 *			position: 'fixed'
	 *		} );
	 *
	 * @param {String|Object} property Property name or object with key - value pairs.
	 * @param {String} [value] Value to set. This parameter is ignored if object is provided as the first parameter.
	 * @fires module:engine/view/node~Node#change
	 */
	setStyle( property, value ) {
		this._fireChange( 'attributes', this );

		if ( isPlainObject( property ) ) {
			const keys = Object.keys( property );

			for ( let key of keys ) {
				this._styles.set( key, property[ key ] );
			}
		} else {
			this._styles.set( property, value );
		}
	}

	/**
	 * Returns style value for given property.
	 * Undefined is returned if style does not exist.
	 *
	 * @param {String} property
	 * @returns {String|undefined}
	 */
	getStyle( property ) {
		return this._styles.get( property );
	}

	/**
	 * Returns iterator that contains all style names.
	 *
	 * @returns {Iterator.<String>}
	 */
	getStyleNames() {
		return this._styles.keys();
	}

	/**
	 * Returns true if style keys are present.
	 * If more then one style property is provided - returns true only when all properties are present.
	 *
	 *		element.hasStyle( 'color' ); // Returns true if 'border-top' style is present.
	 *		element.hasStyle( 'color', 'border-top' ); // Returns true if 'color' and 'border-top' styles are both present.
	 *
	 * @param {...String} property
	 */
	hasStyle( ...property ) {
		for ( let name of property ) {
			if ( !this._styles.has( name ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Removes specified style.
	 *
	 *		element.removeStyle( 'color' );  // Removes 'color' style.
	 *		element.removeStyle( 'color', 'border-top' ); // Removes both 'color' and 'border-top' styles.
	 *
	 * @param {...String} property
	 * @fires module:engine/view/node~Node#change
	 */
	removeStyle( ...property ) {
		this._fireChange( 'attributes', this );
		property.forEach( name => this._styles.delete( name ) );
	}

	/**
	 * Returns ancestor element that match specified pattern.
	 * Provided patterns should be compatible with {@link module:engine/view/matcher~Matcher Matcher} as it is used internally.
	 *
	 * @see module:engine/view/matcher~Matcher
	 * @param {Object|String|RegExp|Function} patterns Patterns used to match correct ancestor.
	 * See {@link module:engine/view/matcher~Matcher}.
	 * @returns {module:engine/view/element~Element|null} Found element or `null` if no matching ancestor was found.
	 */
	findAncestor( ...patterns ) {
		const matcher = new Matcher( ...patterns );
		let parent = this.parent;

		while ( parent ) {
			if ( matcher.match( parent ) ) {
				return parent;
			}

			parent = parent.parent;
		}

		return null;
	}
}

// Parses inline styles and puts property - value pairs into styles map.
// Styles map is cleared before insertion.
//
// @param {Map.<String, String>} stylesMap Map to insert parsed properties and values.
// @param {String} stylesString Styles to parse.
function parseInlineStyles( stylesMap, stylesString ) {
	const regex = /\s*([^:;\s]+)\s*:\s*([^;]+)\s*(?=;|$)/g;
	let matchStyle;
	stylesMap.clear();

	while ( ( matchStyle = regex.exec( stylesString ) ) !== null ) {
		stylesMap.set( matchStyle[ 1 ], matchStyle[ 2 ].trim() );
	}
}

// Parses class attribute and puts all classes into classes set.
// Classes set s cleared before insertion.
//
// @param {Set.<String>} classesSet Set to insert parsed classes.
// @param {String} classesString String with classes to parse.
function parseClasses( classesSet, classesString ) {
	const classArray = classesString.split( /\s+/ );
	classesSet.clear();
	classArray.forEach( name => classesSet.add( name ) );
}

// Converts strings to Text and non-iterables to arrays.
//
// @param {String|module:engine/view/node~Node|Iterable.<String|module:engine/view/node~Node>}
// @return {Iterable.<module:engine/view/node~Node>}
function normalize( nodes ) {
	// Separate condition because string is iterable.
	if ( typeof nodes == 'string' ) {
		return [ new Text( nodes ) ];
	}

	if ( !isIterable( nodes ) ) {
		nodes = [ nodes ];
	}

	// Array.from to enable .map() on non-arrays.
	return Array.from( nodes ).map( ( node ) => typeof node == 'string' ? new Text( node ) : node );
}
