define([
	'require',
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/json',
	'dojo/_base/lang',
	'dojo/when',
	'dojo/store/JsonRest',
	'dstore/legacy/StoreAdapter'
], function (require, registerSuite, assert, declare, JSON, lang, when, JsonRest, StoreAdapter) {

	var legacyStore = new JsonRest({
		target: require.toUrl('dstore/tests/x.y').match(/(.+)x\.y$/)[1],
		remove: function () {
			var result = this.inherited(arguments);
			return result.then(function (response) {
				return response && JSON.parse(response);
			});
		}
	});
	var adaptedStore = StoreAdapter.adapt(legacyStore, {
	});
	adaptedStore.model.prototype.describe = function () {
		return 'name is ' + this.name;
	};


	var	store  = new (declare([JsonRest, StoreAdapter]))({
		target: require.toUrl('dstore/tests/x.y').match(/(.+)x\.y$/)[1],
		remove: function () {
			var result = this.inherited(arguments);
			return result.then(function (response) {
				return response && JSON.parse(response);
			});
		}
	});
	store.model.prototype.describe = function () {
		return 'name is ' + this.name;
	};

	registerSuite({
		name: 'legacy dstore adapter - JsonRest',

		'get': function () {
			var d = this.async();
			store.get('data/node1.1').then(d.callback(function (object) {
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
				assert.strictEqual(store.getIdentity(object), 'node1.1');
			}));
		},

		'query': function () {
			return when(store.filter('data/treeTestRoot').fetch()).then(function (results) {
				var object = results[0];
				assert.strictEqual(object.name, 'node1');
				assert.strictEqual(object.describe(), 'name is node1');
				assert.strictEqual(object.someProperty, 'somePropertyA');
			});
		},

		'query iterative': function () {
			var d = this.async();
			var i = 0;
			return store.filter('data/treeTestRoot').forEach(d.rejectOnError(function (object) {
				i++;
				assert.strictEqual(object.name, 'node' + i);
			}));
		}
	});

	registerSuite({
		name: 'legacy dstore adapter - JsonRest - adapted obj',

		'get': function () {
			var d = this.async();
			return adaptedStore.get('data/node1.1').then(d.callback(function (object) {
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
				assert.strictEqual(adaptedStore.getIdentity(object), 'node1.1');
			}));
		},

		'query': function () {
			return when(adaptedStore.filter('data/treeTestRoot').fetch()).then(function (results) {
				var object = results[0];
				assert.strictEqual(object.name, 'node1');
				assert.strictEqual(object.describe(), 'name is node1');
				assert.strictEqual(object.someProperty, 'somePropertyA');
			});
		},

		'query iterative': function () {
			var d = this.async();
			var i = 0;
			return adaptedStore.filter('data/treeTestRoot').forEach(d.rejectOnError(function (object) {
				i++;
				assert.strictEqual(object.name, 'node' + i);
			}));
		}
	});
});
