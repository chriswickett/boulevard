import React, { Component} from 'react';
import { Editor } from 'slate-react';
import CharacterNode from './CharacterNode';
import DialogueNode from './DialogueNode';
import ActionNode from './ActionNode';
import ParentheticalNode from './ParentheticalNode';
import { Value } from 'slate';

export default class TextEditor extends Component {

  state = {
    value: Value.fromJSON(this.props.value.data),
  }

  keyHandlers = {
    "Tab": editor => {
      switch(editor.value.startBlock.type) {
        case "dialogue":
          if (editor.value.startBlock.text.length > 0) return true;
          return editor.setBlocks('parenthetical').insertText("()").moveAnchorBackward(1).moveFocusBackward(1);
        case "action":
          return editor.setBlocks('character');
        default: return true;
      }
    },
    "Enter": editor => {
      switch(editor.value.startBlock.type) {
        case "character": return editor.splitBlock().setBlocks('dialogue');
        case "parenthetical":
          const offset = editor.value.selection.anchor.offset;
          const text = editor.value.startBlock.text;
          if (offset === text.length - 1 && text.charAt(offset) === ")") {
            return editor.moveAnchorForward(1).moveFocusForward(1).splitBlock().setBlocks('dialogue');
          } else {
            return editor.splitBlock().setBlocks('dialogue');
          }
        case "dialogue": return editor.splitBlock().setBlocks('action');
        default: return editor.splitBlock();
      }
    },
    "Backspace": editor => {
      editor.moveFocusBackward(1).delete();
    }
  }

  onChange = ({ value }) => {
    if (value.document !== this.state.value.document) {
      localStorage.setItem('content', JSON.stringify(value))
    }

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
      case 'action':
        return <ActionNode {...props} />;
      default:
        return next();
    }
  }

  static getDerivedStateFromProps = (props, state) => {
    // Override the state from the open dialogue
    if (props.value.opened) {
      delete props.value['opened'];
      return {value: Value.fromJSON(props.value.data)};
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