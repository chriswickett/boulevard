import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { createStore } from 'redux'

const { ipcRenderer } = window.require('electron');

const defaultState = {
  data: {
    document: {
      nodes: [
        {
          object: 'block',
          type: 'action',
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
  }
}

function files(state = defaultState, action) {
  switch (action.type) {
    case 'OPEN_FILE':
      let data = (action.data) ? JSON.parse(action.data): defaultState.data;
      return { data: data, opened: 'true' };
    default:
      console.log('default');
      return state
  }
}

const OPEN_FILE = 'OPEN_FILE'

function openFile(data) {
  return {
    type: OPEN_FILE,
    data
  }
}

const store = createStore(files);

ipcRenderer.on('fileOpened', (event, data) => {
  store.dispatch(openFile(data))
})

ipcRenderer.on('contentsPlease', (event, data) => {
  ipcRenderer.send('saveFileContents', localStorage.getItem('content'));
})


const render = () => ReactDOM.render(
  <App
    value={store.getState()}
  />,
  document.getElementById('root')
)

render()
store.subscribe(render);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();