import React, { Component} from 'react';
import { Editor } from 'slate-react';
import CharacterNode from './nodes/CharacterNode';
import DialogueNode from './nodes/DialogueNode';
import ActionNode from './nodes/ActionNode';
import ParentheticalNode from './nodes/ParentheticalNode';
import BoldMark from './marks/BoldMark';
import ItalicMark from './marks/ItalicMark';
import UnderlineMark from './marks/UnderlineMark';

import SceneHeaderNode from './nodes/SceneHeaderNode';
import { Value } from 'slate';

const { ipcRenderer } = window.require('electron');

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
        case "sceneHeader": return editor.splitBlock().setBlocks('action');
        default: return editor.splitBlock();
      }
    },
    "Backspace": editor => {
      editor.moveFocusBackward(1).delete();
    },
    ".": editor => {
      if (!!editor.value.startBlock.text.match(/^INT|^EXT/)) {
        editor.setBlocks('sceneHeader').insertText(".")
      } else {
        editor.insertText(".")
      }
    },

  }

  onChange = ({ value }) => {
    if (value.document !== this.state.value.document) {
      localStorage.setItem('content', JSON.stringify(value.toJSON()));
      ipcRenderer.send('contentChanged');
    }

    this.setState({value})
  }

  onKeyDown = (e, editor) => {
    if (this.keyHandlers.hasOwnProperty(e.key)){
      e.preventDefault();
      return this.keyHandlers[e.key](editor);
    } else if (e.metaKey) {
      switch (e.key) {
        case "z": e.preventDefault(); return editor.undo();
        case "y": e.preventDefault(); return editor.redo();
        case "b": e.preventDefault(); return editor.toggleMark('bold');
        case "i": e.preventDefault(); return editor.toggleMark('italic');
        case "u": e.preventDefault(); return editor.toggleMark('underline');
        default: return false;
      }
    } else {
      return false;
    }
  }

  renderNode = (props, editor, next) => {
    switch(props.node.type) {
      case 'character':
        return <CharacterNode {...props} />;
      case 'dialogue':
        return <DialogueNode {...props} />;
      case 'parenthetical':
        return <ParentheticalNode {...props} />;
        case 'sceneHeader':
        return <SceneHeaderNode {...props} />;
      case 'action':
        return <ActionNode {...props} />;
      default:
        return next();
    }
  }

  renderMark = (props, editor, next) => {
    switch(props.mark.type) {
      case 'bold':
        return <BoldMark {...props} />;
      case 'italic':
        return <ItalicMark {...props} />;
      case 'underline':
        return <UnderlineMark {...props} />;
      default:
        return next();
    }
  }

  static getDerivedStateFromProps = (props, state) => {
    // Override the state from the open dialogue. This is probably not ideal but it works for now.
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
        renderMark={this.renderMark}
      />
    )
  }
}