const removeKey = (obj, key) => {
  for(prop in obj) {
    if (prop === key)
      delete obj[prop];
    else if (typeof obj[prop] === 'object')
      removeKey(obj[prop], key);
  }
}

const markWrapper = {
  bold(text)      { return `**${text}**` },
  italic(text)    { return `*${text}*`},
  underline(text) { return `_${text}_`}
}

const buildObject = (obj) => {

  removeKey(obj, "data");
  removeKey(obj, "object");

  let _obj = [];
  obj.document.nodes.forEach(node => {
    let leaves = node.nodes[0].leaves;
    leaves = leaves.map(leaf => {
      let markTypes = leaf.marks.map(mark => mark.type);
      if (markTypes.length > 0) {
        return markTypes.reduce((text, markType) => {
          if (leaf.text.length === 0) return "";
          return markWrapper[markType](text);
        }, leaf.text);
      } else {
        return leaf.text;
      }
    });

    let _node = {
      type: node.type,
      text: leaves.join('')
    };

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

module.exports = buildFountainTxt;