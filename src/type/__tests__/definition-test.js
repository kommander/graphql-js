/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

import inspect from '../../jsutils/inspect';
import {
  GraphQLSchema,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
} from '../';
import type { GraphQLFieldResolver } from '../';

const ObjectType = new GraphQLObjectType({ name: 'Object', fields: {} });
const InterfaceType = new GraphQLInterfaceType({
  name: 'Interface',
  fields: {},
});
const UnionType = new GraphQLUnionType({ name: 'Union', types: [ObjectType] });
const EnumType = new GraphQLEnumType({ name: 'Enum', values: { foo: {} } });
const InputObjectType = new GraphQLInputObjectType({
  name: 'InputObject',
  fields: {},
});
const ScalarType = new GraphQLScalarType({ name: 'Scalar', serialize() {} });

function schemaWithFieldType(type) {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: { field: { type } },
    }),
    types: [type],
  });
}

describe('Type System: Example', () => {
  it('defines an enum type with deprecated value', () => {
    const EnumTypeWithDeprecatedValue = new GraphQLEnumType({
      name: 'EnumWithDeprecatedValue',
      values: { foo: { deprecationReason: 'Just because' } },
    });

    expect(EnumTypeWithDeprecatedValue.getValues()[0]).to.deep.equal({
      name: 'foo',
      description: undefined,
      isDeprecated: true,
      deprecationReason: 'Just because',
      value: 'foo',
      astNode: undefined,
    });
  });

  it('defines an enum type with a value of `null` and `undefined`', () => {
    const EnumTypeWithNullishValue = new GraphQLEnumType({
      name: 'EnumWithNullishValue',
      values: {
        NULL: { value: null },
        UNDEFINED: { value: undefined },
      },
    });

    expect(EnumTypeWithNullishValue.getValues()).to.deep.equal([
      {
        name: 'NULL',
        description: undefined,
        isDeprecated: false,
        deprecationReason: undefined,
        value: null,
        astNode: undefined,
      },
      {
        name: 'UNDEFINED',
        description: undefined,
        isDeprecated: false,
        deprecationReason: undefined,
        value: undefined,
        astNode: undefined,
      },
    ]);
  });

  it('defines an object type with deprecated field', () => {
    const TypeWithDeprecatedField = new GraphQLObjectType({
      name: 'foo',
      fields: {
        bar: {
          type: GraphQLString,
          deprecationReason: 'A terrible reason',
        },
      },
    });

    expect(TypeWithDeprecatedField.getFields().bar).to.deep.equal({
      type: GraphQLString,
      deprecationReason: 'A terrible reason',
      isDeprecated: true,
      name: 'bar',
      args: [],
    });
  });

  it('stringifies simple types', () => {
    expect(String(GraphQLInt)).to.equal('Int');
    expect(String(ScalarType)).to.equal('Scalar');
    expect(String(ObjectType)).to.equal('Object');
    expect(String(InterfaceType)).to.equal('Interface');
    expect(String(UnionType)).to.equal('Union');
    expect(String(EnumType)).to.equal('Enum');
    expect(String(InputObjectType)).to.equal('InputObject');
    expect(String(GraphQLNonNull(GraphQLInt))).to.equal('Int!');
    expect(String(GraphQLList(GraphQLInt))).to.equal('[Int]');
    expect(String(GraphQLNonNull(GraphQLList(GraphQLInt)))).to.equal('[Int]!');
    expect(String(GraphQLList(GraphQLNonNull(GraphQLInt)))).to.equal('[Int!]');
    expect(String(GraphQLList(GraphQLList(GraphQLInt)))).to.equal('[[Int]]');
  });

  it('JSON stringifies simple types', () => {
    expect(JSON.stringify(GraphQLInt)).to.equal('"Int"');
    expect(JSON.stringify(ScalarType)).to.equal('"Scalar"');
    expect(JSON.stringify(ObjectType)).to.equal('"Object"');
    expect(JSON.stringify(InterfaceType)).to.equal('"Interface"');
    expect(JSON.stringify(UnionType)).to.equal('"Union"');
    expect(JSON.stringify(EnumType)).to.equal('"Enum"');
    expect(JSON.stringify(InputObjectType)).to.equal('"InputObject"');
    expect(JSON.stringify(GraphQLNonNull(GraphQLInt))).to.equal('"Int!"');
    expect(JSON.stringify(GraphQLList(GraphQLInt))).to.equal('"[Int]"');
    expect(JSON.stringify(GraphQLNonNull(GraphQLList(GraphQLInt)))).to.equal(
      '"[Int]!"',
    );
    expect(JSON.stringify(GraphQLList(GraphQLNonNull(GraphQLInt)))).to.equal(
      '"[Int!]"',
    );
    expect(JSON.stringify(GraphQLList(GraphQLList(GraphQLInt)))).to.equal(
      '"[[Int]]"',
    );
  });

  it('prohibits nesting NonNull inside NonNull', () => {
    // $DisableFlowOnNegativeTest
    expect(() => GraphQLNonNull(GraphQLNonNull(GraphQLInt))).to.throw(
      'Expected Int! to be a GraphQL nullable type.',
    );
  });

  it('allows a thunk for Union member types', () => {
    const union = new GraphQLUnionType({
      name: 'ThunkUnion',
      types: () => [ObjectType],
    });

    const types = union.getTypes();
    expect(types).to.have.members([ObjectType]);
  });

  it('does not mutate passed field definitions', () => {
    const outputFields = {
      field1: { type: GraphQLString },
      field2: {
        type: GraphQLString,
        args: {
          id: {
            type: GraphQLString,
          },
        },
      },
    };
    const testObject1 = new GraphQLObjectType({
      name: 'Test1',
      fields: outputFields,
    });
    const testObject2 = new GraphQLObjectType({
      name: 'Test2',
      fields: outputFields,
    });

    expect(testObject1.getFields()).to.deep.equal(testObject2.getFields());
    expect(outputFields).to.deep.equal({
      field1: {
        type: GraphQLString,
      },
      field2: {
        type: GraphQLString,
        args: {
          id: {
            type: GraphQLString,
          },
        },
      },
    });

    const inputFields = {
      field1: { type: GraphQLString },
      field2: { type: GraphQLString },
    };
    const testInputObject1 = new GraphQLInputObjectType({
      name: 'Test1',
      fields: inputFields,
    });
    const testInputObject2 = new GraphQLInputObjectType({
      name: 'Test2',
      fields: inputFields,
    });

    expect(testInputObject1.getFields()).to.deep.equal(
      testInputObject2.getFields(),
    );
    expect(inputFields).to.deep.equal({
      field1: { type: GraphQLString },
      field2: { type: GraphQLString },
    });
  });
});

