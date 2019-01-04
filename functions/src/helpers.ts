const lodash = require('lodash');

/**
 * Extract list from filename supplied as argument
 */
export const extractListFromFilename = (fileName: string): string => {
  return fileName.match(/^[^-]*[^ -]/g)[0];
};

/**
 * Splits an array into a bunch of arrays
 * GROUPED BY a
 * composite key ( 2nd parameter: values )
 */
export const groupByMulti = (list, values: Array<any>, context: Object): Array<any> => {
  if (!values.length) {
    return list;
  }
  const byFirst = lodash.groupBy(list, values[0], context),
    rest = values.slice(1);
  for (const prop in byFirst) {
    byFirst[prop] = groupByMulti(byFirst[prop], rest, context);
  }
  return byFirst;
};