/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: view */

'use strict';

import Document from '/ckeditor5/engine/view/document.js';
import Element from '/ckeditor5/engine/view/element.js';
import ContainerElement from '/ckeditor5/engine/view/containerelement.js';
import Text from '/ckeditor5/engine/view/text.js';
import TreeWalker from '/ckeditor5/engine/view/treewalker.js';
import Position from '/ckeditor5/engine/view/position.js';
import Range from '/ckeditor5/engine/view/range.js';
import CKEditorError from '/ckeditor5/utils/ckeditorerror.js';

describe( 'TreeWalker', () => {
	let doc, root, img1, paragraph, bold, ba, r, img2, x;
	let rootBeginning, rootEnding;

	before( () => {
		doc = new Document();
		root = doc.createRoot( document.createElement( 'div' ) );

		// root
		//  |- img1
		//  |- p
		//     |- b
		//     |  |- B
		//     |  |- A
		//     |
		//     |- R
		//     |
		//     |- img2
		//     |
		//     |- X

		ba = new Text( 'ba' );
		bold = new Element( 'b', [], [ ba ] );
		r = new Text( 'r' );
		img2 = new Element( 'img2' );
		x = new Text( 'x' );

		paragraph = new ContainerElement( 'p', [], [ bold, r, img2, x ] );
		img1 = new Element( 'img1' );

		root.insertChildren( 0, [ img1, paragraph ] );

		rootBeginning = new Position( root, 0 );
		rootEnding = new Position( root, 2 );
	} );

	describe( 'constructor', () => {
		it( 'should throw if neither boundaries nor starting position is set', () => {
			expect( () => {
				new TreeWalker();
			} ).to.throw( CKEditorError, /^tree-walker-no-start-position/ );

			expect( () => {
				new TreeWalker( {} );
			} ).to.throw( CKEditorError, /^tree-walker-no-start-position/ );

			expect( () => {
				new TreeWalker( { singleCharacters: true } );
			} ).to.throw( CKEditorError, /^tree-walker-no-start-position/ );
		} );

		it( 'should throw if walking direction is unknown', () => {
			expect( () => {
				new TreeWalker( { startPosition: rootBeginning, direction: 'UNKNOWN' } );
			} ).to.throw( CKEditorError, /^tree-walker-unknown-direction/ );
		} );
	} );

	describe( 'iterate from start position `startPosition`', () => {
		let expected;

		beforeEach( () => {
			expected = [
				{ type: 'ELEMENT_START', item: img1 },
				{ type: 'ELEMENT_END', item: img1 },
				{ type: 'ELEMENT_START', item: paragraph },
				{ type: 'ELEMENT_START', item: bold },
				{ type: 'TEXT', text: 'ba' },
				{ type: 'ELEMENT_END', item: bold },
				{ type: 'TEXT', text: 'r' },
				{ type: 'ELEMENT_START', item: img2 },
				{ type: 'ELEMENT_END', item: img2 },
				{ type: 'TEXT', text: 'x' },
				{ type: 'ELEMENT_END', item: paragraph }
			];
		} );

		it( 'should provide iterator interface with default FORWARD direction', () => {
			let iterator = new TreeWalker( { startPosition: rootBeginning } );
			let i = 0;

			for ( let value of iterator ) {
				expectValue( value, expected[ i ] );
				i++;
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should provide iterator interface with FORWARD direction', () => {
			let iterator = new TreeWalker( { startPosition: rootBeginning, direction: 'FORWARD' } );
			let i = 0;

			for ( let value of iterator ) {
				expectValue( value, expected[ i ] );
				i++;
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should provide iterator interface which BACKWARD direction', () => {
			let iterator = new TreeWalker( { startPosition: rootEnding, direction: 'BACKWARD' } );
			let i = expected.length;

			for ( let value of iterator ) {
				expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
			}

			expect( i ).to.equal( 0 );
		} );

		it( 'should start iterating at the startPosition witch is not a root bound', () => {
			let iterator = new TreeWalker( { startPosition: new Position( root, 1 ) } );
			let i = 2;

			for ( let value of iterator ) {
				expectValue( value, expected[ i ] );
				i++;
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should start iterating at the startPosition witch is not a root bound, going backward', () => {
			let expected = [
				{ type: 'ELEMENT_START', item: img1 },
				{ type: 'ELEMENT_END', item: img1 }
			];

			let iterator = new TreeWalker( { startPosition: new Position( root, 1 ), direction: 'BACKWARD' } );
			let i = expected.length;

			for ( let value of iterator ) {
				expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
			}

			expect( i ).to.equal( 0 );
		} );
	} );

	describe( 'iterate trough the range `boundary`', () => {
		describe( 'range starts between elements', () => {
			let expected, range;

			before( () => {
				expected = [
					{ type: 'ELEMENT_START', item: paragraph },
					{ type: 'ELEMENT_START', item: bold },
					{ type: 'TEXT', text: 'ba' },
					{ type: 'ELEMENT_END', item: bold },
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_START', item: img2 },
					{ type: 'ELEMENT_END', item: img2 }
				];

				range = Range.createFromParentsAndOffsets( root, 1, paragraph, 3 );
			} );

			it( 'should iterating over the range', () => {
				let iterator = new TreeWalker( { boundaries: range } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should iterating over the range going backward', () => {
				let iterator = new TreeWalker( { boundaries: range, direction: 'BACKWARD' } );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'range starts inside the text', () => {
			let expected, range;

			before( () => {
				expected = [
					{ type: 'TEXT', text: 'a' },
					{ type: 'ELEMENT_END', item: bold },
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_START', item: img2 },
					{ type: 'ELEMENT_END', item: img2 }
				];

				range = Range.createFromParentsAndOffsets( ba, 1, paragraph, 3 );
			} );

			it( 'should return part of the text', () => {
				let iterator = new TreeWalker( { boundaries: range } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return part of the text going backward', () => {
				let iterator = new TreeWalker( {
						boundaries: range,
						direction: 'BACKWARD'
					}
				);
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'range ends inside the text', () => {
			let expected, range;

			before( () => {
				expected = [
					{ type: 'ELEMENT_START', item: img1 },
					{ type: 'ELEMENT_END', item: img1 },
					{ type: 'ELEMENT_START', item: paragraph },
					{ type: 'ELEMENT_START', item: bold },
					{ type: 'TEXT', text: 'b' }
				];

				range = new Range( rootBeginning, new Position( ba, 1 ) );
			} );

			it( 'should return part of the text', () => {
				let iterator = new TreeWalker( { boundaries: range } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return part of the text going backward', () => {
				let iterator = new TreeWalker( {
					boundaries: range,
					startPosition: range.end,
					direction: 'BACKWARD'
				} );

				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'custom start position', () => {
			it( 'should iterating from the start position', () => {
				let expected = [
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_START', item: img2 },
					{ type: 'ELEMENT_END', item: img2 }
				];

				let range = Range.createFromParentsAndOffsets( bold, 1, paragraph, 3 );

				let iterator = new TreeWalker( {
					boundaries: range,
					startPosition: new Position( paragraph, 1 )
				} );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should iterating from the start position going backward', () => {
				let expected = [
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_END', item: bold },
					{ type: 'TEXT', text: 'a' }
				];

				let range = new Range( new Position( ba, 1 ), new Position( paragraph, 3 ) );

				let iterator = new TreeWalker( {
					boundaries: range,
					startPosition: new Position( paragraph, 2 ),
					direction: 'BACKWARD'
				} );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ], { direction: 'BACKWARD' } );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );
		} );
	} );

	describe( 'iterate by every single characters `singleCharacter`', () => {
		describe( 'whole root', () => {
			let expected;

			before( () => {
				expected = [
					{ type: 'ELEMENT_START', item: img1 },
					{ type: 'ELEMENT_END', item: img1 },
					{ type: 'ELEMENT_START', item: paragraph },
					{ type: 'ELEMENT_START', item: bold },
					{ type: 'TEXT', text: 'b' },
					{ type: 'TEXT', text: 'a' },
					{ type: 'ELEMENT_END', item: bold },
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_START', item: img2 },
					{ type: 'ELEMENT_END', item: img2 },
					{ type: 'TEXT', text: 'x' },
					{ type: 'ELEMENT_END', item: paragraph }
				];
			} );

			it( 'should return single characters', () => {
				let iterator = new TreeWalker( { startPosition: rootBeginning, singleCharacters: true } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return single characters going backward', () => {
				let iterator = new TreeWalker( {
					startPosition: rootEnding,
					singleCharacters: true,
					direction: 'BACKWARD'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'range', () => {
			let range, expected;

			before( () => {
				expected = [
					{ type: 'TEXT', text: 'b' },
					{ type: 'TEXT', text: 'a' },
					{ type: 'ELEMENT_END', item: bold },
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_START', item: img2 }
				];

				range = new Range( new Position( bold, 0 ), new Position( img2, 0 ) );
			} );

			it( 'should respect boundaries', () => {
				let iterator = new TreeWalker( { boundaries: range, singleCharacters: true } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should respect boundaries going backward', () => {
				let iterator = new TreeWalker( {
					boundaries: range,
					singleCharacters: true,
					direction: 'BACKWARD'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );
	} );

	describe( 'iterate omitting child nodes and ELEMENT_END `shallow`', () => {
		let expected;

		before( () => {
			expected = [
				{ type: 'ELEMENT_START', item: img1 },
				{ type: 'ELEMENT_START', item: paragraph }
			];
		} );

		it( 'should not enter elements', () => {
			let iterator = new TreeWalker( { startPosition: rootBeginning, shallow: true } );
			let i = 0;

			for ( let value of iterator ) {
				expectValue( value, expected[ i ], { shallow: true } );
				i++;
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should not enter elements going backward', () => {
			let iterator = new TreeWalker( { startPosition: rootEnding, shallow: true, direction: 'BACKWARD' } );
			let i = expected.length;

			for ( let value of iterator ) {
				expectValue( value, expected[ --i ], { shallow: true, direction: 'BACKWARD' } );
			}

			expect( i ).to.equal( 0 );
		} );
	} );

	describe( 'iterate omitting ELEMENT_END `ignoreElementEnd`', () => {
		describe( 'merged text', () => {
			let expected;

			before( () => {
				expected = [
					{ type: 'ELEMENT_START', item: img1 },
					{ type: 'ELEMENT_START', item: paragraph },
					{ type: 'ELEMENT_START', item: bold },
					{ type: 'TEXT', text: 'ba' },
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_START', item: img2 },
					{ type: 'TEXT', text: 'x' }
				];
			} );

			it( 'should iterate ignoring ELEMENT_END', () => {
				let iterator = new TreeWalker( { startPosition: rootBeginning, ignoreElementEnd: true } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should iterate ignoring ELEMENT_END going backward', () => {
				let iterator = new TreeWalker( {
					startPosition: rootEnding,
					ignoreElementEnd: true,
					direction: 'BACKWARD'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'single character', () => {
			let expected;

			before( () => {
				expected = [
					{ type: 'ELEMENT_START', item: img1 },
					{ type: 'ELEMENT_START', item: paragraph },
					{ type: 'ELEMENT_START', item: bold },
					{ type: 'TEXT', text: 'b' },
					{ type: 'TEXT', text: 'a' },
					{ type: 'TEXT', text: 'r' },
					{ type: 'ELEMENT_START', item: img2 },
					{ type: 'TEXT', text: 'x' }
				];
			} );

			it( 'should return single characters ignoring ELEMENT_END', () => {
				let iterator = new TreeWalker( {
					startPosition: rootBeginning,
					singleCharacters: true,
					ignoreElementEnd: true
				} );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i ] );
					i++;
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return single characters ignoring ELEMENT_END going backward', () => {
				let iterator = new TreeWalker( {
					startPosition: rootEnding,
					singleCharacters: true,
					ignoreElementEnd: true,
					direction: 'BACKWARD'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'BACKWARD' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );
	} );
} );

function expectValue( value, expected, options ) {
	expect( value.type ).to.equal( expected.type );

	if ( value.type == 'TEXT' ) {
		expectText( value, expected, options );
	} else if ( value.type == 'ELEMENT_START' ) {
		expectStart( value, expected, options );
	} else if ( value.type == 'ELEMENT_END' ) {
		expectEnd( value, expected, options );
	}
}

function expectText( value, expected ) {
	expect( value.item._data ).to.equal( expected.text );
	expect( value.length ).to.equal( value.item._data.length );

	/**
	 * @TODO: Checking (next|prev)Position
	 */
}

function expectStart( value, expected, options = {} ) {
	let previousPosition, nextPosition;

	expect( value.item ).to.equal( expected.item );
	expect( value.length ).to.equal( 1 );

	if ( options.direction == 'BACKWARD' ) {
		previousPosition = Position.createAfter( value.item );
		nextPosition = Position.createBefore( value.item );
	} else {
		previousPosition = Position.createBefore( value.item );
		nextPosition = new Position( value.item, 0 );
	}

	if ( options.shallow ) {
		expect( value.previousPosition ).to.deep.equal( previousPosition );
	} else {
		expect( value.nextPosition ).to.deep.equal( nextPosition );
	}
}

function expectEnd( value, expected, options = {} ) {
	let previousPosition, nextPosition;

	expect( value.item ).to.equal( expected.item );
	expect( value.length ).to.be.undefined;

	if ( options.direction == 'BACKWARD' ) {
		previousPosition = Position.createAfter( value.item );
		nextPosition = new Position( value.item, value.item.getChildCount() );
	} else {
		previousPosition = new Position( value.item, value.item.getChildCount() );
		nextPosition = Position.createAfter( value.item );
	}

	expect( value.previousPosition ).to.deep.equal( previousPosition );
	expect( value.nextPosition ).to.deep.equal( nextPosition );
}
