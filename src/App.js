import React, { Component } from 'react';
import { TextEditor } from './components';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <TextEditor value={this.props.value}/>
      </div>
    );
  }
}

export default App;
