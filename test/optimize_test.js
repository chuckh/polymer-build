/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

const assert = require('chai').assert;
const vfs = require('vinyl-fs-fake');

const PolymerProject = require('../lib/polymer-project').PolymerProject;
const optimize = require('../lib/optimize').optimize;

suite('optimize()', () => {

  function testStream(stream, cb) {
    stream.on('data', (data) => {
      cb(null, data)
    });
    stream.on('error', (err) => cb(err));
  }

  test('css', (done) => {
    let stream = vfs.src([
      {
        path: 'foo.css',
        contents: '/* comment */ selector { property: value; }',
      },
    ]);
    let op = stream.pipe(optimize({css: {stripWhitespace: true}}));
    assert.notEqual(stream, op, 'stream should be wrapped');
    testStream(op, (err, f) => {
      if (err) {
        return done(err);
      }
      assert.equal(f.contents.toString(), 'selector{property:value;}');
      done();
    });
  });

  test('js', (done) => {
    let stream = vfs.src([
      {
        path: 'foo.js',
        contents: 'var foo = 3',
      },
    ]);
    let op = stream.pipe(optimize({js: {minify: true}}));
    assert.notEqual(stream, op);
    testStream(op, (err, f) => {
      if (err) {
        return done(err);
      }
      assert.equal(f.contents.toString(), 'var foo=3;');
      done();
    });
  });

  test('all together', (done) => {
    let expected =
      `<!DOCTYPE html><html><head><style>foo{background:blue;}</style><script>document.registerElement("x-foo",XFoo);</script></head><body><x-foo>bar</x-foo></body></html>`;
    let stream = vfs.src([
      {
        path: 'foo.html',
        contents: `
        <!doctype html>
        <style>
          foo {
            background: blue;
          }
        </style>
        <script>
          document.registerElement('x-foo', XFoo);
        </script>
        <x-foo>
          bar
        </x-foo>
        `,
      },
    ], {cwdbase: true});
    let options = {
      html: {
        collapseWhitespace: true,
        removeComments: true,
      },
      css: {
        stripWhitespace: true,
      },
      js: {
        minify: true,
      },
    };
    let project = new PolymerProject({
      entrypoint: 'entrypoint.html',
      shell: 'shell.html',
    });
    let op = stream.pipe(project.splitHtml());
    op = op.pipe(optimize(options)).pipe(project.rejoinHtml());
    testStream(op, (err, f) => {
      if (err) {
        return done(err);
      }
      assert.equal(f.contents.toString(), expected);
      done();
    });
  });
});
