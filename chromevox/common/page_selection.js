// Copyright 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A class representing a DOM selection conveyed through
 * CursorSelection idioms.
 * A PageSelection is just a DOM selection. The class itself manages a single
 * CursorSelection that surrounds a fragment on the page. It also provides an
 * extend operation to either grow or shrink the selection given a
 * CursorSelection. The class handles correctly moving the internal
 * CursorSelection and providing immediate access to a full description of the
 * selection at any time.
 * @author dtseng@google.com (David Tseng)
 */

goog.provide('cvox.PageSelection');

goog.require('cvox.AbstractEarcons');
goog.require('cvox.CursorSelection');
goog.require('cvox.NavDescription');

/**
 * @constructor
 * @param {!cvox.CursorSelection} sel The initial selection.
 */
cvox.PageSelection = function(sel) {
  this.sel_ = sel.clone();
  this.sel_.select();
  this.wasBegin_ = true;
};


/**
 * Gets a description for the DOM selection taking into account the previous
 * and current CursorSelection's.
 * @param {cvox.NavigationShifter} navShifter Used to obtain walker-based
 * descriptions.
 * @param {!cvox.CursorSelection} prevSel Previous CursorSelection in
 * navigation.
 * @param {!cvox.CursorSelection} curSel Current CursorSelection in navigation.
 * @return {Array.<cvox.NavDescription>} The new description.
 */
cvox.PageSelection.prototype.getDescription =
    function(navShifter, prevSel, curSel) {
  var desc = [];
  if (this.sel_.isReversed() != curSel.isReversed()) {
    // A shrinking selection.
    desc = navShifter.getDescription(curSel, prevSel);
    desc[0].annotation = cvox.ChromeVox.msgs.getMsg('describe_unselected');
    desc[0].pushEarcon(cvox.AbstractEarcons.SELECTION_REVERSE);
  } else {
    // A growing selection.
    desc = navShifter.getDescription(prevSel, curSel);
    desc[0].annotation = cvox.ChromeVox.msgs.getMsg('describe_selected');
    desc[0].pushEarcon(cvox.AbstractEarcons.SELECTION);
    if (!this.wasBegin_ && this.sel_.absEquals(curSel.clone().normalize())) {
      // A selection has inverted across the start cursor. Describe it.
      var prevDesc = navShifter.getDescription(curSel, prevSel);
      prevDesc[0].annotation =
          cvox.ChromeVox.msgs.getMsg('describe_unselected');
      prevDesc[0].pushEarcon(cvox.AbstractEarcons.SELECTION_REVERSE);
      prevDesc[0].pushEarcon(cvox.AbstractEarcons.WRAP);
      desc = prevDesc.concat(desc);
    }
  }
  return desc;
};


/**
 * Extends this selection.
 * @param {!cvox.CursorSelection} sel Extend DOM selection to the selection.
 * @return {boolean} True if the extension occurred, false if the PageSelection
 * was reset to sel.
 */
cvox.PageSelection.prototype.extend = function(sel) {
  if (!this.sel_.directedBefore(sel)) {
    // Do not allow for crossed selections. This restarts a page selection that
    // has been collapsed. This occurs when two CursorSelection's point away
    // from one another.
    this.sel_ = sel.clone();
  } else {
    // Otherwise, it is assumed that the CursorSelection's are in directed
    // document order. The CursorSelection's are either pointing in the same
    // direction or towards one another. In the first case, shrink/extend this
    // PageSelection to the end of "sel". In the second case, shrink/extend this
    // PageSelection to the start of "sel".
    this.sel_.end = this.sel_.isReversed() == sel.isReversed() ?
        sel.end.clone() : sel.start.clone();
  }
  this.sel_.select();
  this.wasBegin_ = false;
  return !this.sel_.absEquals(sel);
};
