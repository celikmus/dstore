# Data Modelling

In addition to handling collections of items, dstore also provides robust data modeling capabilities for managing individual objects themselves. dstore provides a data model class that includes multiple methods on data objects, for saving, validating, and monitoring objects for changes.

By default, all objects returned from a store (whether it be from iterating over a collection, or performing a get()) will be an instance of the store's data model. The default data model is `dstore/Model`. Since objects are instances of this model, they all inherit the following properties and methods:

### Property Summary

Property | Description
-------- | -----------
`schema` | The schema is an object with property definitions that define various metadata about the instance objects' properties.
`additionalProperties` | This indicates whether or not to allow additional properties outside of those defined by the schema. This defaults to true.

Method | Description
------ | -----------
`get(name)` | This returns the property value with the given name.
`set(name, value)` | This sets the value of a property.
`property(name)` | This returns a property object instance for the given name.
`observe(name, listener, options)` | This will listen for any changes to the value of the given property. See the Property's observe for the options.
`validate()` | This will validate the object, determining if there are any errors on the object.
`save()` | This will save the object, validating and then storing the object in the store.
`remove()` | This will delete the object from the object store.

## Property Objects

One of the key ideas in the dstore object model is the concept of property objects. A property object is a representation of single property on an object. The property object not only can provide the current value of a property, but can track meta-data about the property, such as property-specific validation information and whether or not the property is required. With the property object we can also monitor the property for changes, and modify the value of the property. A property object represents an encapsulation of a property that can easily be passed to different input components.

Property objects actually extend the data model class, so the methods listed for data objects above are available on property objects. The following additional methods are defined on property objects:

Method | Description
------ | -----------
`observe(listener, options)` | This registers a listener for any changes to the value of this property. The listener will be called with the current value (if it exists), and will be called with any future changes. The optional `options` object argument may include a `onlyFutureUpdates` set to true if the callback should not be called for the current value (only future updates).
`put(value)` | This requests a change in the value of this property. This may be coerced before being stored, and/or validated.
`valueOf()` | This returns the current value of the property object.
`validate()` | Called to validate the current property value. This should return a boolean indicating whether or not validation was successful, or a promise to a boolean. This should also result in the `errors` property being set, if any errors were found in the validation process.
`addError(error)` | This can be called to add an error to the list of validation errors for a property.

Property | Description
------ | -----------
`type` | This indicates the primitive type of the property value (string, number, boolean, or object).
`required` | This indicates whether a (non-empty) value is required for this property.
`errors` | This is an array of errors from the last validation of this property. This may be null to indicate no errors.
`_parent` | This is the parent object for the property.
`name` | This is the name of the property.
`validateOnSet` | This indicates whether or not to validate a property when a new value is set on it.
`validators` | This is an array of validators that can be applied on validation.

To get a property object from an data object, we simply call the property method:

	var nameProperty = object.property('name');

Once we have the property object, we can access meta-data, watch, and modify this property:


	nameProperty.required -> is it required?
	nameProperty.observe(function(newValue){
		// called with original value and each change
	});
	nameProperty.put("Mark");
	object.name -> "Mark"

## Schema

A data model is largely defined through the schema. The model object has a `schema` property to define the schema object and the schema object has properties with definitions that correspond to the properties of model instances that they describe. Each property's value is a property definition. A property definition can be a simple string, defining the primitive type to be accepted, or it can be a property definition object. The property definition can have the following properties and/or methods:

Property | Description
------ | -----------
`type` | This indicates the primitive type of the property value (string, number, boolean, or object).
`required` | This indicates whether a (non-empty) value is required for this property.

The property definition is used as the basis for the property object instances for each model instance's properties. If the property definition object is an instance of `dstore/Property`, it will be used as the direct prototype for the instance property objects. If not, the property definition will be used to construct a `dstore/Property` instance, (properties are copied over), to use as the prototype of the instance property objects.

You can also define your own methods, to override the normal validation, access, and modification functionality of properties, by subclassing `dstore/Property` or by directly defining methods in the property definition. The following methods can be defined or overriden:

Method | Description
------ | -----------
`checkForErrors(valueToValidate)` | This method can be overriden to provide custom validation functionality. This method should return an array of errors property. This can be return an empty array to indicate no errors were foudn.
`coerce(value)` | This method is responsible for coercing input values. The default implementation coerces to the provided type (for example, if the type was a `string`, any input values would be converted to a string).
`setValue(value, parent)` | This method can be called by a put() method to set the value of the underlying property. This can be overriden to define a custom setter.

