/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// jshint node:true
'use strict';

import * as path from 'path';
import * as url from 'url';
import constants from './constants';
import {FileRelativeUrl, ResolvedUrl} from 'polymer-analyzer';

/**
 * A string representing a URL.
 */
export function ensureTrailingSlash(href: string) {
  return href.endsWith('/') ? href : (href + '/');
}

/**
 * Returns a URL with the basename removed from the pathname.  Strips the
 * search off of the URL as well, since it will not apply.
 */
export function stripUrlFileSearchAndHash<T>(href: T): T {
  const u = url.parse(href as any);
  // Using != so tests for null AND undefined
  if (u.pathname != null) {
    // Suffix path with `_` so that `/a/b/` is treated as `/a/b/_` and that
    // `path.posix.dirname()` returns `/a/b` because it would otherwise
    // return `/a` incorrectly.
    u.pathname = ensureTrailingSlash(
        path.posix.dirname(u.pathname + '_') as FileRelativeUrl);
  }
  // Assigning to undefined because TSC says type of these is
  // `string | undefined` as opposed to `string | null`
  u.search = undefined;
  u.hash = undefined;
  return url.format(u) as any as T;
}

/**
 * Returns true if the href is an absolute path.
 */
export function isAbsolutePath(href: string): boolean {
  return constants.ABS_URL.test(href);
}

/**
 * Returns true if the href is a templated value, i.e. `{{...}}` or `[[...]]`
 */
export function isTemplatedUrl(href: string): boolean {
  return href.search(constants.URL_TEMPLATE) >= 0;
}

/**
 * TODO(usergenic): Remove this hack if nodejs bug is fixed:
 * https://github.com/nodejs/node/issues/13683
 */
function pathPosixRelative(from: string, to: string): string {
  const relative = path.posix.relative(from, to);
  return path === path.win32 ? relative.replace(/\.\.\.\./g, '../..') :
                               relative;
}

/**
 * Modifies an href by the relative difference between the old base url and
 * the new base url.
 */
export function rewriteHrefBaseUrl<T>(
    href: T, oldBaseUrl: ResolvedUrl, newBaseUrl: ResolvedUrl): T|
    FileRelativeUrl {
  if (isAbsolutePath(href as any)) {
    return href;
  }
  const relativeUrl = url.resolve(oldBaseUrl, href as any);
  const parsedFrom = url.parse(newBaseUrl);
  const parsedTo = url.parse(relativeUrl);
  if (parsedFrom.protocol === parsedTo.protocol &&
      parsedFrom.host === parsedTo.host) {
    let dirFrom = path.posix.dirname(
        // Have to append a '_' to the path because path.posix.dirname('foo/')
        // returns '.' instead of 'foo'.
        parsedFrom.pathname ? parsedFrom.pathname + '_' : '');
    let pathTo = parsedTo.pathname || '';
    if (isAbsolutePath(oldBaseUrl) || isAbsolutePath(newBaseUrl)) {
      dirFrom = makeAbsolutePath(dirFrom);
      pathTo = makeAbsolutePath(pathTo);
    }
    const pathname = pathPosixRelative(dirFrom, pathTo);
    return url.format({
      pathname: pathname,
      search: parsedTo.search,
      hash: parsedTo.hash,
    }) as FileRelativeUrl;
  }
  return relativeUrl as FileRelativeUrl;
}

function makeAbsolutePath(path: string): string {
  return path.startsWith('/') ? path : '/' + path;
}
