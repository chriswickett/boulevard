const _ = require("underscore");
const fs = require('fs');

const removeKey = (obj, key) => {
  for(prop in obj) {
    if (prop === key)
      delete obj[prop];
    else if (typeof obj[prop] === 'object')
      removeKey(obj[prop], key);
  }
}

const buildObject = (obj) => {

  console.log(obj);

  removeKey(obj, "marks");
  removeKey(obj, "data");
  removeKey(obj, "object");

  let _obj = [];
  obj.document.nodes.forEach(node => {
    let _node = {type: node.type, text: node.nodes[0].leaves[0].text };
    _obj.push(_node);
  });
  return _obj;
}

const buildFountain = obj => {
  let txt = "";
  obj.forEach(element => {
    console.log(element);
    switch (element.type) {
      case "sceneHeader":
        return txt += `${element.text.toUpperCase()}\n`;
      case "action":
        return txt += `${element.text}\n`;
      case "dialogue":
        return txt += `${element.text}\n`;
      case "character":
        return txt += `${element.text.toUpperCase()}\n`;
      case "parenthetical":
        return txt += `${element.text}\n`;
      default: return true;
    }
  });
  return txt;
};

const buildFountainTxt = input => {
  return buildFountain(buildObject(input));
}

// fs.writeFile("/Users/chriswickett/Desktop/fount/fountain.txt", fountain, () => {
//   console.log("Done.");
// });

module.exports = buildFountainTxt;