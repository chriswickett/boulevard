import React, { Component} from 'react';
import { Editor } from 'slate-react';
import CharacterNode from './nodes/CharacterNode';
import DialogueNode from './nodes/DialogueNode';
import ActionNode from './nodes/ActionNode';
import ParentheticalNode from './nodes/ParentheticalNode';
import SceneHeaderNode from './nodes/SceneHeaderNode';
import TransitionNode from './nodes/TransitionNode';

import BoldMark from './marks/BoldMark';
import ItalicMark from './marks/ItalicMark';
import UnderlineMark from './marks/UnderlineMark';
import CenterMark from './marks/CenterMark';

import { Value } from 'slate';

const { ipcRenderer } = window.require('electron');

export default class TextEditor extends Component {

  state = {
    value: Value.fromJSON(this.props.value.data),
    autoFormatted: false
  }

  keyHandlers = {
    "Tab": editor => {
      switch(editor.value.startBlock.type) {
        case "dialogue":
          if (editor.value.startBlock.text.length > 0) return true;
          this.state.autoFormatted = "inProgress";
          return editor.setBlocks('parenthetical').insertText("()").moveAnchorBackward(1).moveFocusBackward(1);
        case "action":
          if (editor.value.previousBlock && (editor.value.previousBlock.type === "dialogue" || editor.value.previousBlock.type === "character")) {
            this.state.autoFormatted = "inProgress";
            return editor.setBlocks('parenthetical').insertText("()").moveAnchorBackward(1).moveFocusBackward(1);
          } else {
            return editor.setBlocks('character');
          }
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
        case "transition": return editor.splitBlock().setBlocks('action');
        default: return editor.splitBlock();
      }
    },
    "Backspace": editor => {
      if (editor.value.startText.text.length === 0 && !editor.value.previousBlock) {
        if (editor.value.startBlock.type !== "action") {
          editor.setBlocks('action');
        } else {
          return false;
        }
      }
      if (this.state.autoFormatted === "active") {
        if (editor.value.startBlock.text === "()") editor.moveToEndOfBlock().moveFocusBackward(2).delete();
        editor.setBlocks('action');
      } else {
        editor.moveFocusBackward(1).delete();
      }
    },
    ".": editor => {
      if (!!editor.value.startBlock.text.match(/^INT|^EXT/)) {
        editor.setBlocks('sceneHeader').insertText(".")
        this.state.autoFormatted = "inProgress";
      } else {
        editor.insertText(".")
      }
    },
    ":": editor => {
      if (!!editor.value.startBlock.text.match(/^CUT TO|^FADE TO|^SMASH CUT TO/g)) {
        editor.setBlocks('transition').insertText(":")
        this.state.autoFormatted = "inProgress";
      } else {
        editor.insertText(":")
      }
    },
  }

  onChange = ({ value }) => {
    if (value.document !== this.state.value.document) {
      localStorage.setItem('content', JSON.stringify(value.toJSON()));
      ipcRenderer.send('contentChanged');
    }
    const autoFormatted = (this.state.autoFormatted === "inProgress") ? "active" : false;
    this.setState({value, autoFormatted})
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
        case "e": e.preventDefault(); return editor.toggleMark('center');
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
      case 'transition':
        return <TransitionNode {...props} />;
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
      case 'center':
        return <CenterMark {...props} />;
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
        autoCorrect={!!"true"}
        spellCheck={!!"true"}
      />
    )
  }
}