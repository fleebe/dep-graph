
/**
 * checks if the given val is a key in the map
 * @param {*} map 
 * @param {*} val 
 * @returns boolean
 */
const findInMap = (map, val) => {
  for (let [key] of map) {
    if (key === val) {
      return true;
    }
  }
  return false;
}

/**
 * Adds the arrVal to the map with the passed key 
 * if the key exists then adds the arrVal if it does not exist in the array already.
 * @param {*} map 
 * @param {*} key 
 * @param {*} arrVal primitive | array
 * * @returns map with arrVal added to the array specified by the key
 */
export default function addToMapArray(map, key, arrVal) {
  if (!findInMap(map, key)) {
    return map.set(key, [arrVal]);
  } else {
    let uniq = new Set(map.get(key));
    if (arrVal instanceof Array) {
      if (arrVal.length > 0) {
        uniq.add(...arrVal);
      }
    } else {
      uniq.add(arrVal);
    }
    return map.set(key, Array.from(uniq));
  }
}
