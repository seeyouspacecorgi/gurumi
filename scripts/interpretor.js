import { get } from 'svelte/store';
import { abbrv } from "../scripts/store.js";
let $abbrv = get(abbrv);

export const interpret = async data => {
  console.log("start transpile");
  if (!data || !data.length) return []; //Return if array is empty

  const validate = arr => arr.reduce((all,obj) => {
    if (obj.type === 'stitch') {
      let value = $abbrv.values[$abbrv.keys.indexOf(obj.value)]; // Compare stitch value to store and return if valid
      if (value) return [...all, {...obj, value: value}]
    }
    else if (obj.type === 'repeat') {
      return [...all, {...obj, stitches: validate(obj.stitches)}];
    }
    return all
  },[]);

  return validate(data);
}