describe('Field config must be object', () => {
  it('accepts an Object type with a field function', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields() {
        return {
          f: { type: GraphQLString },
        };
      },
    });
    expect(objType.getFields().f.type).to.equal(GraphQLString);
  });

  it('rejects an Object type field with undefined config', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {
        // $DisableFlowOnNegativeTest
        f: undefined,
      },
    });
    expect(() => objType.getFields()).to.throw(
      'SomeObject.f field config must be an object',
    );
  });

  it('rejects an Object type with incorrectly typed fields', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      // $DisableFlowOnNegativeTest
      fields: [{ field: GraphQLString }],
    });
    expect(() => objType.getFields()).to.throw(
      'SomeObject fields must be an object with field names as keys or a ' +
        'function which returns such an object.',
    );
  });

  it('rejects an Object type with a field function that returns incorrect type', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields() {
        // $DisableFlowOnNegativeTest
        return [{ field: GraphQLString }];
      },
    });
    expect(() => objType.getFields()).to.throw(
      'SomeObject fields must be an object with field names as keys or a ' +
        'function which returns such an object.',
    );
  });
});

describe('Field arg config must be object', () => {
  it('accepts an Object type with field args', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {
        goodField: {
          type: GraphQLString,
          args: {
            goodArg: { type: GraphQLString },
          },
        },
      },
    });
    expect(() => objType.getFields()).not.to.throw();
  });

  it('rejects an Object type with incorrectly typed field args', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {
        badField: {
          type: GraphQLString,
          // $DisableFlowOnNegativeTest
          args: [{ badArg: GraphQLString }],
        },
      },
    });
    expect(() => objType.getFields()).to.throw(
      'SomeObject.badField args must be an object with argument names as keys.',
    );
  });

  it('does not allow isDeprecated instead of deprecationReason on field', () => {
    expect(() => {
      const OldObject = new GraphQLObjectType({
        name: 'OldObject',
        fields: {
          // $DisableFlowOnNegativeTest
          field: { type: GraphQLString, isDeprecated: true },
        },
      });

      return schemaWithFieldType(OldObject);
    }).to.throw(
      'OldObject.field should provide "deprecationReason" instead ' +
        'of "isDeprecated".',
    );
  });
});

