// Copyright 2014 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.provide('goog.labs.testing.environmentTest');
goog.setTestOnly('goog.labs.testing.environmentTest');

goog.require('goog.labs.testing.Environment');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.TestCase');
goog.require('goog.testing.jsunit');

var testCase = null;
var mockControl = null;

// Use this flag to control whether the global JsUnit lifecycle events are being
// called as part of the test lifecycle or as part of the "mocked" environment.
var testing = false;

function setUp() {
  if (testing) {
    return;
  }

  // Temporarily override the initializeTestRunner method to avoid installing
  // our "test" TestCase.
  var initFn = goog.testing.TestCase.initializeTestRunner;
  goog.testing.TestCase.initializeTestRunner = function() {};
  testCase = new goog.labs.testing.EnvironmentTestCase_();
  goog.labs.testing.EnvironmentTestCase_.getInstance = function() {
    return testCase;
  };
  goog.testing.TestCase.initializeTestRunner = initFn;

  mockControl = new goog.testing.MockControl();
}

function tearDown() {
  if (testing) {
    return;
  }

  mockControl.$tearDown();
}

function testLifecycle() {
  testing = true;

  var envOne = mockControl.createStrictMock(goog.labs.testing.Environment);
  var envTwo = mockControl.createStrictMock(goog.labs.testing.Environment);
  var envThree = mockControl.createStrictMock(goog.labs.testing.Environment);
  var testMethod = mockControl.createFunctionMock('testMethod');

  testCase.addNewTest('testFake', testMethod);

  testCase.registerEnvironment_(envOne);
  testCase.registerEnvironment_(envTwo);
  testCase.registerEnvironment_(envThree);

  envOne.setUpPage();
  envTwo.setUpPage();
  envThree.setUpPage();

  envOne.setUp();
  envTwo.setUp();
  envThree.setUp();

  testMethod();

  envThree.tearDown();
  envTwo.tearDown();
  envOne.tearDown();

  envThree.tearDownPage();
  envTwo.tearDownPage();
  envOne.tearDownPage();

  mockControl.$replayAll();
  testCase.runTests();
  mockControl.$verifyAll();

  testing = false;
}

function testAutoDiscoverTests() {
  testing = true;

  var setUpPageFn = testCase.setUpPage;
  var setUpFn = testCase.setUp;
  var tearDownFn = testCase.tearDownFn;
  var tearDownPageFn = testCase.tearDownPageFn;

  testCase.autoDiscoverTests();

  assertEquals(setUpPageFn, testCase.setUpPage);
  assertEquals(setUpFn, testCase.setUp);
  assertEquals(tearDownFn, testCase.tearDownFn);
  assertEquals(tearDownPageFn, testCase.tearDownPageFn);

  // Note that this number changes when more tests are added this file as
  // the environment reflects on the window global scope for JsUnit.
  assertEquals(5, testCase.tests_.length);

  testing = false;
}

function testMockClock() {
  testing = true;

  var env = new goog.labs.testing.Environment().withMockClock();
  assertNull(env.mockClock); // Not created before test runs.

  testCase.addNewTest('testThatThrowsEventually', function() {
    setTimeout(function() {
      throw new Error('LateErrorMessage');
    }, 200);
  });

  testCase.runTests();
  assertTestFailure(testCase, 'testThatThrowsEventually', 'LateErrorMessage');
  assertTrue(env.mockClock.isDisposed());
  assertNull(env.mockControl);

  testing = false;
}

function testMockControl() {
  testing = true;

  var env = new goog.labs.testing.Environment().withMockControl();
  var test = env.mockControl.createFunctionMock('test');

  testCase.addNewTest('testWithoutVerify', function() {
    test();
    env.mockControl.$replayAll();
    test();
  });

  testCase.runTests();
  assertNull(env.mockClock);

  testing = false;
}

function testMock() {
  testing = true;

  var env = new goog.labs.testing.Environment().withMockControl();
  var mock = env.mock({
    test: function() {}
  });

  testCase.addNewTest('testMockCalled', function() {
    mock.test().$times(2);

    env.mockControl.$replayAll();
    mock.test();
    mock.test();
    env.mockControl.verifyAll();
  });

  testCase.runTests();

  testing = false;
}

function assertTestFailure(testCase, name, message) {
  assertContains(message, testCase.result_.resultsByName[name][0]);
}
