import { DateTimeScalar } from './date-time';
import GraphQLJSON from 'graphql-type-json';

export const scalarResolvers = {
  DateTime: DateTimeScalar,
  JSON: GraphQLJSON
};
