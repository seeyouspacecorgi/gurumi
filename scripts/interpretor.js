import { get } from 'svelte/store';
import { abbrv } from "../scripts/store.js";
let $abbrv = get(abbrv);


export const interpret = async data => {
  console.log("start transpile");

  if (!data || !data.length) return []; //Return if array is empty

  //Compare operation value to the store to check if it's valid
  const getValidOperations = ops => ops.reduce((all, op) => {
    if (op.type === 'stitch') {
      let value = $abbrv.values[$abbrv.keys.indexOf(op.value)];
      if (value) return [...all, {...op, value: value}];
    } else if (op.type === 'repeat') {
      return [...all, {...op, operations: getValidOperations(op.operations)}];
    }
    return all;
  },[]);

  //Sum each operation.times (before) and count increases and decreases (after)
  //Knowing the number of operations allows to deduce the number of repeat if it hasn't been specified
  const getOperationsCount = ops => ops.reduce((all, op) => {
    if (op.type === 'stitch') {
      let m = op.value === 'aug' ? 2
            : op.value === 'dim' ? -1
            : 1;
      return { before: all.before + op.times, after: all.after + op.times * m }
    } else if (op.type === 'repeat') {
      let repeat_count = getOperationsCount(op.operations);
      return {before: all.before + repeat_count.before * op.times, after: all.after + repeat_count.after * op.times}
    }
    return all;
  }, {before:0, after:0})

  //Loop through each row to check operation validity, then count stitches
  return data.map(row => {return {...row, operations: getValidOperations(row.operations)}})
             .map(row => {return {...row, ...getOperationsCount(row.operations)}})
}