describe('Object interfaces must be array', () => {
  it('accepts an Object type with array interfaces', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      interfaces: [InterfaceType],
      fields: { f: { type: GraphQLString } },
    });
    expect(objType.getInterfaces()[0]).to.equal(InterfaceType);
  });

  it('accepts an Object type with interfaces as a function returning an array', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      interfaces: () => [InterfaceType],
      fields: { f: { type: GraphQLString } },
    });
    expect(objType.getInterfaces()[0]).to.equal(InterfaceType);
  });

  it('rejects an Object type with incorrectly typed interfaces', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {},
      // $DisableFlowOnNegativeTest
      interfaces: {},
    });
    expect(() => objType.getInterfaces()).to.throw(
      'SomeObject interfaces must be an Array or a function which returns an Array.',
    );
  });

  it('rejects an Object type with interfaces as a function returning an incorrect type', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {},
      // $DisableFlowOnNegativeTest
      interfaces() {
        return {};
      },
    });
    expect(() => objType.getInterfaces()).to.throw(
      'SomeObject interfaces must be an Array or a function which returns an Array.',
    );
  });
});

describe('Type System: Object fields must have valid resolve values', () => {
  function schemaWithObjectWithFieldResolver(
    resolveValue: GraphQLFieldResolver<*, *>,
  ) {
    const BadResolverType = new GraphQLObjectType({
      name: 'BadResolver',
      fields: {
        badField: {
          type: GraphQLString,
          resolve: resolveValue,
        },
      },
    });

    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          f: { type: BadResolverType },
        },
      }),
    });
  }

  it('accepts a lambda as an Object field resolver', () => {
    expect(() => schemaWithObjectWithFieldResolver(() => ({}))).not.to.throw();
  });

  it('rejects an empty Object field resolver', () => {
    // $DisableFlowOnNegativeTest
    expect(() => schemaWithObjectWithFieldResolver({})).to.throw(
      'BadResolver.badField field resolver must be a function if provided, ' +
        'but got: {}.',
    );
  });

  it('rejects a constant scalar value resolver', () => {
    // $DisableFlowOnNegativeTest
    expect(() => schemaWithObjectWithFieldResolver(0)).to.throw(
      'BadResolver.badField field resolver must be a function if provided, ' +
        'but got: 0.',
    );
  });
});

describe('Type System: Interface types must be resolvable', () => {
  it('accepts an Interface type defining resolveType', () => {
    expect(() => {
      const AnotherInterfaceType = new GraphQLInterfaceType({
        name: 'AnotherInterface',
        fields: { f: { type: GraphQLString } },
      });

      schemaWithFieldType(
        new GraphQLObjectType({
          name: 'SomeObject',
          interfaces: [AnotherInterfaceType],
          fields: { f: { type: GraphQLString } },
        }),
      );
    }).not.to.throw();
  });

  it('accepts an Interface with implementing type defining isTypeOf', () => {
    expect(() => {
      const InterfaceTypeWithoutResolveType = new GraphQLInterfaceType({
        name: 'InterfaceTypeWithoutResolveType',
        fields: { f: { type: GraphQLString } },
      });

      schemaWithFieldType(
        new GraphQLObjectType({
          name: 'SomeObject',
          interfaces: [InterfaceTypeWithoutResolveType],
          fields: { f: { type: GraphQLString } },
        }),
      );
    }).not.to.throw();
  });

  it('accepts an Interface type defining resolveType with implementing type defining isTypeOf', () => {
    expect(() => {
      const AnotherInterfaceType = new GraphQLInterfaceType({
        name: 'AnotherInterface',
        fields: { f: { type: GraphQLString } },
      });

      schemaWithFieldType(
        new GraphQLObjectType({
          name: 'SomeObject',
          interfaces: [AnotherInterfaceType],
          fields: { f: { type: GraphQLString } },
        }),
      );
    }).not.to.throw();
  });

  it('rejects an Interface type with an incorrect type for resolveType', () => {
    expect(
      () =>
        new GraphQLInterfaceType({
          name: 'AnotherInterface',
          fields: {},
          // $DisableFlowOnNegativeTest
          resolveType: {},
        }),
    ).to.throw(
      'AnotherInterface must provide "resolveType" as a function, but got: {}.',
    );
  });
});

