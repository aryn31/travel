/**
 * The one constant the comment box and the server both need.
 *
 * Split out of lib/comments.ts because that module imports the database
 * client, and a `"use client"` component importing it would pull postgres
 * into the browser bundle -- the same split as lib/password-rules.ts.
 */
export const MAX_BODY = 2000;