Here is an example of creating a model using a schema:

    MyModel = declare(Model, {
        schema: {
            firstName: 'string', // simple definition
            lastName: {
                type: 'string',
                required: true
            }
        }
    });

We can then define our model as the model to be used for a store:

    myStore = new Rest({
        model: MyModel
    });

It is important to note that each store should have its own distinct model class.

### Computed Property Values

A computed property may be defined on the schema, by using the the `dstore/ComputedProperty` class. With a computed property, we can define a `getValue()` method to compute the value to be returned when a property is accessed. We can also define a `dependsOn` array to specify which properties we depend on. When the property is accessed or any of the dependent property changes, the property's value will be recomputed. The `getValue` is called with the values of the properties defined in the `dependsOn` array.

With a computed property, we may also want to write a custom `setValue()` method if we wish to support assignments to the computed property. A `setValue()` method may need to interact with the parent object to compute values and determine behavior. The parent is provided as the second argument.

Here is an example of a schema that with a computed property, `fullName`:

    schema: {
        firstName: 'string'
        lastName: 'string'
        fullName: {
            dependsOn: ['firstName', 'lastName'],
            getValue: function (firstName, lastName) {
                // compute the full name
                return firstName + ' ' + lastName;
            },
            setValue: function(value, parent){
                // support setting this property as well
                var parts = value.split(' ');
                parent.set('firstName', parts[0]);
                parent.set('lastName', parts[1]);
            }
        }
    }

The items in the `dependsOn' on array can be property names, or they can be other property objects. If other property objects are used, the computed property can be used as a standalone entity (it can be observed and values directly retrieved from it), without having to be attached to another parent object. The items in this array can be mixed, and include the property's own value as well (using its own name).

Note, that traditional getters and setters can effectively be defined by creating `valueOf()` and `put()` methods on the property definition. However, this is generally eschewed in dstore, since the primary use cases for getters and setters are better served by defining validation or creating a computed property.

### Validators

Validators are `Property` subclasses with more advanced validation capabilities. dstore includes several validators, that can be used, extended, or referenced for creating your own custom validators. To use a single validator, we can use it as the constructor for a property definition. For example, we could use the StringValidator to enforce the size of a string and acceptable characters:

    schema: {
        username: new StringValidator({
            // must be at least 4 characters
            minimumLength: 4,
            // and max of 20 characters
            maximumLength: 20,
            // and only letters or numbers
            pattern: /^\w+$/
        })
    }

dstore include several pre-built validators. These are the available validators, and their properties:
* StringValidator - Enforces string length and patterns.
    * minimumLength - Minimum length of the string
    * maximumLength - Maximum length of the string
    * pattern - Regular expression to test against the string
    * minimumLengthError - Error message when minimum length fails
    * maximumLengthError - Error message when maximum length fails
    * patternMatchError - The error when a pattern does not match
* NumericValidator - Enforces numbers and ranges of numbers.
    * minimum - The minimum value for the value 
    * maximum - The maximum value for the value
    * minimumError - The error message for values that are too low
    * maximumError - The error message for values that are too high
    * notANumberError - The error message for values that are not a number
* UniqueValidator - Enforces uniqueness of values, testing against a store.
    * uniqueStore - The store that will be accessed to determine if a value is unique
    * uniqueError - The error message for when the value is not unique

We can also combine validators. We can do this by using Dojo's `declare()` to mixin additional validators. For example, if we wanted to use the StringValidator in combination with the UniqueValidator, we could write:

    schema: {
        username: new (declare([StringValidator, UniqueValidator]))({
            pattern: /^\w+$/,
            // the store to do lookups for uniqueness
            uniqueStore: userStore
        })
    }

Or we can use the validators array to provide a set of validators that should be applied. For example, we could alternately write this:

    schema: {
        username: {
            validators: [
                new StringValidator({pattern: /^\w+$/}),
                new UniqueValidator({uniqueStore: userStore})
            ]
        }
    }

### Extensions

#### JSON Schema Based Models

Models can be defined through JSON Schema (v3). A Model based on a JSON Schema can be created with the `dstore/extensions/jsonSchema` module. For example:

    define(['dstore/extensions/jsonSchema', ...], function (jsonSchema, ...) {
        var myStore = new Memory({
            model: jsonSchema({
                properties: {
                    someProperty: {
                        type: "number",
                        minimum: 0,
                        maximum: 10
                    },
                }
            })
        })