describe('Type System: Union types must be resolvable', () => {
  const ObjectWithIsTypeOf = new GraphQLObjectType({
    name: 'ObjectWithIsTypeOf',
    fields: { f: { type: GraphQLString } },
  });

  it('accepts a Union type defining resolveType', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: [ObjectType],
        }),
      ),
    ).not.to.throw();
  });

  it('accepts a Union of Object types defining isTypeOf', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: [ObjectWithIsTypeOf],
        }),
      ),
    ).not.to.throw();
  });

  it('accepts a Union type defining resolveType of Object types defining isTypeOf', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: [ObjectWithIsTypeOf],
        }),
      ),
    ).not.to.throw();
  });

  it('rejects an Interface type with an incorrect type for resolveType', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: [],
          // $DisableFlowOnNegativeTest
          resolveType: {},
        }),
      ),
    ).to.throw(
      'SomeUnion must provide "resolveType" as a function, but got: {}.',
    );
  });
});

describe('Type System: Scalar types must be serializable', () => {
  it('accepts a Scalar type defining serialize', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLScalarType({
          name: 'SomeScalar',
          serialize: () => null,
        }),
      ),
    ).not.to.throw();
  });

  it('rejects a Scalar type not defining serialize', () => {
    expect(() =>
      schemaWithFieldType(
        // $DisableFlowOnNegativeTest
        new GraphQLScalarType({
          name: 'SomeScalar',
        }),
      ),
    ).to.throw(
      'SomeScalar must provide "serialize" function. If this custom Scalar ' +
        'is also used as an input type, ensure "parseValue" and "parseLiteral" ' +
        'functions are also provided.',
    );
  });

  it('rejects a Scalar type defining serialize with an incorrect type', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLScalarType({
          name: 'SomeScalar',
          // $DisableFlowOnNegativeTest
          serialize: {},
        }),
      ),
    ).to.throw(
      'SomeScalar must provide "serialize" function. If this custom Scalar ' +
        'is also used as an input type, ensure "parseValue" and "parseLiteral" ' +
        'functions are also provided.',
    );
  });

  it('accepts a Scalar type defining parseValue and parseLiteral', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLScalarType({
          name: 'SomeScalar',
          serialize: () => null,
          parseValue: () => null,
          parseLiteral: () => null,
        }),
      ),
    ).not.to.throw();
  });

  it('rejects a Scalar type defining parseValue but not parseLiteral', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLScalarType({
          name: 'SomeScalar',
          serialize: () => null,
          parseValue: () => null,
        }),
      ),
    ).to.throw(
      'SomeScalar must provide both "parseValue" and "parseLiteral" functions.',
    );
  });

  it('rejects a Scalar type defining parseLiteral but not parseValue', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLScalarType({
          name: 'SomeScalar',
          serialize: () => null,
          parseLiteral: () => null,
        }),
      ),
    ).to.throw(
      'SomeScalar must provide both "parseValue" and "parseLiteral" functions.',
    );
  });

  it('rejects a Scalar type defining parseValue and parseLiteral with an incorrect type', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLScalarType({
          name: 'SomeScalar',
          serialize: () => null,
          // $DisableFlowOnNegativeTest
          parseValue: {},
          // $DisableFlowOnNegativeTest
          parseLiteral: {},
        }),
      ),
    ).to.throw(
      'SomeScalar must provide both "parseValue" and "parseLiteral" functions.',
    );
  });
});

