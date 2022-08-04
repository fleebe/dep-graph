

const findInMap = (map, val) => {
  for (let [k, v] of map) {
    if (k === val) {
      return true;
    }
  }
  return false;
}


export default function addToMapArray(map, key, arrVal) {
  if (!findInMap(map, key)) {
    map.set(key, [arrVal]);
  } else {
    let v = map.get(key);
    if (v.indexOf(arrVal) === -1) {
      v.push(arrVal);
      map.set(key, v);
    }
  }
}
