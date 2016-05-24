/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import DomEventObserver from './domeventobserver.js';
import { getCode } from '../../../utils/keyboard.js';

/**
 * {@link engine.view.Document#keydown Key down} event observer.
 *
 * @memberOf engine.view.observer
 * @extends engine.view.observer.DomEventObserver
 */
export default class KeyObserver extends DomEventObserver {
	constructor( document ) {
		super( document );

		this.domEventType = 'keydown';
	}

	onDomEvent( domEvt ) {
		this.fire( 'keydown', domEvt, {
			keyCode: domEvt.keyCode,

			altKey: domEvt.altKey,
			ctrlKey: domEvt.ctrlKey || domEvt.metaKey,
			shiftKey: domEvt.shiftKey,

			get keystroke() {
				return getCode( this );
			}
		} );
	}
}

/**
 * Fired when a key has been pressed.
 *
 * @event engine.view.Document#keydown
 * @param {engine.view.observer.keyObserver.KeyEventData} keyEventData
 */

/**
 * The value of the {@link engine.view.Document#keydown} event.
 *
 * @class engine.view.observer.keyObserver.KeyEventData
 * @extends engine.view.observer.DomEventData
 * @implements utils.keyboard.KeystrokeData
 */

/**
 * Code of the whole keystroke. See {@link utils.keyboard.getCode}.
 *
 * @readonly
 * @member {Number} engine.view.observer.keyObserver.KeyEventData#keystroke
 */