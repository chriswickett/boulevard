import React, { Component} from 'react';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import CharacterNode from './CharacterNode';
import DialogueNode from './DialogueNode';
import ParentheticalNode from './ParentheticalNode';

const initialValue = Value.fromJSON({
  document: {
    nodes: [
      {
        object: 'block',
        type: 'paragraph',
        nodes: [
          {
            object: 'text',
            leaves: [
              {
                text: ''
              },
            ],
          },
        ],
      },
    ],
  },
})

export default class TextEditor extends Component {

  state = {
    value: initialValue,
  }

  keyHandlers = {
    "Tab": editor => {
      switch(editor.value.startBlock.type) {
        case "dialogue":
          return editor.setBlocks('parenthetical').insertText("()").moveAnchorBackward(1).moveFocusBackward(1);
        case "paragraph":
          return editor.setBlocks('character');
        default: return false;
      }
    },
    "Enter": editor => {
      switch(editor.value.startBlock.type) {
        case "character": return editor.splitBlock().setBlocks('dialogue');
        case "parenthetical":
          const offset = editor.value.selection.anchor.offset;
          const text = editor.value.startBlock.text;
          const secondLastChar = (offset === text.length - 1);
          const isLastCharCloseParenthetical = (text.charAt(offset) === ")");
          console.log(offset);
          console.log(text);
          console.log(isLastCharCloseParenthetical);
        if (secondLastChar && isLastCharCloseParenthetical) {
            return editor.moveAnchorForward(1).moveFocusForward(1).splitBlock().setBlocks('dialogue');
          } else {
            return editor.splitBlock().setBlocks('dialogue');
          }
        case "dialogue": return editor.splitBlock().setBlocks('paragraph');
        default: return editor.splitBlock();
      }
    },
    "Backspace": editor => {
      editor.moveFocusBackward(1).delete();
    }
  }

  onChange = ({ value }) => {
    this.setState({value})
  }

  onKeyDown = (e, editor) => {
    if (!this.keyHandlers.hasOwnProperty(e.key)) { return false; }
    e.preventDefault();
    return this.keyHandlers[e.key](editor);
  }

  renderNode = (props, editor, next) => {
    switch(props.node.type) {
      case 'character':
        return <CharacterNode {...props} />;
      case 'dialogue':
        return <DialogueNode {...props} />;
      case 'parenthetical':
        return <ParentheticalNode {...props} />;
      default:
        return next();
    }
  }

  render() {
    return (
      <Editor
        value={this.state.value}
        onKeyDown={(a,b) =>this.onKeyDown(a,b)}
        onChange={change => this.onChange(change)}
        renderNode={this.renderNode}
      />
    )
  }
}