describe('Type System: Object types must be assertable', () => {
  it('accepts an Object type with an isTypeOf function', () => {
    expect(() => {
      schemaWithFieldType(
        new GraphQLObjectType({
          name: 'AnotherObject',
          fields: { f: { type: GraphQLString } },
        }),
      );
    }).not.to.throw();
  });

  it('rejects an Object type with an incorrect type for isTypeOf', () => {
    expect(() => {
      schemaWithFieldType(
        new GraphQLObjectType({
          name: 'AnotherObject',
          fields: {},
          // $DisableFlowOnNegativeTest
          isTypeOf: {},
        }),
      );
    }).to.throw(
      'AnotherObject must provide "isTypeOf" as a function, but got: {}.',
    );
  });
});

describe('Type System: Union types must be array', () => {
  it('accepts a Union type with array types', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: [ObjectType],
        }),
      ),
    ).not.to.throw();
  });

  it('accepts a Union type with function returning an array of types', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: () => [ObjectType],
        }),
      ),
    ).not.to.throw();
  });

  it('accepts a Union type without types', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: [],
        }),
      ),
    ).not.to.throw();
  });

  it('rejects a Union type with incorrectly typed types', () => {
    expect(() =>
      schemaWithFieldType(
        new GraphQLUnionType({
          name: 'SomeUnion',
          // $DisableFlowOnNegativeTest
          types: { ObjectType },
        }),
      ),
    ).to.throw(
      'Must provide Array of types or a function which returns such an array ' +
        'for Union SomeUnion.',
    );
  });
});

describe('Type System: Input Objects must have fields', () => {
  it('accepts an Input Object type with fields', () => {
    const inputObjType = new GraphQLInputObjectType({
      name: 'SomeInputObject',
      fields: {
        f: { type: GraphQLString },
      },
    });
    expect(inputObjType.getFields().f.type).to.equal(GraphQLString);
  });

  it('accepts an Input Object type with a field function', () => {
    const inputObjType = new GraphQLInputObjectType({
      name: 'SomeInputObject',
      fields() {
        return {
          f: { type: GraphQLString },
        };
      },
    });
    expect(inputObjType.getFields().f.type).to.equal(GraphQLString);
  });

  it('rejects an Input Object type with incorrect fields', () => {
    const inputObjType = new GraphQLInputObjectType({
      name: 'SomeInputObject',
      // $DisableFlowOnNegativeTest
      fields: [],
    });
    expect(() => inputObjType.getFields()).to.throw(
      'SomeInputObject fields must be an object with field names as keys or a ' +
        'function which returns such an object.',
    );
  });

  it('rejects an Input Object type with fields function that returns incorrect type', () => {
    const inputObjType = new GraphQLInputObjectType({
      name: 'SomeInputObject',
      // $DisableFlowOnNegativeTest
      fields: () => [],
    });
    expect(() => inputObjType.getFields()).to.throw(
      'SomeInputObject fields must be an object with field names as keys or a ' +
        'function which returns such an object.',
    );
  });
});

describe('Type System: Input Object fields must not have resolvers', () => {
  it('rejects an Input Object type with resolvers', () => {
    const inputObjType = new GraphQLInputObjectType({
      name: 'SomeInputObject',
      fields: {
        // $DisableFlowOnNegativeTest
        f: { type: GraphQLString, resolve: () => 0 },
      },
    });
    expect(() => inputObjType.getFields()).to.throw(
      'SomeInputObject.f field has a resolve property, ' +
        'but Input Types cannot define resolvers.',
    );
  });

  it('rejects an Input Object type with resolver constant', () => {
    const inputObjType = new GraphQLInputObjectType({
      name: 'SomeInputObject',
      fields: {
        // $DisableFlowOnNegativeTest
        f: { type: GraphQLString, resolve: {} },
      },
    });
    expect(() => inputObjType.getFields()).to.throw(
      'SomeInputObject.f field has a resolve property, ' +
        'but Input Types cannot define resolvers.',
    );
  });
});

