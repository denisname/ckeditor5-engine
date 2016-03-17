/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: treeview */

'use strict';

import DomEventObserver from '/ckeditor5/core/treeview/observer/domeventobserver.js';
import TreeView from '/ckeditor5/core/treeview/treeview.js';

class TestObserver extends DomEventObserver {
	constructor( treeView ) {
		super( treeView );

		this.domEventType = 'click';
	}

	onDomEvent( domEvt ) {
		this.fire( 'click', 'foo', domEvt );
	}
}

describe( 'DomEventObserver', () => {
	let treeView;

	beforeEach( () => {
		treeView = new TreeView();
	} );

	it( 'should add event listener', () => {
		const domElement = document.createElement( 'p' );
		const domEvent = new MouseEvent( 'click' );
		const evtSpy = sinon.spy();

		treeView.createRoot( domElement, 'root' );
		treeView.addObserver( TestObserver );
		treeView.on( 'click', evtSpy );

		domElement.dispatchEvent( domEvent );

		expect( evtSpy.calledOnce ).to.be.true;
		expect( evtSpy.args[ 0 ][ 1 ] ).to.equal( 'foo' );
		expect( evtSpy.args[ 0 ][ 2 ] ).to.equal( domEvent );
	} );

	it( 'should not fire event if observer is disabled', () => {
		const domElement = document.createElement( 'p' );
		const domEvent = new MouseEvent( 'click' );
		const evtSpy = sinon.spy();

		treeView.createRoot( domElement, 'root' );
		treeView.addObserver( TestObserver );
		treeView.on( 'click', evtSpy );

		const testObserver = Array.from( treeView._observers )[ 0 ];
		testObserver.disable();

		domElement.dispatchEvent( domEvent );

		expect( evtSpy.called ).to.be.false;
	} );

	it( 'should fire event if observer is disabled and re-enabled', () => {
		const domElement = document.createElement( 'p' );
		const domEvent = new MouseEvent( 'click' );
		const treeView = new TreeView();
		const evtSpy = sinon.spy();

		treeView.createRoot( domElement, 'root' );
		treeView.addObserver( TestObserver );
		treeView.on( 'click', evtSpy );

		const testObserver = Array.from( treeView._observers )[ 0 ];

		testObserver.disable();

		domElement.dispatchEvent( domEvent );

		expect( evtSpy.called ).to.be.false;

		testObserver.enable();

		domElement.dispatchEvent( domEvent );

		expect( evtSpy.calledOnce ).to.be.true;
	} );

	describe( 'fire', () => {
		it( 'should do nothing if observer is disabled', () => {
			const testObserver = new TestObserver( treeView );
			const fireSpy = sinon.spy( treeView, 'fire' );

			testObserver.disable();

			testObserver.fire( 'click' );

			expect( fireSpy.called ).to.be.false;

			testObserver.enable();

			testObserver.fire( 'click' );

			expect( fireSpy.calledOnce ).to.be.true;
		} );
	} );
} );
