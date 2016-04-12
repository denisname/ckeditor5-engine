/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import DomEventObserver from './domeventobserver.js';

/**
 * {@link engine.treeView.TreeView#focus Focus} and {@link engine.treeView.TreeView#blur blur} events observer.
 *
 * @memberOf engine.treeView.observer
 * @extends engine.treeView.observer.DomEventObserver
 */
export default class FocusObserver extends DomEventObserver {
	constructor( treeView ) {
		super( treeView );

		this.domEventType = [ 'focus', 'blur' ];
	}

	onDomEvent( domEvt ) {
		this.fire( domEvt.type, domEvt );
	}
}

/**
 * Fired when one of the editables gets focus.
 *
 * @event engine.treeView.TreeView#focus
 * @param {engine.treeView.observer.DomEventData} data Event data.
 */

/**
 * Fired when one of the editables loses focus.
 *
 * @event engine.treeView.TreeView#blur
 * @param {engine.treeView.observer.DomEventData} data Event data.
 */