describe('Type System: Enum types must be well defined', () => {
  it('accepts a well defined Enum type with empty value definition', () => {
    const enumType = new GraphQLEnumType({
      name: 'SomeEnum',
      values: {
        FOO: {},
        BAR: {},
      },
    });
    expect(enumType.getValue('FOO')).has.property('value', 'FOO');
    expect(enumType.getValue('BAR')).has.property('value', 'BAR');
  });

  it('accepts a well defined Enum type with internal value definition', () => {
    const enumType = new GraphQLEnumType({
      name: 'SomeEnum',
      values: {
        FOO: { value: 10 },
        BAR: { value: 20 },
      },
    });
    expect(enumType.getValue('FOO')).has.property('value', 10);
    expect(enumType.getValue('BAR')).has.property('value', 20);
  });

  it('rejects an Enum type with incorrectly typed values', () => {
    const config = {
      name: 'SomeEnum',
      // $DisableFlowOnNegativeTest
      values: [{ FOO: 10 }],
    };
    expect(() => new GraphQLEnumType(config)).to.throw(
      'SomeEnum values must be an object with value names as keys.',
    );
  });

  it('rejects an Enum type with missing value definition', () => {
    const config = {
      name: 'SomeEnum',
      // $DisableFlowOnNegativeTest
      values: { FOO: null },
    };
    expect(() => new GraphQLEnumType(config)).to.throw(
      'SomeEnum.FOO must refer to an object with a "value" key representing ' +
        'an internal value but got: null.',
    );
  });

  it('rejects an Enum type with incorrectly typed value definition', () => {
    const config = {
      name: 'SomeEnum',
      // $DisableFlowOnNegativeTest
      values: { FOO: 10 },
    };
    expect(() => new GraphQLEnumType(config)).to.throw(
      'SomeEnum.FOO must refer to an object with a "value" key representing ' +
        'an internal value but got: 10.',
    );
  });

  it('does not allow isDeprecated instead of deprecationReason on enum', () => {
    const config = {
      name: 'SomeEnum',
      values: {
        // $DisableFlowOnNegativeTest
        FOO: { isDeprecated: true },
      },
    };
    expect(() => new GraphQLEnumType(config)).to.throw(
      'SomeEnum.FOO should provide "deprecationReason" instead ' +
        'of "isDeprecated".',
    );
  });
});

describe('Type System: List must accept only types', () => {
  const types = [
    GraphQLString,
    ScalarType,
    ObjectType,
    UnionType,
    InterfaceType,
    EnumType,
    InputObjectType,
    GraphQLList(GraphQLString),
    GraphQLNonNull(GraphQLString),
  ];

  const notTypes = [{}, String, undefined, null];

  for (const type of types) {
    const typeStr = inspect(type);
    it(`accepts an type as item type of list: ${typeStr}`, () => {
      expect(() => GraphQLList(type)).not.to.throw();
    });
  }

  for (const type of notTypes) {
    const typeStr = inspect(type);
    it(`rejects a non-type as item type of list: ${typeStr}`, () => {
      // $DisableFlowOnNegativeTest
      expect(() => GraphQLList(type)).to.throw(
        `Expected ${typeStr} to be a GraphQL type.`,
      );
    });
  }
});

describe('Type System: NonNull must only accept non-nullable types', () => {
  const nullableTypes = [
    GraphQLString,
    ScalarType,
    ObjectType,
    UnionType,
    InterfaceType,
    EnumType,
    InputObjectType,
    GraphQLList(GraphQLString),
    GraphQLList(GraphQLNonNull(GraphQLString)),
  ];

  const notNullableTypes = [
    GraphQLNonNull(GraphQLString),
    {},
    String,
    undefined,
    null,
  ];

  for (const type of nullableTypes) {
    const typeStr = inspect(type);
    it(`accepts an type as nullable type of non-null: ${typeStr}`, () => {
      expect(() => GraphQLNonNull(type)).not.to.throw();
    });
  }

  for (const type of notNullableTypes) {
    const typeStr = inspect(type);
    it(`rejects a non-type as nullable type of non-null: ${typeStr}`, () => {
      // $DisableFlowOnNegativeTest
      expect(() => GraphQLNonNull(type)).to.throw(
        `Expected ${typeStr} to be a GraphQL nullable type.`,
      );
    });
  }
});
